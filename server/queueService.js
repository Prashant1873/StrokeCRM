const nodemailer = require('nodemailer');
const db = require('./db');
const authService = require('./authService');
const templateService = require('./templateService');
const databaseService = require('./databaseService');

// In-memory registry of active campaign queue workers
const activeJobs = new Map();

// Crash resilience: clean up any orphaned RUNNING campaigns and SENDING records on boot
try {
  db.prepare("UPDATE database_records SET status = 'PENDING' WHERE status = 'SENDING'").run();
  db.prepare("UPDATE contacts SET status = 'PENDING' WHERE status = 'SENDING'").run();
  db.prepare("UPDATE campaigns SET status = 'PAUSED' WHERE status = 'RUNNING'").run();
} catch (e) {
  console.warn('[StrokeCRM] Startup queue cleanup note:', e.message);
}

/**
 * Resolves the outbound Nodemailer transporter and sender address based on campaign override or active provider
 */
function resolveTransporter(campaignSenderOverride = null) {
  const settings = db.getSettings ? db.getSettings() : {};
  const activeProvider = (campaignSenderOverride && campaignSenderOverride !== 'default')
    ? campaignSenderOverride
    : (settings.active_provider || 'gmail_app_password');

  if (activeProvider === 'custom_domain') {
    if (!settings.custom_smtp_host || !settings.custom_smtp_user || !settings.custom_smtp_pass) {
      throw new Error('Custom Domain SMTP is not fully configured. Please update host, username, and password in Settings.');
    }
    const portNum = Number(settings.custom_smtp_port) || 587;
    const isSecure = settings.custom_smtp_secure === '1' || settings.custom_smtp_secure === 'true' || settings.custom_smtp_secure === true || portNum === 465;

    const transporter = nodemailer.createTransport({
      host: String(settings.custom_smtp_host).trim(),
      port: portNum,
      secure: isSecure,
      auth: {
        user: String(settings.custom_smtp_user).trim(),
        pass: String(settings.custom_smtp_pass)
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });

    const senderEmail = settings.custom_sender_email ? String(settings.custom_sender_email).trim() : String(settings.custom_smtp_user).trim();
    const senderName = settings.custom_sender_name ? String(settings.custom_sender_name).trim() : '';
    const fromAddress = senderName ? `"${senderName}" <${senderEmail}>` : senderEmail;

    return {
      transporter,
      fromAddress,
      provider: 'custom_domain'
    };
  }

  if (activeProvider === 'oauth2') {
    throw new Error('OAuth2 dispatch mode is not yet configured with refresh token.');
  }

  // Default: Gmail App Password
  const account = authService.getActiveAccount();
  if (!account || !account.verified) {
    throw new Error('Gmail sender account is not connected or unverified. Please check Settings & Gmail.');
  }
  const transporter = authService.createSmtpTransporter(account.email, account.app_password);
  return {
    transporter,
    fromAddress: account.email,
    provider: 'gmail_app_password',
    account
  };
}

/**
 * Returns a random integer between min and max inclusive
 */
function getRandomDelay(minSec, maxSec) {
  const min = Math.max(1, (minSec !== undefined && minSec !== null && !isNaN(minSec)) ? Number(minSec) : 15);
  const max = Math.max(min, (maxSec !== undefined && maxSec !== null && !isNaN(maxSec)) ? Number(maxSec) : 35);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Checks whether current local time falls within allowed sending hours
 */
function isWithinWorkingHours(startHourStr = '09:00', endHourStr = '18:00') {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = (startHourStr || '09:00').split(':').map(Number);
  const [endH, endM] = (endHourStr || '18:00').split(':').map(Number);

  const startMinutes = (startH || 9) * 60 + (startM || 0);
  const endMinutes = (endH || 18) * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Interruptible sleep helper checking if campaign paused, cancelled, or pacing updated
 */
async function interruptibleSleep(ms, jobId) {
  const step = 250;
  let elapsed = 0;
  while (elapsed < ms) {
    const job = activeJobs.get(jobId);
    if (!job || job.isPaused || job.isStopped) {
      return false; // interrupted
    }
    if (job.pacingReset) {
      job.pacingReset = false;
      const remainingMs = Math.max(0, (job.nextSendAt || 0) - Date.now());
      if (remainingMs < (ms - elapsed)) {
        if (remainingMs > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingMs));
        }
        return true;
      }
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(step, ms - elapsed)));
    elapsed += step;
  }
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns a comma, semicolon, or newline separated list into a unique address string.
 * Empty input is allowed. Throws if any token is not an email.
 */
function normalizeAddressList(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';

  const parts = text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const invalid = parts.filter(part => !EMAIL_RE.test(part));
  if (invalid.length) {
    const error = new Error(`Invalid email address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`);
    error.code = 'INVALID_ADDRESS';
    throw error;
  }

  const seen = new Set();
  const unique = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }
  return unique.join(', ');
}

