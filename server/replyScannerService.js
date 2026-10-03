const { ImapFlow } = require('imapflow');
const db = require('./db');
const authService = require('./authService');

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
 * Detects if an incoming message is an automated auto-reply, out-of-office, or bounce
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

  // 4. Subject heuristics
  const subject = (envelope.subject || '').trim();
  const autoReplySubjectRegex = /^(auto-reply|automatic reply|out of office|ooo:|vacation|away from office|returned mail|undeliverable|delivery status notification)/i;
  if (autoReplySubjectRegex.test(subject)) {
    return true;
  }

  return false;
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

    // Acquire read-only lock on INBOX
    lock = await client.getMailboxLock('INBOX', { readOnly: true });

    const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const messages = client.fetch(
      { since: sinceDate },
      {
        envelope: true,
        internalDate: true,
        headers: ['auto-submitted', 'x-autoreply', 'precedence']
      }
    );

    let scannedCount = 0;
    let matchedReplies = 0;
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

        db.prepare(`
          INSERT INTO reply_logs (
            campaign_id, database_record_id, contact_id, sender_email, 
            subject, snippet, in_reply_to, message_id, is_auto_reply, 
            received_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(
          effectiveCampaignId,
          matchedRecord ? matchedRecord.id : null,
          matchedContact ? matchedContact.id : null,
          fromAddress,
          subject,
          '',
          inReplyTo,
          messageId,
          receivedAt,
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

      disarmTx();
      matchedReplies++;
    }

    lastScanResult = {
      success: true,
      scanned: scannedCount,
      matchedReplies,
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
      SET status = 'REPLIED', replied_at = ?, next_step_scheduled_at = NULL 
      WHERE id = ?
    `).run(nowIso, recordId);

    db.prepare(`
      INSERT INTO reply_logs (
        campaign_id, database_record_id, contact_id, sender_email, 
        subject, snippet, in_reply_to, message_id, is_auto_reply, 
        received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?)
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
  scanInboxForReplies,
  markLeadRepliedManually,
  cancelFollowupsManually,
  getCampaignReplies,
  getScanStatus
};
