const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const authService = require('./authService');
const leadService = require('./leadService');
const databaseService = require('./databaseService');
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
        const stats = db.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
          FROM database_records WHERE database_id = ?
        `).get(c.database_id);

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
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
        FROM database_records WHERE database_id = ?
      `).get(campaign.database_id);

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
    const { bypassHours } = req.body || {};
    const result = queueService.startCampaign(req.params.id, { 
      bypassHours: bypassHours !== undefined ? !!bypassHours : true 
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
    const { bypassHours } = req.body || {};
    const result = queueService.startCampaign(req.params.id, { 
      bypassHours: bypassHours !== undefined ? !!bypassHours : true 
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