/**
 * CC/BCC for one send. Drops the recipient and any address already used on this message.
 */
function ccBccForRecipient(campaign, recipientEmail) {
  const skip = new Set();
  const recipient = String(recipientEmail || '').trim().toLowerCase();
  if (recipient) skip.add(recipient);

  const pick = (raw) => {
    const kept = [];
    for (const addr of String(raw || '').split(',').map(s => s.trim()).filter(Boolean)) {
      const key = addr.toLowerCase();
      if (skip.has(key)) continue;
      skip.add(key);
      kept.push(addr);
    }
    return kept.join(', ');
  };

  return {
    cc: pick(campaign && campaign.cc_addresses),
    bcc: pick(campaign && campaign.bcc_addresses)
  };
}

/**
 * Sends a single email to a contact
 */
async function dispatchSingleEmail(transportOrAccount, contact, campaign, senderOverride = null, stepConfig = null, initialMessageId = null) {
  let transportContext;
  if (transportOrAccount && transportOrAccount.transporter && transportOrAccount.fromAddress) {
    transportContext = transportOrAccount;
  } else if (transportOrAccount && transportOrAccount.type === 'app_password') {
    transportContext = {
      transporter: authService.createSmtpTransporter(transportOrAccount.email, transportOrAccount.app_password),
      fromAddress: transportOrAccount.email,
      provider: 'gmail_app_password'
    };
  } else {
    transportContext = resolveTransporter(senderOverride || campaign.sender_provider);
  }

  const { transporter, fromAddress } = transportContext;

  // Parse contact custom fields
  let customFields = {};
  try {
    customFields = JSON.parse(contact.custom_fields || '{}');
  } catch {}

  const rowData = {
    ...customFields,
    email: contact.email,
    Email: contact.email,
    first_name: contact.first_name || customFields.FirstName || '',
    FirstName: contact.first_name || customFields.FirstName || '',
    company: contact.company || customFields.Company || '',
    Company: contact.company || customFields.Company || ''
  };

  // Determine variant (if A/B test)
  const variant = contact.assigned_variant || 'A';
  const stepNumber = Number(stepConfig?.step_number) || Number(contact.current_step) || 1;

  let rawSubject = '';
  let rawBody = '';

  if (stepConfig && stepNumber > 1) {
    // Follow-up step content
    rawSubject = (variant === 'B' && campaign.is_ab_test && stepConfig.subject_b)
      ? stepConfig.subject_b
      : (stepConfig.subject_a || '');
    rawBody = (variant === 'B' && campaign.is_ab_test && stepConfig.body_b)
      ? stepConfig.body_b
      : (stepConfig.body_a || '');

    // If subject is empty on a follow-up, default to Re: initial subject
    if (!rawSubject) {
      rawSubject = campaign.subject_a ? `Re: ${campaign.subject_a}` : 'Re: Quick follow up';
    }
  } else {
    // Step 1 content
    rawSubject = (variant === 'B' && campaign.is_ab_test && campaign.subject_b) 
      ? campaign.subject_b 
      : (campaign.subject_a || 'Hello');
    rawBody = (variant === 'B' && campaign.is_ab_test && campaign.body_b) 
      ? campaign.body_b 
      : (campaign.body_a || 'Hello');
  }

  let renderedSubject = templateService.interpolate(rawSubject, rowData);
  const renderedBody = templateService.interpolate(rawBody, rowData);

  // If follow-up with organic threading enabled, ensure Re: prefix
  const threadReply = stepConfig ? (stepConfig.thread_reply === 1 || stepConfig.thread_reply === true) : true;
  if (stepNumber > 1 && threadReply && !/^re:\s*/i.test(renderedSubject)) {
    renderedSubject = `Re: ${renderedSubject}`;
  }

  const templateIdToUse = stepConfig?.template_id || campaign.template_id;

  const mailHeaders = {
    'X-Mailer': 'StrokeCRM Outreach Engine',
    'X-Campaign-ID': String(campaign.id),
    'X-Drip-Step': String(stepNumber)
  };

  // RFC 2822 Organic Conversation Threading: inject In-Reply-To and References
  if (stepNumber > 1 && threadReply && initialMessageId) {
    mailHeaders['In-Reply-To'] = initialMessageId;
    mailHeaders['References'] = initialMessageId;
  }

  const mailOptions = {
    from: fromAddress,
    to: contact.email,
    subject: renderedSubject,
    text: templateService.htmlToText(renderedBody),
    attachments: templateService.getMailAttachments(templateIdToUse),
    headers: mailHeaders
  };

  if (templateService.isHtml(renderedBody)) mailOptions.html = renderedBody;

  const copied = ccBccForRecipient(campaign, contact.email);
  if (copied.cc) mailOptions.cc = copied.cc;
  if (copied.bcc) mailOptions.bcc = copied.bcc;

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    variant,
    subject: renderedSubject,
    stepNumber
  };
}

