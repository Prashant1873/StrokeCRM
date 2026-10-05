const { ImapFlow } = require('imapflow');
const db = require('./db');
const authService = require('./authService');
const sentimentService = require('./sentimentService');
const gmailLabelService = require('./gmailLabelService');

/**
 * Reads a stream into a UTF-8 string up to maxBytes
 */
async function streamToString(stream, maxBytes = 16384) {
  if (!stream) return '';
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of stream) {
    chunks.push(chunk);
    totalBytes += chunk.length;
    if (totalBytes >= maxBytes) break;
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * In-memory scan state tracking to prevent concurrent overlapping scans
 */
let isScanning = false;
let lastScanResult = null;

/**
 * Resolves IMAP connection configuration based on active provider or campaign settings
 */
function resolveImapConfig(campaignId = null) {
  const settings = db.getSettings ? db.getSettings() : {};
  let campaign = null;
  if (campaignId) {
    campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  }

  const activeProvider = (campaign && campaign.sender_provider && campaign.sender_provider !== 'default')
    ? campaign.sender_provider
    : (settings.active_provider || 'gmail_app_password');

  if (activeProvider === 'custom_domain') {
    if (!settings.custom_imap_host || !settings.custom_imap_user || !settings.custom_imap_pass) {
      throw new Error('Custom Domain IMAP is not configured. Please specify IMAP host, username, and password in Settings.');
    }
    const port = Number(settings.custom_imap_port) || 993;
    const secure = settings.custom_imap_secure === '1' ||
                   settings.custom_imap_secure === 'true' ||
                   settings.custom_imap_secure === true ||
                   port === 993;

    return {
      host: String(settings.custom_imap_host).trim(),
      port,
      secure,
      auth: {
        user: String(settings.custom_imap_user).trim(),
        pass: String(settings.custom_imap_pass)
      },
      provider: 'custom_domain'
    };
  }

  // Fallback to Gmail App Password IMAP
  let account = null;
  if (campaign && campaign.sender_account_id) {
    account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(campaign.sender_account_id);
  }
  if (!account) {
    account = authService.getActiveAccount();
  }

  if (!account || !account.email || !account.app_password) {
    throw new Error('No active verified Gmail sender account with App Password found for IMAP scanning.');
  }

  return {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: account.email,
      pass: account.app_password
    },
    provider: 'gmail_app_password'
  };
}

/**
 * Detects if an incoming message is an automated auto-reply or out-of-office (OOO)
 */
function isAutoReply(envelope, headersMap = {}) {
  // 1. Auto-Submitted header (RFC 3834)
  const autoSubmitted = (headersMap['auto-submitted'] || '').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') {
    return true;
  }

  // 2. X-Autoreply header
  const xAutoreply = (headersMap['x-autoreply'] || '').toLowerCase();
  if (xAutoreply === 'yes') {
    return true;
  }

  // 3. Precedence header (RFC 2076 / Sendmail)
  const precedence = (headersMap['precedence'] || '').toLowerCase();
  if (['bulk', 'auto_reply', 'junk', 'list'].includes(precedence)) {
    return true;
  }

  // 4. Subject heuristics (auto-reply / OOO only; bounces handled separately by isBounceReport)
  const subject = (envelope.subject || '').trim();
  const autoReplySubjectRegex = /^(auto-reply|automatic reply|out of office|ooo:|vacation|away from office)/i;
  if (autoReplySubjectRegex.test(subject)) {
    return true;
  }

  return false;
}

/**
 * Detects if an incoming message is a Mailer-Daemon bounce or Non-Delivery Report (NDR)
 */
function isBounceReport(envelope, headersMap = {}) {
  const fromAddr = (envelope.from?.[0]?.address || '').toLowerCase().trim();
  const subject = (envelope.subject || '').trim().toLowerCase();
  const contentType = (headersMap['content-type'] || '').toLowerCase();

  // 1. From address check
  if (/^(mailer-daemon|postmaster|daemon|mail-daemon|nobody|bounce)@/i.test(fromAddr)) {
    return true;
  }

  // 2. Subject check
  if (/delivery status notification|undeliver(able|ed)|returned mail|mail delivery failed|failure notice|delivery failure/i.test(subject)) {
    return true;
  }

  // 3. Content-Type check (RFC 3464 DSN report)
  if (contentType.includes('report-type=delivery-status') || contentType.includes('multipart/report')) {
    return true;
  }

  return false;
}

