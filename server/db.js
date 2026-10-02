const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'strokecrm.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & reliability
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'app_password', -- 'app_password' | 'oauth2'
    email TEXT UNIQUE NOT NULL,
    app_password TEXT,
    oauth_client_id TEXT,
    oauth_client_secret TEXT,
    oauth_refresh_token TEXT,
    is_active INTEGER DEFAULT 1,
    verified INTEGER DEFAULT 0,
    last_verified_at TEXT,
    daily_sent_count INTEGER DEFAULT 0,
    last_reset_date TEXT
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sender_account_id INTEGER,
    subject_a TEXT DEFAULT '',
    body_a TEXT DEFAULT '',
    subject_b TEXT DEFAULT '',
    body_b TEXT DEFAULT '',
    is_ab_test INTEGER DEFAULT 0,
    min_delay INTEGER DEFAULT 45,
    max_delay INTEGER DEFAULT 90,
    daily_limit INTEGER DEFAULT 100,
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    FOREIGN KEY (sender_account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    company TEXT,
    custom_fields TEXT, -- JSON string of all row headers & values
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SENDING', 'SENT', 'FAILED', 'REPLIED', 'SKIPPED'
    assigned_variant TEXT DEFAULT 'A', -- 'A' or 'B'
    sent_at TEXT,
    message_id TEXT,
    error_message TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    contact_id INTEGER,
    recipient_email TEXT NOT NULL,
    variant TEXT DEFAULT 'A',
    subject TEXT,
    status TEXT NOT NULL, -- 'SENT', 'FAILED'
    error_message TEXT,
    sent_at TEXT NOT NULL,
    sent_date TEXT NOT NULL, -- 'YYYY-MM-DD'
    message_id TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
  );
`);

// Insert default settings if not present
const defaultSettings = [
  ['daily_limit', '100'],
  ['min_delay_sec', '45'],
  ['max_delay_sec', '90'],
  ['start_hour', '09:00'],
  ['end_hour', '18:00'],
  ['active_days', JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])],
  ['gmail_quota_type', 'personal'] // 'personal' (500) | 'workspace' (2000)
];

const insertSettingStmt = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value, updated_at) 
  VALUES (?, ?, ?)
`);

for (const [key, val] of defaultSettings) {
  insertSettingStmt.run(key, val, new Date().toISOString());
}

module.exports = db;