/**
 * Worker loop processing queue for a specific campaign
 */
async function runCampaignWorker(campaignId) {
  const jobId = Number(campaignId);
  const job = activeJobs.get(jobId);
  if (!job) return;
  job.isWorkerRunning = true;

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    while (!job.isPaused && !job.isStopped) {
    // 1. Refresh campaign & account state
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(jobId);
    if (!campaign) break;

    let transportContext;
    try {
      transportContext = resolveTransporter(job.senderOverride || campaign.sender_provider);
    } catch (err) {
      job.lastLog = `Sender error: ${err.message}`;
      db.prepare("UPDATE campaigns SET status = 'PAUSED' WHERE id = ?").run(jobId);
      break;
    }

    // 2. Read global throttle settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const dailyLimit = Number(campaign.daily_limit || settings.daily_limit || 100);
    const minDelay = job.minDelay !== undefined 
      ? job.minDelay 
      : Number(campaign.min_delay || settings.min_delay_sec || 15);
    const maxDelay = job.maxDelay !== undefined 
      ? job.maxDelay 
      : Number(campaign.max_delay || settings.max_delay_sec || 35);
    const startHour = settings.start_hour || '09:00';
    const endHour = settings.end_hour || '18:00';

    // 3. Check Daily Limit Quota
    const sentTodayCount = db.prepare(`
      SELECT COUNT(*) as count FROM email_logs 
      WHERE sent_date = ? AND status = 'SENT'
    `).get(todayStr).count;

    if (sentTodayCount >= dailyLimit) {
      job.lastLog = `Daily send cap of ${dailyLimit} reached for today. Pausing queue until tomorrow.`;
      db.prepare("UPDATE campaigns SET status = 'PAUSED' WHERE id = ?").run(jobId);
      job.isPaused = true;
      break;
    }

    // 4. Check Working Hours (only if enforce_schedule is enabled and not explicitly bypassed)
    const enforceSchedule = settings.enforce_schedule === '1' || settings.enforce_schedule === 'true';
    if (enforceSchedule && !job.bypassHours && !isWithinWorkingHours(startHour, endHour)) {
      job.isWaitingSchedule = true;
      job.lastLog = `Waiting for scheduled sending window (${startHour} - ${endHour}). Will resume automatically.`;
      db.prepare("UPDATE campaigns SET status = 'WAITING_SCHEDULE' WHERE id = ?").run(jobId);
      const keepGoing = await interruptibleSleep(30000, jobId);
      if (!keepGoing) break;
      continue;
    }
    job.isWaitingSchedule = false;

    // 5. Fetch next pending contact strictly from attached database respecting scheduled delays
    const isIsolated = !!campaign.database_id;
    const targetTable = isIsolated ? 'database_records' : 'contacts';
    const nowIso = new Date().toISOString();

    let contact;
    if (isIsolated) {
      contact = db.prepare(`
        SELECT * FROM database_records 
        WHERE database_id = ? AND status = 'PENDING' AND included = 1 
          AND (next_step_scheduled_at IS NULL OR next_step_scheduled_at <= ?)
        ORDER BY CASE WHEN current_step > 1 THEN 0 ELSE 1 END, id ASC 
        LIMIT 1
      `).get(campaign.database_id, nowIso);
    } else {
      contact = db.prepare(`
        SELECT * FROM contacts 
        WHERE campaign_id = ? AND status = 'PENDING' 
          AND (next_step_scheduled_at IS NULL OR next_step_scheduled_at <= ?)
        ORDER BY CASE WHEN current_step > 1 THEN 0 ELSE 1 END, id ASC 
        LIMIT 1
      `).get(jobId, nowIso);
    }

    if (!contact) {
      // Check if there are future scheduled contacts waiting for their delay window
      const futureCheck = isIsolated
        ? db.prepare(`
            SELECT COUNT(*) as count, MIN(next_step_scheduled_at) as earliest 
            FROM database_records 
            WHERE database_id = ? AND status = 'PENDING' AND included = 1 AND next_step_scheduled_at > ?
          `).get(campaign.database_id, nowIso)
        : db.prepare(`
            SELECT COUNT(*) as count, MIN(next_step_scheduled_at) as earliest 
            FROM contacts 
            WHERE campaign_id = ? AND status = 'PENDING' AND next_step_scheduled_at > ?
          `).get(jobId, nowIso);

      if (futureCheck && futureCheck.count > 0) {
        job.isWaitingSchedule = true;
        const earliestDate = futureCheck.earliest 
          ? new Date(futureCheck.earliest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'scheduled delay';
        job.lastLog = `Waiting for scheduled follow-ups (${futureCheck.count} pending, next send around ${earliestDate}).`;
        db.prepare("UPDATE campaigns SET status = 'WAITING_SCHEDULE' WHERE id = ?").run(jobId);
        const keepGoing = await interruptibleSleep(15000, jobId);
        if (!keepGoing) break;
        continue;
      }

      job.lastLog = 'All contacts in campaign and sequence steps completed!';
      db.prepare("UPDATE campaigns SET status = 'COMPLETED' WHERE id = ?").run(jobId);
      job.isStopped = true;
      break;
    }

    // Mark as SENDING atomically in respective table
    db.prepare(`UPDATE ${targetTable} SET status = 'SENDING' WHERE id = ?`).run(contact.id);
    job.currentContactEmail = contact.email;
    const currentStepNum = Number(contact.current_step) || 1;
    job.lastLog = `Sending Step ${currentStepNum} to ${contact.email}...`;

    // Fetch step configuration for this step
    const stepConfig = db.prepare(`
      SELECT * FROM campaign_drip_steps 
      WHERE campaign_id = ? AND step_number = ?
    `).get(jobId, currentStepNum);

    try {
      // 6. Dispatch Email with step-specific copy and threading headers
      const result = await dispatchSingleEmail(
        transportContext,
        contact,
        campaign,
        job.senderOverride || campaign.sender_provider,
        stepConfig,
        contact.initial_message_id || contact.message_id
      );

      // Check if next step exists in campaign_drip_steps
      const nextStepNum = currentStepNum + 1;
      const nextStep = db.prepare(`
        SELECT * FROM campaign_drip_steps 
        WHERE campaign_id = ? AND step_number = ? AND is_active = 1
      `).get(jobId, nextStepNum);

      if (nextStep) {
        // Schedule follow-up step
        const delayMs = ((Number(nextStep.delay_days) || 0) * 86400 + (Number(nextStep.delay_hours) || 0) * 3600) * 1000;
        const nextScheduledIso = new Date(Date.now() + Math.max(delayMs, 1000)).toISOString();

        db.prepare(`
          UPDATE ${targetTable} 
          SET status = 'PENDING',
              current_step = ?,
              sent_at = ?,
              message_id = ?,
              initial_message_id = COALESCE(initial_message_id, ?),
              next_step_scheduled_at = ?,
              error_message = NULL 
          WHERE id = ?
        `).run(nextStepNum, nowIso, result.messageId, result.messageId, nextScheduledIso, contact.id);
      } else {
        // Final step complete
        db.prepare(`
          UPDATE ${targetTable} 
          SET status = 'SENT',
              sent_at = ?,
              message_id = ?,
              initial_message_id = COALESCE(initial_message_id, ?),
              next_step_scheduled_at = NULL,
              error_message = NULL 
          WHERE id = ?
        `).run(nowIso, result.messageId, result.messageId, contact.id);
      }

      db.prepare(`
        INSERT INTO email_logs (
          campaign_id, contact_id, database_record_id, recipient_email, variant,
          subject, status, sent_at, sent_date, message_id, step_number
        ) VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, ?, ?, ?)
      `).run(
        jobId,
        isIsolated ? null : contact.id,
        isIsolated ? contact.id : null,
        contact.email,
        result.variant,
        result.subject,
        nowIso,
        todayStr,
        result.messageId,
        currentStepNum
      );

      // Update counters directly from true state
      if (isIsolated) {
        const stats = databaseService.getIncludedStats(campaign.database_id);

        db.prepare(`
          UPDATE campaigns 
          SET sent_count = ?, failed_count = ?, total_contacts = ?, updated_at = ?
          WHERE id = ?
        `).run(stats.sent || 0, stats.failed || 0, stats.total || 0, nowIso, jobId);
      } else {
        db.prepare(`
          UPDATE campaigns 
          SET sent_count = sent_count + 1, updated_at = ?
          WHERE id = ?
        `).run(nowIso, jobId);
      }

      job.lastLog = `✓ Sent Step ${currentStepNum} to ${contact.email}`;
    } catch (err) {
      // Record failure
      db.prepare(`
        UPDATE ${targetTable} 
        SET status = 'FAILED', sent_at = ?, error_message = ? 
        WHERE id = ?
      `).run(nowIso, err.message, contact.id);

      try {
        db.prepare(`
          INSERT INTO email_logs (
            campaign_id, contact_id, database_record_id, recipient_email, variant,
            status, error_message, sent_at, sent_date, step_number
          ) VALUES (?, ?, ?, ?, ?, 'FAILED', ?, ?, ?, ?)
        `).run(
          jobId,
          isIsolated ? null : contact.id,
          isIsolated ? contact.id : null,
          contact.email,
          contact.assigned_variant || 'A',
          err.message,
          nowIso,
          todayStr,
          currentStepNum
        );
      } catch (logErr) {
        console.error('[StrokeCRM Log Failure]:', logErr.message);
      }

      if (isIsolated) {
        const stats = databaseService.getIncludedStats(campaign.database_id);

        db.prepare(`
          UPDATE campaigns 
          SET sent_count = ?, failed_count = ?, total_contacts = ?, updated_at = ?
          WHERE id = ?
        `).run(stats.sent || 0, stats.failed || 0, stats.total || 0, nowIso, jobId);
      } else {
        db.prepare(`
          UPDATE campaigns 
          SET failed_count = failed_count + 1, updated_at = ?
          WHERE id = ?
        `).run(nowIso, jobId);
      }

      job.lastLog = `✗ Failed sending Step ${currentStepNum} to ${contact.email}: ${err.message}`;
    }

    // 7. Humanized Pacing Jitter Delay
      // Check if paused before sleeping
      if (job.isPaused || job.isStopped) {
        break;
      }

      // 7. Humanized Pacing Jitter Delay
      const delaySec = getRandomDelay(minDelay, maxDelay);
      const delayMs = delaySec * 1000;
      job.nextSendAt = Date.now() + delayMs;
      job.delayDurationSec = delaySec;

      // Interruptible sleep
      const finishedSleep = await interruptibleSleep(delayMs, jobId);
      if (!finishedSleep) {
        break;
      }
    }
  } finally {
    job.isWorkerRunning = false;
    job.nextSendAt = null;
    if (job.isStopped) {
      activeJobs.delete(jobId);
    }
  }
}