/**
 * Parses Mailer-Daemon / NDR bounce message to extract recipient, diagnostic reason, and code
 */
function parseBounceNotification(envelope, headersMap = {}, bodyText = '') {
  const subject = (envelope.subject || '').trim();

  let recipientEmail = null;

  // 1. Final-Recipient header or in body (RFC 3464)
  const finalRecipientMatch = bodyText.match(/final-recipient\s*:\s*rfc822\s*;\s*([^\s<>@]+@[^\s<>@]+)/i);
  if (finalRecipientMatch) {
    recipientEmail = finalRecipientMatch[1].trim().toLowerCase();
  }

  // 2. Google Mailer-Daemon standard text patterns:
  if (!recipientEmail) {
    const googlePatterns = [
      /failed permanently:\s*([^\s<>@]+@[^\s<>@]+)/i,
      /wasn't delivered to\s*([^\s<>@]+@[^\s<>@]+)/i,
      /message to\s*([^\s<>@]+@[^\s<>@]+)\s*(?:couldn't|wasn't|failed)/i,
      /recipient address:\s*([^\s<>@]+@[^\s<>@]+)/i,
      /<([^\s<>@]+@[^\s<>@]+)>.*?(?:recipient address rejected|user unknown|does not exist|mailbox unavailable)/i
    ];

    for (const pat of googlePatterns) {
      const match = bodyText.match(pat);
      if (match) {
        recipientEmail = match[1].trim().toLowerCase();
        break;
      }
    }
  }

  // Extract bounce code and diagnostic reason
  let bounceCode = '';
  let bounceReason = '';
  let bounceType = 'HARD';

  // Diagnostic-Code or Status line
  const diagMatch = bodyText.match(/(?:diagnostic-code\s*:\s*(?:smtp\s*;\s*)?|remote server was:\s*)([^\r\n]+)/i);
  if (diagMatch) {
    bounceReason = diagMatch[1].trim();
  } else {
    const phrases = [
      /550 [^\r\n]+/i,
      /554 [^\r\n]+/i,
      /552 [^\r\n]+/i,
      /address couldn't be found[^\r\n]*/i,
      /address not found[^\r\n]*/i,
      /mailbox unavailable[^\r\n]*/i,
      /user unknown[^\r\n]*/i,
      /recipient rejected[^\r\n]*/i
    ];
    for (const p of phrases) {
      const m = bodyText.match(p);
      if (m) {
        bounceReason = m[0].trim();
        break;
      }
    }
  }

  // Extract status code
  const codeMatch = (bounceReason || bodyText).match(/\b([45]\.\d+\.\d+|\b[45]\d{2}\b)/);
  if (codeMatch) {
    bounceCode = codeMatch[1];
  } else {
    const genericCode = bodyText.match(/status\s*:\s*([45]\.\d+\.\d+)/i);
    if (genericCode) {
      bounceCode = genericCode[1];
    }
  }

  // Classify HARD vs SOFT bounce
  if ((bounceCode && bounceCode.startsWith('4')) || /mailbox full|quota exceeded|temporary failure|try again later/i.test(bounceReason)) {
    bounceType = 'SOFT';
  } else {
    bounceType = 'HARD';
  }

  if (!bounceReason) {
    bounceReason = subject.toLowerCase().includes('failure') ? 'Delivery Status Notification (Failure)' : 'Delivery failed';
  }

  return {
    recipientEmail,
    bounceCode: bounceCode || (bounceType === 'HARD' ? '550' : '450'),
    bounceReason: bounceReason.slice(0, 500),
    bounceType
  };
}

/**
 * Scans the configured IMAP inbox for replies matching campaign leads
 *
 * @param {Object} options
 * @param {number|null} options.campaignId - Optional campaign ID to filter matching leads
 * @param {number} options.lookbackDays - Days to look back in IMAP inbox (default 14)
 * @returns {Promise<Object>} Scan results summary
 */
