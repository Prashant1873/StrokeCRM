const db = require('./db');
const authService = require('./authService');
const templateService = require('./templateService');

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
 * Returns a random integer between min and max inclusive
 */
function getRandomDelay(minSec, maxSec) {
  const min = Math.max(1, Number(minSec) || 45);
  const max = Math.max(min, Number(maxSec) || 90);
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
 * Interruptible sleep helper checking if campaign paused or cancelled
 */
async function interruptibleSleep(ms, jobId) {
  const step = 250;
  let elapsed = 0;
  while (elapsed < ms) {
    const job = activeJobs.get(jobId);
    if (!job || job.isPaused || job.isStopped) {
      return false; // interrupted
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(step, ms - elapsed)));
    elapsed += step;
  }
  return true;
}

/**
 * Sends a single email to a contact
 */
async function dispatchSingleEmail(account, contact, campaign) {
  let transporter;
  if (account.type === 'app_password') {
    transporter = authService.createSmtpTransporter(account.email, account.app_password);
  } else {
    throw new Error('OAuth2 dispatch mode is not yet configured with refresh token.');
  }

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
  const rawSubject = (variant === 'B' && campaign.is_ab_test && campaign.subject_b) 
    ? campaign.subject_b 
    : (campaign.subject_a || 'Hello');
  const rawBody = (variant === 'B' && campaign.is_ab_test && campaign.body_b) 
    ? campaign.body_b 
    : (campaign.body_a || 'Hello');

  const renderedSubject = templateService.interpolate(rawSubject, rowData);
  const renderedBody = templateService.interpolate(rawBody, rowData);

  const mailOptions = {
    from: account.email,
    to: contact.email,
    subject: renderedSubject,
    text: renderedBody,
    headers: {
      'X-Mailer': 'StrokeCRM Outreach Engine',
      'X-Campaign-ID': String(campaign.id)
    }
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    variant,
    subject: renderedSubject
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

    const account = authService.getActiveAccount();
    if (!account || !account.verified) {
      job.lastLog = 'Sender account not connected or unverified.';
      db.prepare("UPDATE campaigns SET status = 'PAUSED' WHERE id = ?").run(jobId);
      break;
    }

    // 2. Read global throttle settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const dailyLimit = Number(campaign.daily_limit || settings.daily_limit || 100);
    const minDelay = Number(campaign.min_delay || settings.min_delay_sec || 45);
    const maxDelay = Number(campaign.max_delay || settings.max_delay_sec || 90);
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

    // 5. Fetch next pending contact strictly from attached database
    const isIsolated = !!campaign.database_id;
    let contact;
    if (isIsolated) {
      contact = db.prepare(`
        SELECT * FROM database_records 
        WHERE database_id = ? AND status = 'PENDING' 
        ORDER BY id ASC LIMIT 1
      `).get(campaign.database_id);
    } else {
      contact = db.prepare(`
        SELECT * FROM contacts 
        WHERE campaign_id = ? AND status = 'PENDING' 
        ORDER BY id ASC LIMIT 1
      `).get(jobId);
    }

    if (!contact) {
      job.lastLog = 'All contacts in campaign processed!';
      db.prepare("UPDATE campaigns SET status = 'COMPLETED' WHERE id = ?").run(jobId);
      job.isStopped = true;
      break;
    }

    // Mark as SENDING atomically in respective table
    const targetTable = isIsolated ? 'database_records' : 'contacts';
    db.prepare(`UPDATE ${targetTable} SET status = 'SENDING' WHERE id = ?`).run(contact.id);
    job.currentContactEmail = contact.email;
    job.lastLog = `Sending to ${contact.email}...`;

    const nowIso = new Date().toISOString();

    try {
      // 6. Dispatch Email
      const result = await dispatchSingleEmail(account, contact, campaign);

      // Record success
      db.prepare(`
        UPDATE ${targetTable} 
        SET status = 'SENT', sent_at = ?, message_id = ?, error_message = NULL 
        WHERE id = ?
      `).run(nowIso, result.messageId, contact.id);

      db.prepare(`
        INSERT INTO email_logs (campaign_id, contact_id, database_record_id, recipient_email, variant, subject, status, sent_at, sent_date, message_id)
        VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, ?, ?)
      `).run(
        jobId,
        isIsolated ? null : contact.id,
        isIsolated ? contact.id : null,
        contact.email,
        result.variant,
        result.subject,
        nowIso,
        todayStr,
        result.messageId
      );

      // Update counters directly from true state
      if (isIsolated) {
        const stats = db.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
          FROM database_records WHERE database_id = ?
        `).get(campaign.database_id);

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

      job.lastLog = `✓ Sent to ${contact.email}`;
    } catch (err) {
      // Record failure
      db.prepare(`
        UPDATE ${targetTable} 
        SET status = 'FAILED', sent_at = ?, error_message = ? 
        WHERE id = ?
      `).run(nowIso, err.message, contact.id);

      try {
        db.prepare(`
          INSERT INTO email_logs (campaign_id, contact_id, database_record_id, recipient_email, variant, status, error_message, sent_at, sent_date)
          VALUES (?, ?, ?, ?, ?, 'FAILED', ?, ?, ?)
        `).run(
          jobId,
          isIsolated ? null : contact.id,
          isIsolated ? contact.id : null,
          contact.email,
          contact.assigned_variant || 'A',
          err.message,
          nowIso,
          todayStr
        );
      } catch (logErr) {
        console.error('[StrokeCRM Log Failure]:', logErr.message);
      }

      if (isIsolated) {
        const stats = db.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
          FROM database_records WHERE database_id = ?
        `).get(campaign.database_id);

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

      job.lastLog = `✗ Failed sending to ${contact.email}: ${err.message}`;
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
    pendingCount = db.prepare("SELECT COUNT(*) as count FROM database_records WHERE database_id = ? AND status = 'PENDING'").get(campaign.database_id).count;
  } else {
    pendingCount = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ? AND status = 'PENDING'").get(id).count;
  }

  if (pendingCount === 0) {
    throw new Error('This campaign has 0 pending contacts. All contacts have already been processed.');
  }

  // Set DB status to RUNNING
  db.prepare("UPDATE campaigns SET status = 'RUNNING', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);

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
    totalContacts = db.prepare("SELECT COUNT(*) as count FROM database_records WHERE database_id = ?").get(campaign.database_id).count;
    pendingCount = db.prepare("SELECT COUNT(*) as count FROM database_records WHERE database_id = ? AND status = 'PENDING'").get(campaign.database_id).count;
    sentCount = db.prepare("SELECT COUNT(*) as count FROM database_records WHERE database_id = ? AND status = 'SENT'").get(campaign.database_id).count;
    failedCount = db.prepare("SELECT COUNT(*) as count FROM database_records WHERE database_id = ? AND status = 'FAILED'").get(campaign.database_id).count;
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
    lastLog: currentLog,
    recentLogs
  };
}

/**
 * Send a single test email preview to specified recipient
 */
async function sendTestEmail(campaignId, testRecipient) {
  const account = authService.getActiveAccount();
  if (!account || !account.verified) {
    throw new Error('Gmail sender is not connected. Configure in Settings & Gmail first.');
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

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

  const result = await dispatchSingleEmail(account, sampleContact, campaign);
  return {
    success: true,
    message: `Test email successfully sent to ${testRecipient} via Gmail!`,
    messageId: result.messageId
  };
}

module.exports = {
  startCampaign,
  pauseCampaign,
  stopCampaign,
  getCampaignQueueStatus,
  sendTestEmail
};
