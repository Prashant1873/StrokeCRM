const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const authService = require('./authService');
const leadService = require('./leadService');
const templateService = require('./templateService');
const queueService = require('./queueService');

const app = express();
const PORT = process.env.PORT || 3001;

// Multer memory storage for in-memory file parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Settings Endpoints
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const entries = req.body;
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    const updateMany = db.transaction((settingsObj) => {
      for (const [key, val] of Object.entries(settingsObj)) {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        stmt.run(key, strVal, new Date().toISOString());
      }
    });

    updateMany(entries);
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth & Gmail Connection Endpoints
app.get('/api/auth/status', (req, res) => {
  try {
    const account = authService.getActiveAccount();
    if (!account) {
      return res.json({ connected: false });
    }
    res.json({
      connected: true,
      account: {
        id: account.id,
        email: account.email,
        type: account.type,
        verified: !!account.verified,
        last_verified_at: account.last_verified_at,
        daily_sent_count: account.daily_sent_count,
        has_password: !!account.app_password
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/test-smtp', async (req, res) => {
  const { email, app_password } = req.body;
  if (!email || !app_password) {
    return res.status(400).json({ success: false, message: 'Email and App Password are required.' });
  }
  const result = await authService.testSmtpConnection(email, app_password);
  res.json(result);
});

app.post('/api/auth/test-oauth', async (req, res) => {
  const { client_id, client_secret, refresh_token } = req.body;
  if (!client_id || !client_secret || !refresh_token) {
    return res.status(400).json({ success: false, message: 'Client ID, Secret, and Refresh Token are required.' });
  }
  const result = await authService.testOAuthConnection(client_id, client_secret, refresh_token);
  res.json(result);
});

app.post('/api/auth/save', async (req, res) => {
  try {
    const { type, email, app_password, oauth_client_id, oauth_client_secret, oauth_refresh_token } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    let verified = false;
    if (type === 'app_password') {
      if (!app_password) {
        return res.status(400).json({ success: false, message: 'App Password is required.' });
      }
      const testRes = await authService.testSmtpConnection(email, app_password);
      if (!testRes.success) {
        return res.status(400).json({ success: false, message: testRes.message });
      }
      verified = true;
    } else if (type === 'oauth2') {
      const testRes = await authService.testOAuthConnection(oauth_client_id, oauth_client_secret, oauth_refresh_token);
      if (!testRes.success) {
        return res.status(400).json({ success: false, message: testRes.message });
      }
      verified = true;
    }

    const saved = authService.saveAccount({
      type,
      email,
      app_password,
      oauth_client_id,
      oauth_client_secret,
      oauth_refresh_token,
      verified
    });

    res.json({
      success: true,
      message: 'Account configured and verified successfully!',
      account: {
        id: saved.id,
        email: saved.email,
        type: saved.type,
        verified: !!saved.verified,
        last_verified_at: saved.last_verified_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/disconnect', (req, res) => {
  try {
    db.prepare('UPDATE accounts SET is_active = 0, verified = 0').run();
    res.json({ success: true, message: 'Gmail account disconnected.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Lead Ingestion Endpoints (Phase 2)
// ==========================================

// Parse uploaded file without saving yet (Preview step)
app.post('/api/leads/parse', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No spreadsheet file uploaded.' });
    }

    const parsed = leadService.parseSpreadsheet(req.file.buffer, req.file.originalname);
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Import parsed rows into a campaign list
app.post('/api/leads/import', (req, res) => {
  try {
    const { campaignName, rows, fieldMapping } = req.body;

    if (!campaignName || !campaignName.trim()) {
      return res.status(400).json({ success: false, message: 'Campaign name is required.' });
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Rows array is required.' });
    }
    if (!fieldMapping || !fieldMapping.email) {
      return res.status(400).json({ success: false, message: 'Email column must be selected.' });
    }

    const result = leadService.importLeadsIntoCampaign(campaignName.trim(), rows, fieldMapping);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get leads / contacts list
app.get('/api/leads', (req, res) => {
  try {
    const { campaignId, limit = 100, offset = 0 } = req.query;
    const contacts = leadService.getContacts(
      campaignId ? Number(campaignId) : null,
      Number(limit),
      Number(offset)
    );
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
    res.json({ contacts, totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all contacts
app.post('/api/leads/clear', (req, res) => {
  try {
    const result = leadService.clearAllContacts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate ready-to-test sample CSV
app.get('/api/leads/sample-csv', (req, res) => {
  const sampleCsv = `FirstName,LastName,Email,Company,Role,Industry,City
Sarah,Connor,sarah.connor@cyberdyne-ai.io,Cyberdyne Systems,Head of AI,Robotics,San Francisco
Alex,Mercer,alex.mercer@apexcloud.co,Apex Cloud,CTO,Cloud Infrastructure,Austin
Maya,Lin,maya@finscale.org,FinScale,Founder & CEO,Fintech,New York
David,Kim,david.kim@nexushealth.tech,Nexus Health,VP Engineering,Healthtech,Boston
Elena,Rostova,elena.r@quantumflow.dev,QuantumFlow,Lead Architect,Developer Tools,Seattle`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="strokecrm_sample_leads.csv"');
  res.status(200).send(sampleCsv);
});

// ==========================================
// Template & Spam Analysis Endpoints (Phase 3)
// ==========================================

// Run real-time spam analysis on subject and body
app.post('/api/templates/spam-check', (req, res) => {
  const { subject, body } = req.body;
  const analysis = templateService.checkSpam(subject || '', body || '');
  res.json(analysis);
});

// Render template preview with a lead's data and run spam analysis
app.post('/api/templates/preview', (req, res) => {
  try {
    const { subject, body, contactId, sampleData } = req.body;
    let rowData = sampleData;

    if (contactId) {
      const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
      if (contact) {
        let custom = {};
        try { custom = JSON.parse(contact.custom_fields || '{}'); } catch {}
        rowData = {
          ...custom,
          email: contact.email,
          Email: contact.email,
          first_name: contact.first_name,
          FirstName: contact.first_name,
          company: contact.company,
          Company: contact.company
        };
      }
    }

    if (!rowData) {
      // Default fallback mock lead if no contact selected
      rowData = {
        FirstName: 'Sarah',
        LastName: 'Connor',
        Email: 'sarah@cyberdyne.io',
        Company: 'Cyberdyne Systems',
        Role: 'Head of AI',
        City: 'San Francisco'
      };
    }

    const renderedSubject = templateService.interpolate(subject || '', rowData);
    const renderedBody = templateService.interpolate(body || '', rowData);
    const spamAnalysis = templateService.checkSpam(subject || '', body || '');

    res.json({
      success: true,
      renderedSubject,
      renderedBody,
      spamAnalysis,
      variablesUsed: templateService.extractVariables(`${subject} ${body}`)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List all campaigns
app.get('/api/campaigns', (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get campaign by ID with its lead columns/sample contact
app.get('/api/campaigns/:id', (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get sample contact for column pills
    const sampleContact = db.prepare('SELECT * FROM contacts WHERE campaign_id = ? LIMIT 1').get(campaign.id);
    let sampleHeaders = ['FirstName', 'LastName', 'Email', 'Company'];
    if (sampleContact && sampleContact.custom_fields) {
      try {
        const parsed = JSON.parse(sampleContact.custom_fields);
        sampleHeaders = Object.keys(parsed);
      } catch {}
    }

    res.json({ campaign, sampleHeaders, sampleContact });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save template to campaign
app.post('/api/campaigns/:id/template', (req, res) => {
  try {
    const { subject_a, body_a, subject_b, body_b, is_ab_test } = req.body;
    db.prepare(`
      UPDATE campaigns 
      SET subject_a = ?, body_a = ?, subject_b = ?, body_b = ?, is_ab_test = ?, updated_at = ?
      WHERE id = ?
    `).run(
      subject_a || '',
      body_a || '',
      subject_b || '',
      body_b || '',
      is_ab_test ? 1 : 0,
      new Date().toISOString(),
      req.params.id
    );
    res.json({ success: true, message: 'Template saved to campaign successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Campaign Dispatch & Queue Endpoints (Phase 4)
// ==========================================

// Start campaign dispatch
app.post('/api/campaigns/:id/start', (req, res) => {
  try {
    const { bypassHours } = req.body || {};
    const result = queueService.startCampaign(req.params.id, { bypassHours: !!bypassHours });
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Pause campaign dispatch
app.post('/api/campaigns/:id/pause', (req, res) => {
  try {
    const result = queueService.pauseCampaign(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Stop campaign dispatch
app.post('/api/campaigns/:id/stop', (req, res) => {
  try {
    const result = queueService.stopCampaign(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get campaign queue status & live logs
app.get('/api/campaigns/:id/status', (req, res) => {
  try {
    const status = queueService.getCampaignQueueStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a single test email preview
app.post('/api/campaigns/:id/test-send', async (req, res) => {
  try {
    const { testRecipient } = req.body;
    if (!testRecipient) {
      return res.status(400).json({ success: false, message: 'Test recipient email is required.' });
    }
    const result = await queueService.sendTestEmail(req.params.id, testRecipient);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// A/B Testing Studio Endpoints (Phase 5)
// ==========================================

// Get A/B testing stats and comparison for a campaign
app.get('/api/campaigns/:id/ab-stats', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Cohort breakdown
    const statsA = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
      FROM contacts 
      WHERE campaign_id = ? AND assigned_variant = 'A'
    `).get(campaignId);

    const statsB = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
      FROM contacts 
      WHERE campaign_id = ? AND assigned_variant = 'B'
    `).get(campaignId);

    // Spam scores for each variant
    const spamA = templateService.checkSpam(campaign.subject_a || '', campaign.body_a || '');
    const spamB = templateService.checkSpam(campaign.subject_b || '', campaign.body_b || '');

    const rateA = statsA.sent > 0 ? Math.round((statsA.sent / (statsA.sent + statsA.failed)) * 100) : 100;
    const rateB = statsB.sent > 0 ? Math.round((statsB.sent / (statsB.sent + statsB.failed)) * 100) : 100;

    res.json({
      campaignId,
      campaignName: campaign.name,
      is_ab_test: !!campaign.is_ab_test,
      variantA: {
        subject: campaign.subject_a || '',
        body: campaign.body_a || '',
        total: statsA.total || 0,
        sent: statsA.sent || 0,
        failed: statsA.failed || 0,
        pending: statsA.pending || 0,
        deliveryRate: rateA,
        spamScore: spamA.score,
        spamRating: spamA.rating,
        wordCount: (campaign.body_a || '').split(/\s+/).filter(Boolean).length
      },
      variantB: {
        subject: campaign.subject_b || '',
        body: campaign.body_b || '',
        total: statsB.total || 0,
        sent: statsB.sent || 0,
        failed: statsB.failed || 0,
        pending: statsB.pending || 0,
        deliveryRate: rateB,
        spamScore: spamB.score,
        spamRating: spamB.rating,
        wordCount: (campaign.body_b || '').split(/\s+/).filter(Boolean).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Perform 50/50 cohort splitting on all contacts in campaign
app.post('/api/campaigns/:id/ab-split', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const contacts = db.prepare('SELECT id FROM contacts WHERE campaign_id = ? ORDER BY id ASC').all(campaignId);

    if (contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No contacts found in campaign to split.' });
    }

    const updateVariant = db.prepare('UPDATE contacts SET assigned_variant = ? WHERE id = ?');
    let countA = 0;
    let countB = 0;

    const runSplit = db.transaction(() => {
      contacts.forEach((contact, idx) => {
        const variant = idx % 2 === 0 ? 'A' : 'B';
        updateVariant.run(variant, contact.id);
        if (variant === 'A') countA++; else countB++;
      });

      // Enable A/B test flag on campaign
      db.prepare('UPDATE campaigns SET is_ab_test = 1, updated_at = ? WHERE id = ?')
        .run(new Date().toISOString(), campaignId);
    });

    runSplit();

    res.json({
      success: true,
      message: `Split ${contacts.length} leads 50/50 (${countA} assigned to Variant A, ${countB} assigned to Variant B).`,
      countA,
      countB
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save A/B testing copy and settings
app.post('/api/campaigns/:id/ab-save', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const { subject_a, body_a, subject_b, body_b, is_ab_test } = req.body;

    db.prepare(`
      UPDATE campaigns 
      SET subject_a = ?, body_a = ?, subject_b = ?, body_b = ?, is_ab_test = ?, updated_at = ?
      WHERE id = ?
    `).run(
      subject_a || '',
      body_a || '',
      subject_b || '',
      body_b || '',
      is_ab_test ? 1 : 0,
      new Date().toISOString(),
      campaignId
    );

    res.json({ success: true, message: 'A/B Test configuration saved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Day-Wise Analytics & Audit Endpoints (Phase 6)
// ==========================================

// Overview high-level stats
app.get('/api/analytics/overview', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const quotaType = settings.gmail_quota_type || 'personal';
    const hardLimit = quotaType === 'personal' ? 500 : 2000;
    const dailyCap = Number(settings.daily_limit || 100);

    // Lifetime metrics
    const lifetime = db.prepare(`
      SELECT 
        COUNT(*) as totalAttempted,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as lifetimeSent,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as lifetimeFailed
      FROM email_logs
    `).get();

    // Today metrics
    const todayStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sentToday,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failedToday
      FROM email_logs
      WHERE sent_date = ?
    `).get(todayStr);

    const sentToday = todayStats.sentToday || 0;
    const failedToday = todayStats.failedToday || 0;

    // Contact counts
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
    const pendingLeads = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE status = 'PENDING'").get().count;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'RUNNING'").get().count;

    const lifetimeSent = lifetime.lifetimeSent || 0;
    const lifetimeFailed = lifetime.lifetimeFailed || 0;
    const deliveryRate = (lifetimeSent + lifetimeFailed) > 0 
      ? Math.round((lifetimeSent / (lifetimeSent + lifetimeFailed)) * 100) 
      : 100;

    res.json({
      sentToday,
      failedToday,
      dailyCap,
      hardLimit,
      remainingToday: Math.max(0, dailyCap - sentToday),
      lifetimeSent,
      lifetimeFailed,
      deliveryRate,
      totalLeads,
      pendingLeads,
      activeCampaigns,
      quotaType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Day-wise metrics timeline (last 14 days)
app.get('/api/analytics/daily', (req, res) => {
  try {
    const rawLogs = db.prepare(`
      SELECT 
        sent_date as date,
        SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM email_logs
      GROUP BY sent_date
      ORDER BY sent_date ASC
    `).all();

    const logsMap = new Map();
    rawLogs.forEach(r => logsMap.set(r.date, { sent: r.sent, failed: r.failed }));

    // Generate continuous 14-day timeline window ending today
    const timeline = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const entry = logsMap.get(dateStr) || { sent: 0, failed: 0 };
      timeline.push({
        date: dateStr,
        day: dayLabel,
        sent: entry.sent,
        failed: entry.failed,
        total: entry.sent + entry.failed
      });
    }

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Downloadable Audit CSV export
app.get('/api/analytics/export', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT 
        l.id,
        c.name as campaign_name,
        l.recipient_email,
        l.variant,
        l.subject,
        l.status,
        l.error_message,
        l.sent_at,
        l.message_id
      FROM email_logs l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      ORDER BY l.id DESC
    `).all();

    let csvContent = 'ID,Campaign,RecipientEmail,Variant,Subject,Status,ErrorMessage,SentAt,MessageID\n';
    logs.forEach(log => {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      csvContent += [
        log.id,
        escape(log.campaign_name),
        escape(log.recipient_email),
        escape(log.variant),
        escape(log.subject),
        escape(log.status),
        escape(log.error_message),
        escape(log.sent_at),
        escape(log.message_id)
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="strokecrm_outreach_audit.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[StrokeCRM] Server running on http://localhost:${PORT}`);
});
