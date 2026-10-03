const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const db = require('./db');
const authService = require('./authService');
const leadService = require('./leadService');
const databaseService = require('./databaseService');
const templateService = require('./templateService');
const queueService = require('./queueService');
const replyScannerService = require('./replyScannerService');

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
    const settings = db.getSettings ? db.getSettings() : {};

    const customConfigured = Boolean(settings.custom_smtp_host && settings.custom_smtp_user);
    const activeProvider = settings.active_provider || (account ? (account.type || 'gmail_app_password') : 'gmail_app_password');

    res.json({
      connected: Boolean(account && account.verified) || customConfigured,
      active_provider: activeProvider,
      account: account ? {
        id: account.id,
        email: account.email,
        type: account.type,
        verified: !!account.verified,
        last_verified_at: account.last_verified_at,
        daily_sent_count: account.daily_sent_count,
        has_password: !!account.app_password
      } : null,
      custom_domain: {
        configured: customConfigured,
        host: settings.custom_smtp_host || '',
        port: Number(settings.custom_smtp_port) || 587,
        secure: settings.custom_smtp_secure === '1' || settings.custom_smtp_secure === 'true' || settings.custom_smtp_secure === true || Number(settings.custom_smtp_port) === 465,
        user: settings.custom_smtp_user || '',
        sender_name: settings.custom_sender_name || '',
        sender_email: settings.custom_sender_email || '',
        imap_host: settings.custom_imap_host || '',
        imap_port: Number(settings.custom_imap_port) || 993,
        imap_secure: settings.custom_imap_secure === '1' || settings.custom_imap_secure === 'true' || settings.custom_imap_secure === true || Number(settings.custom_imap_port) === 993,
        imap_user: settings.custom_imap_user || '',
        has_smtp_password: Boolean(settings.custom_smtp_pass),
        has_imap_password: Boolean(settings.custom_imap_pass)
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

// Test Custom Domain SMTP Connection
app.post('/api/auth/test-custom-smtp', async (req, res) => {
  try {
    const { host, port, secure, user, pass } = req.body;
    if (!host || !user || !pass) {
      return res.status(400).json({ success: false, message: 'SMTP Host, Username, and Password are required.' });
    }

    const portNum = Number(port) || 587;
    const isSecure = secure === true || secure === 'true' || secure === 1 || secure === '1' || portNum === 465;

    const transporter = nodemailer.createTransport({
      host: host.trim(),
      port: portNum,
      secure: isSecure,
      auth: {
        user: user.trim(),
        pass: String(pass)
      },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    await transporter.verify();
    res.json({
      success: true,
      message: `SMTP handshake verified successfully with ${host}:${portNum} (SSL: ${isSecure ? 'Yes' : 'STARTTLS'}).`
    });
  } catch (error) {
    let friendly = error.message;
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      friendly = 'Authentication failed. Please verify your SMTP username and password.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      friendly = `Connection timed out connecting to ${req.body.host}:${req.body.port}. Check your firewall, host, and port/SSL settings.`;
    } else if (error.code === 'ECONNREFUSED') {
      friendly = `Connection refused by ${req.body.host}:${req.body.port}. Check host and port.`;
    }
    res.status(400).json({ success: false, message: friendly });
  }
});

// Test Custom Domain IMAP Connection
app.post('/api/auth/test-custom-imap', async (req, res) => {
  let client;
  try {
    const { host, port, secure, user, pass } = req.body;
    if (!host || !user || !pass) {
      return res.status(400).json({ success: false, message: 'IMAP Host, Username, and Password are required.' });
    }

    const portNum = Number(port) || 993;
    const isSecure = secure === true || secure === 'true' || secure === 1 || secure === '1' || portNum === 993;

    client = new ImapFlow({
      host: host.trim(),
      port: portNum,
      secure: isSecure,
      auth: {
        user: user.trim(),
        pass: String(pass)
      },
      logger: false,
      clientInfo: {
        name: 'StrokeCRM',
        version: '2.0.0'
      }
    });

    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('IMAP connection timed out after 12 seconds.')), 12000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    await client.logout();

    res.json({
      success: true,
      message: `IMAP connection verified successfully with ${host}:${portNum} (SSL: ${isSecure ? 'Yes' : 'STARTTLS'}). Inbound scanner is ready.`
    });
  } catch (error) {
    if (client) {
      try { await client.logout(); } catch {}
    }
    let friendly = error.message;
    if (error.responseStatus === 'NO' || (error.message && (error.message.includes('authentication failed') || error.message.includes('AUTHENTICATE failed')))) {
      friendly = 'IMAP authentication failed. Please verify your IMAP username and password.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      friendly = `IMAP server unreachable at ${req.body.host}:${req.body.port}. Check server host, port, and security settings.`;
    }
    res.status(400).json({ success: false, message: friendly });
  }
});

// Send Instant Live Deliverability Test Email
app.post('/api/auth/send-test-email', async (req, res) => {
  try {
    const { host, port, secure, user, pass, sender_name, sender_email, recipient_email } = req.body;
    if (!recipient_email || !recipient_email.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient email address is required.' });
    }
    if (!host || !user || !pass) {
      return res.status(400).json({ success: false, message: 'SMTP Host, Username, and Password are required.' });
    }

    const portNum = Number(port) || 587;
    const isSecure = secure === true || secure === 'true' || secure === 1 || secure === '1' || portNum === 465;

    const fromAddress = sender_name && sender_name.trim()
      ? `"${sender_name.trim()}" <${(sender_email || user).trim()}>`
      : (sender_email || user).trim();

    const transporter = nodemailer.createTransport({
      host: host.trim(),
      port: portNum,
      secure: isSecure,
      auth: {
        user: user.trim(),
        pass: String(pass)
      },
      connectionTimeout: 15000
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient_email.trim(),
      subject: 'StrokeCRM Custom Domain Verification Test',
      text: `Hello,\n\nThis is a verification test email sent from StrokeCRM.\n\nOutbound custom domain SMTP dispatch is working perfectly!\n\nHost: ${host}:${portNum}\nSender: ${fromAddress}\nTimestamp: ${new Date().toISOString()}\n\nYou are ready to launch high-deliverability outreach from your domain!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #6366f1; margin-top: 0;">StrokeCRM Custom Domain Verification</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">This email confirms that your custom domain SMTP server connection is active, authenticated, and successfully dispatching outbound emails.</p>
          <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #38bdf8;">
            <div><strong>Host:</strong> ${host}:${portNum}</div>
            <div><strong>Sender:</strong> ${fromAddress}</div>
            <div><strong>SSL:</strong> ${isSecure ? 'Yes (Port 465 SSL)' : 'STARTTLS (Port 587)'}</div>
            <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <p style="color: #10b981; font-size: 13px; font-weight: 600;">✓ Ready for cold outreach campaigns.</p>
        </div>
      `,
      headers: {
        'X-Mailer': 'StrokeCRM Outbound Engine'
      }
    });

    res.json({
      success: true,
      message: `Test email successfully delivered to ${recipient_email.trim()}! Message ID: ${info.messageId}`,
      messageId: info.messageId
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Test send failed: ' + error.message });
  }
});

// Update Account / Custom Domain Settings
app.post('/api/settings/account', (req, res) => {
  try {
    const { active_provider, ...rest } = req.body;
    if (active_provider) {
      db.updateSettings({ active_provider });
    }
    if (Object.keys(rest).length > 0) {
      db.updateSettings(rest);
    }
    res.json({ success: true, message: 'Account settings updated successfully', settings: db.getSettings() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
// Isolated Databases Endpoints (Phase 10)
// ==========================================

// Parse uploaded spreadsheet without saving (preview headers and rows)
app.post('/api/databases/parse', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No spreadsheet file uploaded.' });
    }
    const parsed = databaseService.parseSpreadsheet(req.file.buffer, req.file.originalname);
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Upload and persist isolated Database file
app.post('/api/databases/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Spreadsheet file is required.' });
    }

    let fieldMapping = {};
    if (req.body.fieldMapping) {
      try {
        fieldMapping = typeof req.body.fieldMapping === 'string' 
          ? JSON.parse(req.body.fieldMapping) 
          : req.body.fieldMapping;
      } catch {}
    }

    const deduplicate = req.body.deduplicate !== 'false' && req.body.deduplicate !== false;

    const result = databaseService.createDatabase({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      customName: req.body.name,
      fieldMapping,
      deduplicate
    });

    res.json({ success: true, database: result, message: 'Database imported and isolated successfully!' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// List all isolated databases
app.get('/api/databases', (req, res) => {
  try {
    const list = databaseService.getDatabases();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single database with its custom headers & paginated records
app.get('/api/databases/:id', (req, res) => {
  try {
    const { limit = 50, offset = 0, search = '' } = req.query;
    const data = databaseService.getDatabaseById(req.params.id, {
      limit: Number(limit),
      offset: Number(offset),
      search: String(search || '')
    });
    if (!data) {
      return res.status(404).json({ error: 'Database not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download verbatim uploaded spreadsheet file from disk
app.get('/api/databases/:id/download', (req, res) => {
  try {
    const dbRow = db.prepare('SELECT filename, file_path FROM databases WHERE id = ?').get(req.params.id);
    if (!dbRow || !dbRow.file_path || !fs.existsSync(dbRow.file_path)) {
      return res.status(404).json({ error: 'Database file not found on disk.' });
    }
    res.download(dbRow.file_path, dbRow.filename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Choose which rows of a database the attached campaign will email
app.post('/api/databases/:id/included', (req, res) => {
  try {
    const result = databaseService.setIncludedRecords(req.params.id, req.body.ids);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete an isolated database
app.delete('/api/databases/:id', (req, res) => {
  try {
    const result = databaseService.deleteDatabase(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// Reusable Templates Endpoints (Phase 10)
// ==========================================

// List all reusable templates
app.get('/api/templates', (req, res) => {
  try {
    const templates = templateService.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template
app.get('/api/templates/:id', (req, res) => {
  try {
    const template = templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new template
app.post('/api/templates', (req, res) => {
  try {
    const template = templateService.createTemplate(req.body);
    res.json({ success: true, template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update existing template
app.put('/api/templates/:id', (req, res) => {
  try {
    const template = templateService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
  try {
    const result = templateService.deleteTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Duplicate a template
app.post('/api/templates/:id/duplicate', (req, res) => {
  try {
    const cloned = templateService.duplicateTemplate(req.params.id);
    res.json({ success: true, template: cloned, message: 'Template duplicated.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Store template attachment files; template save persists the returned metadata
const attachmentUpload = multer({
  dest: templateService.ATTACHMENTS_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }
});
app.post('/api/attachments', attachmentUpload.array('files'), (req, res) => {
  res.json((req.files || []).map(f => ({
    name: Buffer.from(f.originalname, 'latin1').toString('utf8'),
    file: f.filename,
    size: f.size
  })));
});

// Run real-time spam analysis on subject and body
app.post('/api/templates/spam-check', (req, res) => {
  const { subject, body } = req.body;
  const analysis = templateService.checkSpam(subject || '', body || '');
  res.json(analysis);
});

// Render template preview with sample lead data (supports pulling sample from database)
app.post('/api/templates/preview', (req, res) => {
  try {
    const { subject, body, databaseId, contactId, sampleData } = req.body;
    let rowData = sampleData;

    if (!rowData && databaseId) {
      const rec = db.prepare('SELECT custom_fields, email, first_name, company FROM database_records WHERE database_id = ? LIMIT 1').get(databaseId);
      if (rec) {
        let custom = {};
        try { custom = JSON.parse(rec.custom_fields || '{}'); } catch {}
        rowData = {
          ...custom,
          email: rec.email,
          Email: rec.email,
          first_name: rec.first_name,
          FirstName: rec.first_name,
          company: rec.company,
          Company: rec.company
        };
      }
    }

    if (!rowData && contactId) {
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

// ==========================================
// Campaigns & Triad Management Endpoints
// ==========================================

// List all campaigns with attached database & template metadata
app.get('/api/campaigns', (req, res) => {
  try {
    const campaigns = db.prepare(`
      SELECT 
        c.*,
        d.name as database_name,
        d.filename as database_filename,
        d.row_count as database_row_count,
        d.headers as database_headers,
        t.name as template_name
      FROM campaigns c
      LEFT JOIN databases d ON c.database_id = d.id
      LEFT JOIN templates t ON c.template_id = t.id
      ORDER BY c.id DESC
    `).all();

    const enriched = campaigns.map(c => {
      let totalContacts = c.total_contacts || 0;
      let sentCount = c.sent_count || 0;
      let failedCount = c.failed_count || 0;

      if (c.database_id) {
        databaseService.reopenUnusedDatabase(c.database_id, c.id);
        const stats = databaseService.getIncludedStats(c.database_id);

        if (stats) {
          totalContacts = stats.total || 0;
          sentCount = stats.sent || 0;
          failedCount = stats.failed || 0;
        }
      }

      return {
        ...c,
        total_contacts: totalContacts,
        sent_count: sentCount,
        failed_count: failedCount,
        database_headers: c.database_headers ? JSON.parse(c.database_headers) : []
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new campaign with optional attached database and template
app.post('/api/campaigns', (req, res) => {
  try {
    const { name, database_id, template_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Campaign name is required.' });
    }

    const now = new Date().toISOString();
    let initialContacts = 0;

    if (database_id) {
      const dbInfo = db.prepare('SELECT * FROM databases WHERE id = ?').get(database_id);
      if (!dbInfo) {
        return res.status(400).json({ success: false, message: 'Selected database not found.' });
      }
      if (dbInfo.campaign_id) {
        const previous = db.prepare('SELECT name, status FROM campaigns WHERE id = ?').get(dbInfo.campaign_id);
        if (previous && previous.status === 'RUNNING') {
          return res.status(400).json({ success: false, message: `Stop "${previous.name}" before using this database on another campaign.` });
        }
      }
      initialContacts = dbInfo.row_count || 0;
    }

    let subject_a = '';
    let body_a = '';
    let subject_b = '';
    let body_b = '';
    let is_ab_test = 0;

    if (template_id) {
      const tmpl = templateService.getTemplateById(template_id);
      if (tmpl) {
        subject_a = tmpl.subject_a;
        body_a = tmpl.body_a;
        subject_b = tmpl.subject_b;
        body_b = tmpl.body_b;
        is_ab_test = tmpl.is_ab_test;
      }
    }

    const result = db.prepare(`
      INSERT INTO campaigns (
        name, status, created_at, updated_at, database_id, template_id,
        total_contacts, subject_a, body_a, subject_b, body_b, is_ab_test
      ) VALUES (?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      now,
      now,
      database_id || null,
      template_id || null,
      initialContacts,
      subject_a,
      body_a,
      subject_b,
      body_b,
      is_ab_test
    );

    const campaignId = result.lastInsertRowid;

    if (database_id) {
      databaseService.attachDatabaseToCampaign(database_id, campaignId);
    }

    res.json({ success: true, campaignId, message: 'Campaign created successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get campaign by ID with its attached database columns and template
app.get('/api/campaigns/:id', (req, res) => {
  try {
    const campaign = db.prepare(`
      SELECT 
        c.*,
        d.name as database_name,
        d.filename as database_filename,
        d.row_count as database_row_count,
        d.headers as database_headers,
        t.name as template_name
      FROM campaigns c
      LEFT JOIN databases d ON c.database_id = d.id
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.database_id) {
      databaseService.reopenUnusedDatabase(campaign.database_id, campaign.id);
      const stats = databaseService.getIncludedStats(campaign.database_id);

      if (stats) {
        campaign.total_contacts = stats.total || 0;
        campaign.sent_count = stats.sent || 0;
        campaign.failed_count = stats.failed || 0;
      }
    }

    let sampleHeaders = ['FirstName', 'LastName', 'Email', 'Company'];
    if (campaign.database_headers) {
      try {
        sampleHeaders = JSON.parse(campaign.database_headers);
      } catch {}
    } else {
      const sampleContact = db.prepare('SELECT * FROM contacts WHERE campaign_id = ? LIMIT 1').get(campaign.id);
      if (sampleContact && sampleContact.custom_fields) {
        try {
          sampleHeaders = Object.keys(JSON.parse(sampleContact.custom_fields));
        } catch {}
      }
    }

    res.json({ campaign, sampleHeaders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Attach a database to campaign (1:1 exclusivity)
app.post('/api/campaigns/:id/attach-database', (req, res) => {
  try {
    const { databaseId } = req.body;
    if (!databaseId) {
      return res.status(400).json({ success: false, message: 'Database ID is required.' });
    }
    const result = databaseService.attachDatabaseToCampaign(databaseId, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Attach a template to campaign
app.post('/api/campaigns/:id/attach-template', (req, res) => {
  try {
    const { templateId } = req.body;
    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Template ID is required.' });
    }
    const result = templateService.attachTemplateToCampaign(templateId, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update CC / BCC addresses for a campaign
app.patch('/api/campaigns/:id/cc-bcc', (req, res) => {
  try {
    const id = Number(req.params.id);
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const cc = queueService.normalizeAddressList(req.body.cc_addresses);
    const bcc = queueService.normalizeAddressList(req.body.bcc_addresses);
    db.prepare(`
      UPDATE campaigns SET cc_addresses = ?, bcc_addresses = ?, updated_at = ? WHERE id = ?
    `).run(cc, bcc, new Date().toISOString(), id);

    res.json({
      success: true,
      message: 'CC/BCC addresses updated.',
      cc_addresses: cc,
      bcc_addresses: bcc
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Save template directly to campaign
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
// Multi-Step Drip Sequence Endpoints (Phase 11)
// ==========================================

// Get all drip sequence steps for a campaign
app.get('/api/campaigns/:id/drip-steps', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const steps = db.prepare(`
      SELECT s.*, t.name as template_name
      FROM campaign_drip_steps s
      LEFT JOIN templates t ON s.template_id = t.id
      WHERE s.campaign_id = ?
      ORDER BY s.step_number ASC
    `).all(campaignId);

    // If no steps configured yet, synthesize Step 1 from campaign defaults
    if (!steps || steps.length === 0) {
      const defaultStep1 = {
        id: null,
        campaign_id: campaignId,
        step_number: 1,
        delay_days: 0,
        delay_hours: 0,
        template_id: campaign.template_id || null,
        template_name: null,
        subject_a: campaign.subject_a || '',
        body_a: campaign.body_a || '',
        subject_b: campaign.subject_b || '',
        body_b: campaign.body_b || '',
        thread_reply: 1,
        is_active: 1
      };
      if (campaign.template_id) {
        const tmpl = db.prepare('SELECT name FROM templates WHERE id = ?').get(campaign.template_id);
        if (tmpl) defaultStep1.template_name = tmpl.name;
      }
      return res.json({ success: true, steps: [defaultStep1] });
    }

    res.json({ success: true, steps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save / update all drip sequence steps for a campaign
app.post('/api/campaigns/:id/drip-steps', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const { steps } = req.body;
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ success: false, message: 'Steps array is required.' });
    }

    const now = new Date().toISOString();

    const saveTx = db.transaction((stepsList) => {
      // Clear existing steps for clean state
      db.prepare('DELETE FROM campaign_drip_steps WHERE campaign_id = ?').run(campaignId);

      const insertStmt = db.prepare(`
        INSERT INTO campaign_drip_steps (
          campaign_id, step_number, delay_days, delay_hours, template_id,
          subject_a, body_a, subject_b, body_b, thread_reply, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const step of stepsList) {
        const stepNum = Number(step.step_number) || 1;
        const delayDays = stepNum === 1 ? 0 : Math.max(0, Number(step.delay_days) || 0);
        const delayHours = stepNum === 1 ? 0 : Math.max(0, Number(step.delay_hours) || 0);
        const templateId = step.template_id ? Number(step.template_id) : null;
        const subjectA = String(step.subject_a || '').trim();
        const bodyA = String(step.body_a || '');
        const subjectB = String(step.subject_b || '').trim();
        const bodyB = String(step.body_b || '');
        const threadReply = step.thread_reply !== undefined ? (step.thread_reply ? 1 : 0) : 1;
        const isActive = step.is_active !== undefined ? (step.is_active ? 1 : 0) : 1;

        insertStmt.run(
          campaignId, stepNum, delayDays, delayHours, templateId,
          subjectA, bodyA, subjectB, bodyB, threadReply, isActive,
          now, now
        );

        // Sync Step 1 back to campaign for 100% backward compatibility
        if (stepNum === 1) {
          db.prepare(`
            UPDATE campaigns 
            SET subject_a = ?, body_a = ?, subject_b = ?, body_b = ?, template_id = ?, updated_at = ?
            WHERE id = ?
          `).run(subjectA, bodyA, subjectB, bodyB, templateId, now, campaignId);
        }
      }
    });

    saveTx(steps);

    const savedSteps = db.prepare(`
      SELECT s.*, t.name as template_name
      FROM campaign_drip_steps s
      LEFT JOIN templates t ON s.template_id = t.id
      WHERE s.campaign_id = ?
      ORDER BY s.step_number ASC
    `).all(campaignId);

    res.json({ success: true, message: 'Drip sequence steps saved successfully.', steps: savedSteps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a specific follow-up step
app.delete('/api/campaigns/:id/drip-steps/:stepNumber', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const stepNumber = Number(req.params.stepNumber);
    if (stepNumber <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete Step 1 (Initial send).' });
    }

    db.prepare('DELETE FROM campaign_drip_steps WHERE campaign_id = ? AND step_number = ?')
      .run(campaignId, stepNumber);

    res.json({ success: true, message: `Step ${stepNumber} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send an isolated test preview of a specific drip step
app.post('/api/campaigns/:id/send-step-test', async (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const { stepNumber, recipientEmail, sender_provider } = req.body || {};

    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    const result = await queueService.sendTestEmail(
      campaignId,
      recipientEmail.trim(),
      sender_provider || null,
      Number(stepNumber) || 1
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics
// ==========================================

// Trigger IMAP inbox reply scan (manual or scoped to campaign)
app.post('/api/replies/scan', async (req, res) => {
  try {
    const { campaignId, lookbackDays } = req.body || {};
    const result = await replyScannerService.scanInboxForReplies({
      campaignId: campaignId ? Number(campaignId) : null,
      lookbackDays: lookbackDays ? Number(lookbackDays) : 14
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current scanner status and last scan results
app.get('/api/replies/status', (req, res) => {
  res.json(replyScannerService.getScanStatus());
});

// Get recorded reply logs for a specific campaign
app.get('/api/campaigns/:id/replies', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const replies = replyScannerService.getCampaignReplies(campaignId);
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual 1-click override: Mark lead as REPLIED and halt follow-ups
app.post('/api/campaigns/:id/records/:recordId/mark-replied', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const recordId = Number(req.params.recordId);
    const isContact = req.query.isContact === 'true';
    const updated = replyScannerService.markLeadRepliedManually(recordId, campaignId, isContact);
    res.json({ success: true, message: 'Lead marked as REPLIED and follow-up sequence halted.', record: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manual 1-click override: Cancel pending follow-ups
app.post('/api/campaigns/:id/records/:recordId/cancel-followup', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const recordId = Number(req.params.recordId);
    const isContact = req.query.isContact === 'true';
    const updated = replyScannerService.cancelFollowupsManually(recordId, campaignId, isContact);
    res.json({ success: true, message: 'Pending follow-up cancelled for lead.', record: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Visual conversion funnel analytics for multi-step campaigns
app.get('/api/campaigns/:id/funnel-stats', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const steps = db.prepare(`
      SELECT * FROM campaign_drip_steps 
      WHERE campaign_id = ? 
      ORDER BY step_number ASC
    `).all(campaignId);

    let totalAudience = 0;
    let repliedCount = 0;
    let cancelledCount = 0;
    let failedCount = 0;
    let step2Scheduled = 0;
    let step3Scheduled = 0;

    if (campaign.database_id) {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'REPLIED' THEN 1 ELSE 0 END) as replied,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'PENDING' AND current_step = 2 AND next_step_scheduled_at IS NOT NULL THEN 1 ELSE 0 END) as s2_sched,
          SUM(CASE WHEN status = 'PENDING' AND current_step = 3 AND next_step_scheduled_at IS NOT NULL THEN 1 ELSE 0 END) as s3_sched
        FROM database_records 
        WHERE database_id = ? AND included = 1
      `).get(campaign.database_id);

      totalAudience = stats?.total || 0;
      repliedCount = stats?.replied || 0;
      cancelledCount = stats?.cancelled || 0;
      failedCount = stats?.failed || 0;
      step2Scheduled = stats?.s2_sched || 0;
      step3Scheduled = stats?.s3_sched || 0;
    } else {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'REPLIED' THEN 1 ELSE 0 END) as replied,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'PENDING' AND current_step = 2 AND next_step_scheduled_at IS NOT NULL THEN 1 ELSE 0 END) as s2_sched,
          SUM(CASE WHEN status = 'PENDING' AND current_step = 3 AND next_step_scheduled_at IS NOT NULL THEN 1 ELSE 0 END) as s3_sched
        FROM contacts 
        WHERE campaign_id = ?
      `).get(campaignId);

      totalAudience = stats?.total || 0;
      repliedCount = stats?.replied || 0;
      cancelledCount = stats?.cancelled || 0;
      failedCount = stats?.failed || 0;
      step2Scheduled = stats?.s2_sched || 0;
      step3Scheduled = stats?.s3_sched || 0;
    }

    // Step email logs counts
    const stepLogs = db.prepare(`
      SELECT 
        step_number,
        COUNT(DISTINCT coalesce(database_record_id, contact_id, recipient_email)) as sent_count
      FROM email_logs
      WHERE campaign_id = ? AND status = 'SENT'
      GROUP BY step_number
    `).all(campaignId);

    const stepSentMap = {};
    stepLogs.forEach(s => {
      stepSentMap[s.step_number || 1] = s.sent_count;
    });

    const step1Sent = stepSentMap[1] || (campaign.sent_count || 0);
    const step2Sent = stepSentMap[2] || 0;
    const step3Sent = stepSentMap[3] || 0;

    // Conversion rate calculations
    const step1Rate = totalAudience > 0 ? Number(((step1Sent / totalAudience) * 100).toFixed(1)) : 0;
    const step2Rate = step1Sent > 0 ? Number(((step2Sent / step1Sent) * 100).toFixed(1)) : 0;
    const step3Rate = step2Sent > 0 ? Number(((step3Sent / step2Sent) * 100).toFixed(1)) : 0;
    const replyRate = step1Sent > 0 
      ? Number(((repliedCount / step1Sent) * 100).toFixed(1)) 
      : (totalAudience > 0 ? Number(((repliedCount / totalAudience) * 100).toFixed(1)) : 0);

    res.json({
      campaignId,
      campaignName: campaign.name,
      totalAudience,
      step1Sent,
      step2Sent,
      step3Sent,
      step2Scheduled,
      step3Scheduled,
      repliedCount,
      cancelledCount,
      failedCount,
      rates: {
        step1: step1Rate,
        step2: step2Rate,
        step3: step3Rate,
        reply: replyRate
      },
      stepsConfigured: steps.map(s => ({
        stepNumber: s.step_number,
        delayDays: s.delay_days,
        delayHours: s.delay_hours,
        threadReply: !!s.thread_reply,
        isActive: !!s.is_active
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Downloadable RFC 4180 CSV audit export for campaign leads with multi-step & reply tracing
app.get('/api/campaigns/:id/export-audit', (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let records = [];
    if (campaign.database_id) {
      records = db.prepare(`
        SELECT id, email, first_name, company, status, current_step, next_step_scheduled_at, replied_at, sent_at
        FROM database_records
        WHERE database_id = ? AND included = 1
        ORDER BY id ASC
      `).all(campaign.database_id);
    } else {
      records = db.prepare(`
        SELECT id, email, first_name, company, status, current_step, next_step_scheduled_at, replied_at, sent_at
        FROM contacts
        WHERE campaign_id = ?
        ORDER BY id ASC
      `).all(campaignId);
    }

    // Pre-fetch all sent step logs for this campaign for fast in-memory indexing
    const sentLogs = db.prepare(`
      SELECT database_record_id, contact_id, recipient_email, step_number, sent_at
      FROM email_logs
      WHERE campaign_id = ? AND status = 'SENT'
      ORDER BY id ASC
    `).all(campaignId);

    const stepLogsMap = new Map();
    sentLogs.forEach(log => {
      const key = log.database_record_id || log.contact_id || log.recipient_email?.toLowerCase();
      if (!stepLogsMap.has(key)) {
        stepLogsMap.set(key, {});
      }
      stepLogsMap.get(key)[log.step_number || 1] = log.sent_at;
    });

    // Pre-fetch reply logs for this campaign
    const replyLogs = db.prepare(`
      SELECT database_record_id, contact_id, sender_email, subject, received_at, is_auto_reply
      FROM reply_logs
      WHERE campaign_id = ? AND is_auto_reply = 0
      ORDER BY id DESC
    `).all(campaignId);

    const replyMap = new Map();
    replyLogs.forEach(r => {
      const key = r.database_record_id || r.contact_id || r.sender_email?.toLowerCase();
      if (!replyMap.has(key)) {
        replyMap.set(key, r);
      }
    });

    const escapeCsv = (val) => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;

    let csvContent = [
      'Email',
      'First Name',
      'Company',
      'Status',
      'Current Step',
      'Next Step Scheduled At',
      'Step 1 Sent At',
      'Step 2 Sent At',
      'Step 3 Sent At',
      'Replied At',
      'Reply Subject'
    ].map(escapeCsv).join(',') + '\r\n';

    records.forEach(rec => {
      const key = rec.id;
      const emailKey = rec.email ? rec.email.toLowerCase() : '';
      const stepTimes = stepLogsMap.get(key) || stepLogsMap.get(emailKey) || {};
      const replyData = replyMap.get(key) || replyMap.get(emailKey) || null;

      const step1Time = stepTimes[1] || rec.sent_at || '';
      const step2Time = stepTimes[2] || '';
      const step3Time = stepTimes[3] || '';
      const repliedTime = rec.replied_at || replyData?.received_at || '';
      const replySubject = replyData?.subject || (rec.status === 'REPLIED' ? '[Replied]' : '');

      const row = [
        rec.email,
        rec.first_name || '',
        rec.company || '',
        rec.status || 'PENDING',
        rec.current_step || 1,
        rec.next_step_scheduled_at || '',
        step1Time,
        step2Time,
        step3Time,
        repliedTime,
        replySubject
      ];

      csvContent += row.map(escapeCsv).join(',') + '\r\n';
    });

    const filename = `campaign-${campaign.id}-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a campaign
app.delete('/api/campaigns/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const campaign = db.prepare('SELECT status, database_id FROM campaigns WHERE id = ?').get(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }
    if (campaign.status === 'RUNNING') {
      return res.status(400).json({ success: false, message: 'Cannot delete a currently RUNNING campaign. Stop it first.' });
    }

    // Stop active in-memory job if present
    queueService.stopCampaign(id);

    // Safely unbind attached database without wiping out user's database records
    if (campaign.database_id) {
      db.prepare('UPDATE databases SET campaign_id = NULL, is_attached = 0 WHERE id = ?').run(campaign.database_id);
      db.prepare('UPDATE database_records SET campaign_id = NULL WHERE database_id = ?').run(campaign.database_id);
    }

    db.prepare('DELETE FROM campaign_drip_steps WHERE campaign_id = ?').run(id);
    db.prepare('DELETE FROM email_logs WHERE campaign_id = ?').run(id);
    db.prepare('DELETE FROM contacts WHERE campaign_id = ?').run(id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);

    res.json({ success: true, message: 'Campaign deleted successfully.' });
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
    const { bypassHours, sender_provider } = req.body || {};
    if (sender_provider) {
      db.prepare('UPDATE campaigns SET sender_provider = ? WHERE id = ?').run(sender_provider, req.params.id);
    }
    const result = queueService.startCampaign(req.params.id, { 
      bypassHours: bypassHours !== undefined ? !!bypassHours : true,
      sender_provider
    });
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

// Resume campaign dispatch
app.post('/api/campaigns/:id/resume', (req, res) => {
  try {
    const { bypassHours, sender_provider } = req.body || {};
    if (sender_provider) {
      db.prepare('UPDATE campaigns SET sender_provider = ? WHERE id = ?').run(sender_provider, req.params.id);
    }
    const result = queueService.startCampaign(req.params.id, { 
      bypassHours: bypassHours !== undefined ? !!bypassHours : true,
      sender_provider
    });
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
    const { testRecipient, sender_provider } = req.body;
    if (!testRecipient) {
      return res.status(400).json({ success: false, message: 'Test recipient email is required.' });
    }
    const result = await queueService.sendTestEmail(req.params.id, testRecipient, sender_provider);
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

// Periodic background scan for inbound replies every 5 minutes when active campaigns exist
setInterval(async () => {
  try {
    const activeCount = db.prepare(
      "SELECT COUNT(*) as count FROM campaigns WHERE status IN ('RUNNING', 'WAITING_SCHEDULE')"
    ).get().count;

    if (activeCount > 0) {
      await replyScannerService.scanInboxForReplies();
    }
  } catch (pollErr) {
    console.warn('[StrokeCRM] Periodic IMAP reply check notice:', pollErr.message);
  }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[StrokeCRM] Server running on http://localhost:${PORT}`);
});
