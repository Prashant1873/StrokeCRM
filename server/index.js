const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const authService = require('./authService');
const leadService = require('./leadService');

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

app.listen(PORT, () => {
  console.log(`[StrokeCRM] Server running on http://localhost:${PORT}`);
});