/**
 * Start campaign dispatch
 */
function startCampaign(campaignId, options = {}) {
  const id = Number(campaignId);
  const account = authService.getActiveAccount();
  if (!account || !account.verified) {
    throw new Error('Gmail sender is not connected. Go to Settings & Gmail to connect your account first.');
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  if (!campaign.subject_a || !campaign.body_a) {
    throw new Error('Please configure and save an email subject and body in Templates before starting dispatch.');
  }

  // A list used by an older campaign still has SENT rows. This campaign has not sent them.
  if (campaign.database_id) {
    databaseService.reopenUnusedDatabase(campaign.database_id, id);
  }

  // 1. Reset any stuck SENDING records back to PENDING so nothing is locked
  if (campaign.database_id) {
    db.prepare("UPDATE database_records SET status = 'PENDING' WHERE database_id = ? AND status = 'SENDING'").run(campaign.database_id);
  } else {
    db.prepare("UPDATE contacts SET status = 'PENDING' WHERE campaign_id = ? AND status = 'SENDING'").run(id);
  }

  // 2. Count pending records
  let pendingCount = 0;
  if (campaign.database_id) {
    const dbInfo = db.prepare('SELECT id, name FROM databases WHERE id = ?').get(campaign.database_id);
    if (!dbInfo) {
      throw new Error('The attached database cannot be found. Please attach an active database to this campaign.');
    }
    pendingCount = databaseService.getIncludedStats(campaign.database_id).pending || 0;
  } else {
    pendingCount = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ? AND status = 'PENDING'").get(id).count;
  }

  if (pendingCount === 0) {
    const leftOut = campaign.database_id
      ? db.prepare("SELECT COUNT(*) as count FROM database_records WHERE database_id = ? AND status = 'PENDING' AND included = 0").get(campaign.database_id).count
      : 0;
    throw new Error(leftOut
      ? 'No selected rows are still pending. Open Preview and check the rows this campaign should send.'
      : 'This campaign has 0 pending contacts. All contacts have already been processed.');
  }

  // Set DB status to RUNNING and persist pacing if provided
  let minDelay = options.min_delay !== undefined ? Number(options.min_delay) : undefined;
  let maxDelay = options.max_delay !== undefined ? Number(options.max_delay) : undefined;
  if (options.pacingPreset === 'fast') {
    minDelay = 15; maxDelay = 35;
  } else if (options.pacingPreset === 'standard') {
    minDelay = 30; maxDelay = 75;
  } else if (options.pacingPreset === 'conservative') {
    minDelay = 60; maxDelay = 120;
  }

  if (minDelay !== undefined && maxDelay !== undefined) {
    db.prepare("UPDATE campaigns SET status = 'RUNNING', min_delay = ?, max_delay = ?, updated_at = ? WHERE id = ?")
      .run(minDelay, maxDelay, new Date().toISOString(), id);
  } else {
    db.prepare("UPDATE campaigns SET status = 'RUNNING', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
  }

  // 3. Register or reactivate job in activeJobs
  let job = activeJobs.get(id);
  const shouldBypass = options.bypassHours !== undefined ? !!options.bypassHours : true;

  if (!job) {
    job = {
      campaignId: id,
      isPaused: false,
      isStopped: false,
      isWaitingSchedule: false,
      isWorkerRunning: false,
      bypassHours: shouldBypass,
      senderOverride: options.sender_provider || null,
      minDelay: minDelay !== undefined ? minDelay : (campaign.min_delay || 15),
      maxDelay: maxDelay !== undefined ? maxDelay : (campaign.max_delay || 35),
      nextSendAt: null,
      delayDurationSec: 0,
      currentContactEmail: null,
      lastLog: 'Starting dispatch worker...'
    };
    activeJobs.set(id, job);
  } else {
    job.isPaused = false;
    job.isStopped = false;
    job.isWaitingSchedule = false;
    job.bypassHours = shouldBypass;
    if (minDelay !== undefined) job.minDelay = minDelay;
    if (maxDelay !== undefined) job.maxDelay = maxDelay;
    if (options.sender_provider) job.senderOverride = options.sender_provider;
    job.lastLog = 'Resuming dispatch worker...';
  }

  // Ensure worker is actively executing
  if (!job.isWorkerRunning) {
    runCampaignWorker(id).catch(err => {
      console.error(`[StrokeCRM Worker Error ${id}]:`, err);
    });
  }

  return { success: true, message: 'Campaign dispatch started.' };
}

/**
 * Pause campaign dispatch
 */
function pauseCampaign(campaignId) {
  const id = Number(campaignId);
  const job = activeJobs.get(id);
  if (job) {
    job.isPaused = true;
    job.nextSendAt = null;
    job.lastLog = 'Queue paused by user.';
  }

  const campaign = db.prepare('SELECT database_id FROM campaigns WHERE id = ?').get(id);
  if (campaign && campaign.database_id) {
    db.prepare("UPDATE database_records SET status = 'PENDING' WHERE database_id = ? AND status = 'SENDING'").run(campaign.database_id);
  } else {
    db.prepare("UPDATE contacts SET status = 'PENDING' WHERE campaign_id = ? AND status = 'SENDING'").run(id);
  }

  db.prepare("UPDATE campaigns SET status = 'PAUSED', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
  return { success: true, message: 'Campaign paused.' };
}

/**
 * Stop campaign dispatch
 */
function stopCampaign(campaignId) {
  const id = Number(campaignId);
  const campaign = db.prepare('SELECT database_id FROM campaigns WHERE id = ?').get(id);
  const job = activeJobs.get(id);
  if (job) {
    job.isStopped = true;
    job.isPaused = false;
    job.nextSendAt = null;
    job.lastLog = 'Queue stopped by user.';
    activeJobs.delete(id);
  }
  // Reset any stuck SENDING records back to PENDING in both tables
  if (campaign && campaign.database_id) {
    db.prepare("UPDATE database_records SET status = 'PENDING' WHERE database_id = ? AND status = 'SENDING'").run(campaign.database_id);
  }
  db.prepare("UPDATE contacts SET status = 'PENDING' WHERE campaign_id = ? AND status = 'SENDING'").run(id);
  db.prepare("UPDATE campaigns SET status = 'DRAFT', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
  return { success: true, message: 'Campaign stopped.' };
}

/**
 * Get live status of campaign queue
 */
function getCampaignQueueStatus(campaignId) {
  const id = Number(campaignId);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return null;

  const job = activeJobs.get(id);
  let totalContacts = 0;
  let pendingCount = 0;
  let sentCount = 0;
  let failedCount = 0;

  if (campaign.database_id) {
    databaseService.reopenUnusedDatabase(campaign.database_id, id);
    const stats = databaseService.getIncludedStats(campaign.database_id);
    totalContacts = stats.total || 0;
    pendingCount = stats.pending || 0;
    sentCount = stats.sent || 0;
    failedCount = stats.failed || 0;
  } else {
    totalContacts = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ?").get(id).count;
    pendingCount = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ? AND status = 'PENDING'").get(id).count;
    sentCount = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ? AND status = 'SENT'").get(id).count;
    failedCount = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ? AND status = 'FAILED'").get(id).count;
  }

  // Auto-sync campaign counters in database
  db.prepare(`
    UPDATE campaigns 
    SET total_contacts = ?, sent_count = ?, failed_count = ?
    WHERE id = ?
  `).run(totalContacts, sentCount, failedCount, id);

  // Step-wise metrics for drip sequence funnel
  const stepLogs = db.prepare(`
    SELECT step_number, COUNT(*) as count 
    FROM email_logs 
    WHERE campaign_id = ? AND status = 'SENT'
    GROUP BY step_number
  `).all(id);

  const stepStats = {
    step1_sent: 0,
    step2_sent: 0,
    step3_sent: 0,
    step2_scheduled: 0,
    step3_scheduled: 0
  };
  stepLogs.forEach(r => {
    if (r.step_number === 1) stepStats.step1_sent = r.count;
    else if (r.step_number === 2) stepStats.step2_sent = r.count;
    else if (r.step_number === 3) stepStats.step3_sent = r.count;
  });

  const scheduledRows = campaign.database_id
    ? db.prepare(`
        SELECT current_step, COUNT(*) as count 
        FROM database_records 
        WHERE database_id = ? AND included = 1 AND status = 'PENDING' AND current_step > 1
        GROUP BY current_step
      `).all(campaign.database_id)
    : db.prepare(`
        SELECT current_step, COUNT(*) as count 
        FROM contacts 
        WHERE campaign_id = ? AND status = 'PENDING' AND current_step > 1
        GROUP BY current_step
      `).all(id);

  scheduledRows.forEach(r => {
    if (r.current_step === 2) stepStats.step2_scheduled = r.count;
    else if (r.current_step === 3) stepStats.step3_scheduled = r.count;
  });

  // If all contacts are processed and was running or paused, mark as COMPLETED
  let campaignStatus = campaign.status;
  if (pendingCount === 0 && totalContacts > 0 && campaignStatus !== 'DRAFT') {
    campaignStatus = 'COMPLETED';
    db.prepare("UPDATE campaigns SET status = 'COMPLETED' WHERE id = ?").run(id);
  } else if (campaignStatus === 'RUNNING' && (!job || !job.isWorkerRunning)) {
    campaignStatus = 'PAUSED';
    db.prepare("UPDATE campaigns SET status = 'PAUSED' WHERE id = ?").run(id);
  }

  // Recent 25 logs
  const recentLogs = db.prepare(`
    SELECT * FROM email_logs 
    WHERE campaign_id = ? 
    ORDER BY id DESC LIMIT 25
  `).all(id);

  let secondsRemaining = 0;
  if (job && job.nextSendAt && Date.now() < job.nextSendAt) {
    secondsRemaining = Math.max(0, Math.round((job.nextSendAt - Date.now()) / 1000));
  }

  const isRunning = !!(job && job.isWorkerRunning && !job.isPaused && !job.isStopped && !job.isWaitingSchedule);
  const isPaused = (job && job.isPaused) || campaignStatus === 'PAUSED';
  const isWaitingSchedule = !!(job && job.isWaitingSchedule) || campaignStatus === 'WAITING_SCHEDULE';

  let currentLog = 'Idle';
  if (job && job.lastLog) {
    currentLog = job.lastLog;
  } else if (campaignStatus === 'COMPLETED') {
    currentLog = 'All contacts processed.';
  } else if (campaignStatus === 'PAUSED') {
    currentLog = 'Queue paused.';
  } else if (campaignStatus === 'WAITING_SCHEDULE') {
    currentLog = 'Waiting for scheduled sending window.';
  }

  const effectiveMinDelay = job?.minDelay !== undefined ? job.minDelay : (campaign.min_delay || 15);
  const effectiveMaxDelay = job?.maxDelay !== undefined ? job.maxDelay : (campaign.max_delay || 35);
  let pacingPreset = 'custom';
  if (effectiveMinDelay <= 15 && effectiveMaxDelay <= 35) pacingPreset = 'fast';
  else if (effectiveMinDelay <= 30 && effectiveMaxDelay <= 75) pacingPreset = 'standard';
  else if (effectiveMinDelay >= 50) pacingPreset = 'conservative';

  return {
    campaignId: id,
    name: campaign.name,
    status: campaignStatus,
    isRunning,
    isPaused,
    isWaitingSchedule,
    totalContacts,
    pendingCount,
    sentCount,
    failedCount,
    secondsRemaining,
    delayDurationSec: job ? job.delayDurationSec : 0,
    currentContactEmail: job ? job.currentContactEmail : null,
    minDelay: effectiveMinDelay,
    maxDelay: effectiveMaxDelay,
    pacingPreset,
    lastLog: currentLog,
    stepStats,
    recentLogs
  };
}

/**
 * Send a single test email preview to specified recipient
 */
async function sendTestEmail(campaignId, testRecipient, senderOverride = null, stepNumber = 1) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  const transportContext = resolveTransporter(senderOverride || campaign.sender_provider);

  const sampleContact = {
    email: testRecipient,
    first_name: 'Test',
    company: 'Preview Co',
    custom_fields: JSON.stringify({
      FirstName: 'Test',
      LastName: 'User',
      Company: 'Preview Co',
      Role: 'Founder',
      City: 'Austin'
    })
  };

  let stepConfig = null;
  const targetStep = Number(stepNumber) || 1;
  if (targetStep > 1) {
    stepConfig = db.prepare('SELECT * FROM campaign_drip_steps WHERE campaign_id = ? AND step_number = ?').get(campaignId, targetStep);
  }

  const result = await dispatchSingleEmail(
    transportContext,
    sampleContact,
    campaign,
    senderOverride || campaign.sender_provider,
    stepConfig,
    '<preview-thread-anchor@strokecrm.preview>'
  );

  const providerLabel = transportContext.provider === 'custom_domain' ? 'Custom Domain SMTP' : 'Gmail';
  return {
    success: true,
    message: `Test email for Step ${targetStep} successfully sent to ${testRecipient} via ${providerLabel}!`,
    messageId: result.messageId
  };
}

/**
 * Dynamically adjust campaign pacing on the fly
 */
function updateCampaignPacing(campaignId, minDelay, maxDelay) {
  const id = Number(campaignId);
  const min = Math.max(1, (minDelay !== undefined && minDelay !== null && !isNaN(minDelay)) ? Number(minDelay) : 15);
  const max = Math.max(min, (maxDelay !== undefined && maxDelay !== null && !isNaN(maxDelay)) ? Number(maxDelay) : 35);

  db.prepare('UPDATE campaigns SET min_delay = ?, max_delay = ? WHERE id = ?').run(min, max, id);

  const job = activeJobs.get(id);
  if (job) {
    job.minDelay = min;
    job.maxDelay = max;

    // If currently waiting in a delay that exceeds the new ceiling, shorten immediately
    const now = Date.now();
    if (job.nextSendAt && job.nextSendAt > now) {
      const remainingSec = Math.round((job.nextSendAt - now) / 1000);
      if (remainingSec > max) {
        const newDelaySec = getRandomDelay(min, max);
        job.delayDurationSec = newDelaySec;
        job.nextSendAt = now + (newDelaySec * 1000);
        job.pacingReset = true;
      }
    }
  }

  return { success: true, min_delay: min, max_delay: max };
}

module.exports = {
  resolveTransporter,
  dispatchSingleEmail,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  updateCampaignPacing,
  getCampaignQueueStatus,
  sendTestEmail,
  normalizeAddressList,
  ccBccForRecipient
};
