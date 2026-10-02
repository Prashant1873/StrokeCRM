const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authService = require('./authService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
    // Return safe object without exposing raw app password
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
    let verificationMessage = '';

    if (type === 'app_password') {
      if (!app_password) {
        return res.status(400).json({ success: false, message: 'App Password is required.' });
      }
      const testRes = await authService.testSmtpConnection(email, app_password);
      if (!testRes.success) {
        return res.status(400).json({ success: false, message: testRes.message });
      }
      verified = true;
      verificationMessage = testRes.message;
    } else if (type === 'oauth2') {
      const testRes = await authService.testOAuthConnection(oauth_client_id, oauth_client_secret, oauth_refresh_token);
      if (!testRes.success) {
        return res.status(400).json({ success: false, message: testRes.message });
      }
      verified = true;
      verificationMessage = testRes.message;
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

app.listen(PORT, () => {
  console.log(`[StrokeCRM] Server running on http://localhost:${PORT}`);
});