async function scanInboxForReplies({ campaignId = null, lookbackDays = 14 } = {}) {
  if (isScanning) {
    return {
      success: false,
      message: 'Inbox scan is already in progress.',
      scanned: 0,
      matchedReplies: 0,
      autoRepliesIgnored: 0,
      alreadyRunning: true
    };
  }

  isScanning = true;
  let client = null;
  let lock = null;

  try {
    const imapConfig = resolveImapConfig(campaignId);

    client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: imapConfig.secure,
      auth: imapConfig.auth,
      logger: false,
      emitLogs: false
    });

    await client.connect();

    // Acquire lock on INBOX (read-write to enable native Gmail thread labeling)
    lock = await client.getMailboxLock('INBOX');

    const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const messages = client.fetch(
      { since: sinceDate },
      {
        envelope: true,
        internalDate: true,
        headers: ['auto-submitted', 'x-autoreply', 'precedence', 'content-type', 'diagnostic-code', 'action', 'final-recipient']
      }
    );

    let scannedCount = 0;
    let matchedReplies = 0;
    let matchedBounces = 0;
    let autoRepliesIgnored = 0;
    const nowIso = new Date().toISOString();

    for await (const message of messages) {
      scannedCount++;

      const envelope = message.envelope || {};
      const fromAddress = envelope.from?.[0]?.address ? envelope.from[0].address.toLowerCase().trim() : '';
      if (!fromAddress) continue;

      const subject = envelope.subject || '';
      const messageId = envelope.messageId ? envelope.messageId.trim() : '';
      const inReplyTo = envelope.inReplyTo ? envelope.inReplyTo.trim() : '';
      const receivedAt = message.internalDate ? new Date(message.internalDate).toISOString() : nowIso;

      // Parse headers into key-value map
      const headersMap = {};
      if (message.headers) {
        try {
          const rawHeaders = message.headers.toString();
          rawHeaders.split(/\r?\n/).forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) {
              const k = line.slice(0, idx).toLowerCase().trim();
              const v = line.slice(idx + 1).trim();
              headersMap[k] = v;
            }
          });
        } catch {
          // ignore parsing error
        }
      }

      // Check if this incoming message is a Mailer-Daemon Bounce / NDR
      if (isBounceReport(envelope, headersMap)) {
        let bounceBody = '';
        try {
          const download = await client.download(String(message.seq), '1', { maxBytes: 16384 });
          if (download && download.content) {
            bounceBody = await streamToString(download.content, 16384);
          }
        } catch {
          try {
            const download = await client.download(String(message.seq), null, { maxBytes: 16384 });
            if (download && download.content) {
              bounceBody = await streamToString(download.content, 16384);
            }
          } catch {
            // ignore download error
          }
        }

        const parsedBounce = parseBounceNotification(envelope, headersMap, bounceBody);
        if (parsedBounce) {
          let bounceRecord = null;
          let bounceContact = null;
          let bounceCampaignId = campaignId;

          if (parsedBounce.recipientEmail) {
            if (campaignId) {
              bounceRecord = db.prepare(`
                SELECT dr.*, c.name as campaign_name 
                FROM database_records dr
                JOIN campaigns c ON dr.campaign_id = c.id
                WHERE dr.campaign_id = ? AND lower(dr.email) = ?
                LIMIT 1
              `).get(campaignId, parsedBounce.recipientEmail);

              if (!bounceRecord) {
                bounceContact = db.prepare(`
                  SELECT co.*, c.name as campaign_name 
                  FROM contacts co
                  JOIN campaigns c ON co.campaign_id = c.id
                  WHERE co.campaign_id = ? AND lower(co.email) = ?
                  LIMIT 1
                `).get(campaignId, parsedBounce.recipientEmail);
              }
            } else {
              bounceRecord = db.prepare(`
                SELECT dr.*, c.id as cid, c.name as campaign_name 
                FROM database_records dr
                JOIN campaigns c ON dr.campaign_id = c.id
                WHERE lower(dr.email) = ? AND dr.status IN ('SENT', 'PENDING')
                ORDER BY dr.sent_at DESC
                LIMIT 1
              `).get(parsedBounce.recipientEmail);

              if (bounceRecord) {
                bounceCampaignId = bounceRecord.campaign_id || bounceRecord.cid;
              } else {
                bounceContact = db.prepare(`
                  SELECT co.*, c.id as cid, c.name as campaign_name 
                  FROM contacts co
                  JOIN campaigns c ON co.campaign_id = c.id
                  WHERE lower(co.email) = ? AND co.status IN ('SENT', 'PENDING')
                  ORDER BY co.sent_at DESC
                  LIMIT 1
                `).get(parsedBounce.recipientEmail);
                if (bounceContact) {
                  bounceCampaignId = bounceContact.campaign_id || bounceContact.cid;
                }
              }
            }
          }

          // Fallback: search candidate emails found anywhere in bounce transcript
          if (!bounceRecord && !bounceContact && bounceBody) {
            const candidates = bounceBody.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
            for (const cand of candidates) {
              const cLower = cand.toLowerCase();
              if (/mailer-daemon|postmaster|googlemail|google\.com|gmail\.com/i.test(cLower)) continue;
              if (campaignId) {
                bounceRecord = db.prepare('SELECT * FROM database_records WHERE campaign_id = ? AND lower(email) = ? LIMIT 1').get(campaignId, cLower);
                if (bounceRecord) {
                  parsedBounce.recipientEmail = cLower;
                  break;
                }
                bounceContact = db.prepare('SELECT * FROM contacts WHERE campaign_id = ? AND lower(email) = ? LIMIT 1').get(campaignId, cLower);
                if (bounceContact) {
                  parsedBounce.recipientEmail = cLower;
                  break;
                }
              } else {
                bounceRecord = db.prepare("SELECT * FROM database_records WHERE lower(email) = ? AND status IN ('SENT', 'PENDING') ORDER BY sent_at DESC LIMIT 1").get(cLower);
                if (bounceRecord) {
                  parsedBounce.recipientEmail = cLower;
                  bounceCampaignId = bounceRecord.campaign_id;
                  break;
                }
                bounceContact = db.prepare("SELECT * FROM contacts WHERE lower(email) = ? AND status IN ('SENT', 'PENDING') ORDER BY sent_at DESC LIMIT 1").get(cLower);
                if (bounceContact) {
                  parsedBounce.recipientEmail = cLower;
                  bounceCampaignId = bounceContact.campaign_id;
                  break;
                }
              }
            }
          }

          if (bounceRecord || bounceContact) {
            const targetEmail = parsedBounce.recipientEmail || (bounceRecord ? bounceRecord.email : bounceContact.email);
            const existingBounce = db.prepare(`
              SELECT id FROM bounce_logs 
              WHERE recipient_email = ? AND (campaign_id = ? OR campaign_id IS NULL)
              LIMIT 1
            `).get(targetEmail, bounceCampaignId);

            if (!existingBounce) {
              const recordId = bounceRecord ? bounceRecord.id : null;
              const contactId = bounceContact ? bounceContact.id : null;

              const recordBounceTx = db.transaction(() => {
                if (bounceRecord) {
                  db.prepare(`
                    UPDATE database_records 
                    SET status = 'BOUNCED',
                        bounce_reason = ?,
                        bounce_code = ?,
                        bounce_type = ?,
                        bounced_at = ?,
                        next_step_scheduled_at = NULL,
                        error_message = ?
                    WHERE id = ?
                  `).run(parsedBounce.bounceReason, parsedBounce.bounceCode, parsedBounce.bounceType, receivedAt, parsedBounce.bounceReason, recordId);
                } else if (bounceContact) {
                  db.prepare(`
                    UPDATE contacts 
                    SET status = 'BOUNCED',
                        bounce_reason = ?,
                        bounce_code = ?,
                        bounce_type = ?,
                        bounced_at = ?,
                        next_step_scheduled_at = NULL,
                        error_message = ?
                    WHERE id = ?
                  `).run(parsedBounce.bounceReason, parsedBounce.bounceCode, parsedBounce.bounceType, receivedAt, parsedBounce.bounceReason, contactId);
                }

                db.prepare(`
                  INSERT INTO bounce_logs (
                    campaign_id, database_record_id, contact_id, recipient_email,
                    bounce_type, bounce_code, diagnostic_code, raw_reason, source, uid, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'mailer_daemon', ?, ?)
                `).run(
                  bounceCampaignId,
                  recordId,
                  contactId,
                  targetEmail,
                  parsedBounce.bounceType,
                  parsedBounce.bounceCode,
                  parsedBounce.bounceReason,
                  parsedBounce.bounceReason,
                  message.uid || null,
                  nowIso
                );

                if (bounceCampaignId) {
                  db.prepare(`
                    UPDATE campaigns 
                    SET bounced_count = (
                      SELECT COUNT(DISTINCT coalesce(database_record_id, contact_id)) 
                      FROM bounce_logs 
                      WHERE campaign_id = ?
                    ),
                    failed_count = failed_count + 1
                    WHERE id = ?
                  `).run(bounceCampaignId, bounceCampaignId);
                }
              });

              recordBounceTx();
              matchedBounces++;

              // Auto-label bounce in Gmail (GMAIL-02)
              let bounceCampaignName = '';
              if (bounceCampaignId) {
                const cRow = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(bounceCampaignId);
                bounceCampaignName = cRow?.name || '';
              }

              try {
                await gmailLabelService.syncLabelsForEvent(client, message.uid, {
                  campaignName: bounceCampaignName,
                  isBounce: true
                });
              } catch (lblErr) {
                console.warn('[Gmail Labels] Bounce tag notice:', lblErr.message);
              }
            }
            continue; // Skip regular reply processing for this bounce notification
          }
        }
      }

      // Check whether this message matches any active campaign leads
      let matchedRecord = null;
      let matchedContact = null;
      let effectiveCampaignId = campaignId;

      if (campaignId) {
        // Query database_records for this specific campaign
        matchedRecord = db.prepare(`
          SELECT dr.*, c.name as campaign_name 
          FROM database_records dr
          JOIN campaigns c ON dr.campaign_id = c.id
          WHERE dr.campaign_id = ? AND lower(dr.email) = ?
          LIMIT 1
        `).get(campaignId, fromAddress);

        // Fallback to legacy contacts table
        if (!matchedRecord) {
          matchedContact = db.prepare(`
            SELECT co.*, c.name as campaign_name 
            FROM contacts co
            JOIN campaigns c ON co.campaign_id = c.id
            WHERE co.campaign_id = ? AND lower(co.email) = ?
            LIMIT 1
          `).get(campaignId, fromAddress);
        }
      } else {
        // Query across all campaigns for this email
        matchedRecord = db.prepare(`
          SELECT dr.*, c.id as cid, c.name as campaign_name 
          FROM database_records dr
          JOIN campaigns c ON dr.campaign_id = c.id
          WHERE lower(dr.email) = ? AND dr.status IN ('SENT', 'PENDING')
          ORDER BY dr.sent_at DESC
          LIMIT 1
        `).get(fromAddress);

        if (matchedRecord) {
          effectiveCampaignId = matchedRecord.campaign_id || matchedRecord.cid;
        } else {
          matchedContact = db.prepare(`
            SELECT co.*, c.id as cid, c.name as campaign_name 
            FROM contacts co
            JOIN campaigns c ON co.campaign_id = c.id
            WHERE lower(co.email) = ? AND co.status IN ('SENT', 'PENDING')
            ORDER BY co.sent_at DESC
            LIMIT 1
          `).get(fromAddress);
          if (matchedContact) {
            effectiveCampaignId = matchedContact.campaign_id || matchedContact.cid;
          }
        }
      }

      if (!matchedRecord && !matchedContact) {
        continue; // Not a lead from our campaigns
      }

      // Check if this reply was already logged
      const existingReply = db.prepare(`
        SELECT id FROM reply_logs 
        WHERE (message_id IS NOT NULL AND message_id != '' AND message_id = ?)
           OR (sender_email = ? AND received_at = ?)
        LIMIT 1
      `).get(messageId, fromAddress, receivedAt);

      if (existingReply) {
        continue; // Already processed
      }

      const autoReply = isAutoReply(envelope, headersMap);

      if (autoReply) {
        // Log auto-reply without sequence disarm
        db.prepare(`
          INSERT INTO reply_logs (
            campaign_id, database_record_id, contact_id, sender_email, 
            subject, snippet, in_reply_to, message_id, is_auto_reply, 
            received_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).run(
          effectiveCampaignId,
          matchedRecord ? matchedRecord.id : null,
          matchedContact ? matchedContact.id : null,
          fromAddress,
          subject,
          'Auto-reply / Out-of-office detected',
          inReplyTo,
          messageId,
          receivedAt,
          nowIso
        );
        autoRepliesIgnored++;
        continue;
      }

      // Extract reply body text for sentiment analysis
      let bodyText = '';
      try {
        const download = await client.download(String(message.seq), '1', { maxBytes: 16384 });
        if (download && download.content) {
          bodyText = await streamToString(download.content, 16384);
        }
      } catch (dlErr) {
        try {
          const download = await client.download(String(message.seq), null, { maxBytes: 16384 });
          if (download && download.content) {
            bodyText = await streamToString(download.content, 16384);
          }
        } catch {
          // ignore download error; fallback to subject-based classification
        }
      }

      let insertedReplyId = null;

      // Valid human lead response -> Atomically disarm sequence!
      const disarmTx = db.transaction(() => {
        if (matchedRecord) {
          db.prepare(`
            UPDATE database_records 
            SET status = 'REPLIED', replied_at = ?, next_step_scheduled_at = NULL 
            WHERE id = ?
          `).run(receivedAt, matchedRecord.id);
        } else if (matchedContact) {
          db.prepare(`
            UPDATE contacts 
            SET status = 'REPLIED', replied_at = ?, next_step_scheduled_at = NULL 
            WHERE id = ?
          `).run(receivedAt, matchedContact.id);
        }

        const insertInfo = db.prepare(`
          INSERT INTO reply_logs (
            campaign_id, database_record_id, contact_id, sender_email, 
            subject, snippet, in_reply_to, message_id, is_auto_reply, uid,
            received_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `).run(
          effectiveCampaignId,
          matchedRecord ? matchedRecord.id : null,
          matchedContact ? matchedContact.id : null,
          fromAddress,
          subject,
          '',
          inReplyTo,
          messageId,
          message.uid || null,
          receivedAt,
          nowIso
        );

        insertedReplyId = insertInfo.lastInsertRowid;

        if (effectiveCampaignId) {
          db.prepare(`
            UPDATE campaigns 
            SET reply_count = (
              SELECT COUNT(DISTINCT coalesce(database_record_id, contact_id)) 
              FROM reply_logs 
              WHERE campaign_id = ? AND is_auto_reply = 0
            )
            WHERE id = ?
          `).run(effectiveCampaignId, effectiveCampaignId);
        }
      });

      disarmTx();
      matchedReplies++;

      // Trigger sentiment classification & update lead intelligence
      const leadRecordId = matchedRecord ? matchedRecord.id : null;
      const leadContactId = matchedContact ? matchedContact.id : null;
      const leadCampName = (matchedRecord && matchedRecord.campaign_name) || (matchedContact && matchedContact.campaign_name) || '';
      let classifiedSentiment = null;

      try {
        const res = await sentimentService.classifyReply(bodyText, subject);
        classifiedSentiment = res.sentiment;

        const updateSentimentTx = db.transaction(() => {
          if (leadRecordId) {
            db.prepare(`
              UPDATE database_records 
              SET sentiment = ?, sentiment_confidence = ?, sentiment_summary = ?, sentiment_provider = ?
              WHERE id = ? AND (sentiment_provider != 'manual' OR sentiment IS NULL)
            `).run(res.sentiment, res.confidence, res.summary, res.provider, leadRecordId);
          } else if (leadContactId) {
            db.prepare(`
              UPDATE contacts 
              SET sentiment = ?, sentiment_confidence = ?, sentiment_summary = ?, sentiment_provider = ?
              WHERE id = ? AND (sentiment_provider != 'manual' OR sentiment IS NULL)
            `).run(res.sentiment, res.confidence, res.summary, res.provider, leadContactId);
          }

          if (insertedReplyId) {
            db.prepare(`
              UPDATE reply_logs 
              SET snippet = ?, sentiment = ?, sentiment_confidence = ?, sentiment_summary = ?, sentiment_provider = ?
              WHERE id = ? AND (sentiment_provider != 'manual' OR sentiment IS NULL)
            `).run(res.sanitizedSnippet || '', res.sentiment, res.confidence, res.summary, res.provider, insertedReplyId);
          }
        });
        updateSentimentTx();
      } catch (err) {
        console.warn('[Sentiment] Classification notice:', err.message);
      }

      // Auto-label reply thread in Gmail (GMAIL-01, GMAIL-02)
      try {
        await gmailLabelService.syncLabelsForEvent(client, message.uid, {
          campaignName: leadCampName,
          sentiment: classifiedSentiment,
          isBounce: false
        });
      } catch (lblErr) {
        console.warn('[Gmail Labels] Reply label sync notice:', lblErr.message);
      }
    }

    lastScanResult = {
      success: true,
      scanned: scannedCount,
      matchedReplies,
      matchedBounces,
      autoRepliesIgnored,
      lastScannedAt: new Date().toISOString()
    };

    return lastScanResult;

  } finally {
    if (lock) {
      try {
        await lock.release();
      } catch (err) {
        console.warn('Error releasing IMAP mailbox lock:', err.message);
      }
    }
    if (client) {
      try {
        await client.logout();
      } catch (err) {
        // ignore logout errors
      }
    }
    isScanning = false;
  }
}

/**
 * Manually marks a lead as REPLIED and halts pending drip sequences
 */
function markLeadRepliedManually(recordId, campaignId, isContactTable = false) {
  const nowIso = new Date().toISOString();
  const table = isContactTable ? 'contacts' : 'database_records';

  const record = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId);
  if (!record) {
    throw new Error(`Record with ID ${recordId} not found in ${table}.`);
  }

  const effectiveCampaignId = campaignId || record.campaign_id;

  const markTx = db.transaction(() => {
    db.prepare(`
      UPDATE ${table} 
      SET status = 'REPLIED', replied_at = ?, next_step_scheduled_at = NULL,
          sentiment = coalesce(sentiment, 'QUESTION'),
          sentiment_confidence = coalesce(sentiment_confidence, 1.0),
          sentiment_summary = coalesce(sentiment_summary, 'Manually marked as replied by operator in CRM cockpit.'),
          sentiment_provider = coalesce(sentiment_provider, 'manual')
      WHERE id = ?
    `).run(nowIso, recordId);

    db.prepare(`
      INSERT INTO reply_logs (
        campaign_id, database_record_id, contact_id, sender_email, 
        subject, snippet, in_reply_to, message_id, is_auto_reply, 
        sentiment, sentiment_confidence, sentiment_summary, sentiment_provider,
        received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, 'QUESTION', 1.0, 'Manually marked as replied by operator in CRM cockpit.', 'manual', ?, ?)
    `).run(
      effectiveCampaignId,
      isContactTable ? null : recordId,
      isContactTable ? recordId : null,
      record.email,
      '[Manual Action: Marked as Replied]',
      'Manually marked as replied by operator in CRM cockpit.',
      nowIso,
      nowIso
    );

    if (effectiveCampaignId) {
      db.prepare(`
        UPDATE campaigns 
        SET reply_count = (
          SELECT COUNT(DISTINCT coalesce(database_record_id, contact_id)) 
          FROM reply_logs 
          WHERE campaign_id = ? AND is_auto_reply = 0
        )
        WHERE id = ?
      `).run(effectiveCampaignId, effectiveCampaignId);
    }
  });

  markTx();
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId);
}

/**
 * Manually marks a lead as BOUNCED (inaccurate email) and halts pending drip sequences
 */
function markLeadBouncedManually(recordId, campaignId, reason = 'Manually flagged as inaccurate email address', isContactTable = false) {
  const nowIso = new Date().toISOString();
  const table = isContactTable ? 'contacts' : 'database_records';

  const record = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId);
  if (!record) {
    throw new Error(`Record with ID ${recordId} not found in ${table}.`);
  }

  const effectiveCampaignId = campaignId || record.campaign_id;

  const bounceTx = db.transaction(() => {
    db.prepare(`
      UPDATE ${table} 
      SET status = 'BOUNCED',
          bounce_reason = ?,
          bounce_code = '550',
          bounce_type = 'HARD',
          bounced_at = ?,
          next_step_scheduled_at = NULL,
          error_message = ?
      WHERE id = ?
    `).run(reason, nowIso, reason, recordId);

    db.prepare(`
      INSERT INTO bounce_logs (
        campaign_id, database_record_id, contact_id, recipient_email,
        bounce_type, bounce_code, diagnostic_code, raw_reason, source, created_at
      ) VALUES (?, ?, ?, ?, 'HARD', '550', ?, ?, 'manual', ?)
    `).run(
      effectiveCampaignId,
      isContactTable ? null : recordId,
      isContactTable ? recordId : null,
      record.email,
      reason,
      reason,
      nowIso
    );

    if (effectiveCampaignId) {
      db.prepare(`
        UPDATE campaigns 
        SET bounced_count = (
          SELECT COUNT(DISTINCT coalesce(database_record_id, contact_id)) 
          FROM bounce_logs 
          WHERE campaign_id = ?
        ),
        failed_count = failed_count + 1
        WHERE id = ?
      `).run(effectiveCampaignId, effectiveCampaignId);
    }
  });

  bounceTx();
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId);
}

/**
 * Manually cancels pending follow-ups for a specific lead without marking as replied
 */
function cancelFollowupsManually(recordId, campaignId, isContactTable = false) {
  const table = isContactTable ? 'contacts' : 'database_records';
  const record = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId);
  if (!record) {
    throw new Error(`Record with ID ${recordId} not found in ${table}.`);
  }

  db.prepare(`
    UPDATE ${table} 
    SET status = 'CANCELLED', next_step_scheduled_at = NULL 
    WHERE id = ?
  `).run(recordId);

  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId);
}

/**
 * Fetches recorded replies for a campaign
 */
function getCampaignReplies(campaignId) {
  return db.prepare(`
    SELECT rl.*, 
           coalesce(dr.first_name, co.first_name, '') as first_name,
           coalesce(dr.company, co.company, '') as company
    FROM reply_logs rl
    LEFT JOIN database_records dr ON rl.database_record_id = dr.id
    LEFT JOIN contacts co ON rl.contact_id = co.id
    WHERE rl.campaign_id = ?
    ORDER BY rl.received_at DESC
  `).all(campaignId);
}

/**
 * Fetches recorded delivery failures / bounces for a campaign
 */
function getCampaignBounces(campaignId) {
  return db.prepare(`
    SELECT bl.*, 
           coalesce(dr.first_name, co.first_name, '') as first_name,
           coalesce(dr.company, co.company, '') as company
    FROM bounce_logs bl
    LEFT JOIN database_records dr ON bl.database_record_id = dr.id
    LEFT JOIN contacts co ON bl.contact_id = co.id
    WHERE bl.campaign_id = ?
    ORDER BY bl.created_at DESC
  `).all(campaignId);
}

/**
 * Returns latest scanning status
 */
function getScanStatus() {
  return {
    isScanning,
    lastScanResult
  };
}

module.exports = {
  resolveImapConfig,
  isAutoReply,
  isBounceReport,
  parseBounceNotification,
  scanInboxForReplies,
  markLeadRepliedManually,
  markLeadBouncedManually,
  cancelFollowupsManually,
  getCampaignReplies,
  getCampaignBounces,
  getScanStatus
};
