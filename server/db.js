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
    database_record_id INTEGER,
    recipient_email TEXT NOT NULL,
    variant TEXT DEFAULT 'A',
    subject TEXT,
    status TEXT NOT NULL, -- 'SENT', 'FAILED'
    error_message TEXT,
    sent_at TEXT NOT NULL,
    sent_date TEXT NOT NULL, -- 'YYYY-MM-DD'
    message_id TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS databases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT,
    headers TEXT NOT NULL, -- JSON array of strings
    row_count INTEGER DEFAULT 0,
    valid_email_count INTEGER DEFAULT 0,
    email_column TEXT NOT NULL,
    first_name_column TEXT,
    company_column TEXT,
    created_at TEXT NOT NULL,
    campaign_id INTEGER UNIQUE,
    is_attached INTEGER DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS database_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    database_id INTEGER NOT NULL,
    campaign_id INTEGER,
    email TEXT NOT NULL,
    first_name TEXT,
    company TEXT,
    custom_fields TEXT, -- JSON string of all row headers & values
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SENDING', 'SENT', 'FAILED', 'REPLIED', 'SKIPPED'
    assigned_variant TEXT DEFAULT 'A', -- 'A' or 'B'
    sent_at TEXT,
    message_id TEXT,
    error_message TEXT,
    FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject_a TEXT DEFAULT '',
    body_a TEXT DEFAULT '',
    subject_b TEXT DEFAULT '',
    body_b TEXT DEFAULT '',
    is_ab_test INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Create physical storage directory for database files
const databasesStorageDir = path.resolve(dataDir, 'databases');
if (!fs.existsSync(databasesStorageDir)) {
  fs.mkdirSync(databasesStorageDir, { recursive: true });
}

// Add columns to campaigns table if they don't already exist
try {
  const campaignColumns = db.prepare("PRAGMA table_info(campaigns)").all().map(c => c.name);
  if (!campaignColumns.includes('database_id')) {
    db.exec("ALTER TABLE campaigns ADD COLUMN database_id INTEGER REFERENCES databases(id) ON DELETE SET NULL");
  }
  if (!campaignColumns.includes('template_id')) {
    db.exec("ALTER TABLE campaigns ADD COLUMN template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL");
  }
  if (!campaignColumns.includes('cc_addresses')) {
    db.exec("ALTER TABLE campaigns ADD COLUMN cc_addresses TEXT DEFAULT ''");
  }
  if (!campaignColumns.includes('bcc_addresses')) {
    db.exec("ALTER TABLE campaigns ADD COLUMN bcc_addresses TEXT DEFAULT ''");
  }
} catch (e) {
  console.warn('Column migration notice:', e.message);
}

// Ensure email_logs does not have restrictive FK on contact_id and has database_record_id
try {
  const fks = db.prepare('PRAGMA foreign_key_list(email_logs)').all();
  const hasContactFk = fks.some(fk => fk.table === 'contacts');
  const cols = db.prepare('PRAGMA table_info(email_logs)').all().map(c => c.name);
  if (hasContactFk || !cols.includes('database_record_id')) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_logs_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER,
        contact_id INTEGER,
        database_record_id INTEGER,
        recipient_email TEXT NOT NULL,
        variant TEXT DEFAULT 'A',
        subject TEXT,
        status TEXT NOT NULL,
        error_message TEXT,
        sent_at TEXT NOT NULL,
        sent_date TEXT NOT NULL,
        message_id TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      );
      INSERT INTO email_logs_migrated (id, campaign_id, contact_id, recipient_email, variant, subject, status, error_message, sent_at, sent_date, message_id)
      SELECT id, campaign_id, contact_id, recipient_email, variant, subject, status, error_message, sent_at, sent_date, message_id FROM email_logs;
      DROP TABLE email_logs;
      ALTER TABLE email_logs_migrated RENAME TO email_logs;
    `);
    db.pragma('foreign_keys = ON');
  }
} catch (e) {
  console.warn('email_logs migration notice:', e.message);
}

// Seed default template if templates table is empty
const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get().count;
if (templateCount === 0) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO templates (name, subject_a, body_a, subject_b, body_b, is_ab_test, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    'Quick Introduction & Value Hook',
    'Quick question regarding {{Company}}',
    'Hi {{FirstName | "there"}},\n\nSaw what your team is building at {{Company}} and was really impressed. Would love to share a quick 2-minute overview of how we help teams like yours streamline outreach without monthly subscription fees.\n\nOpen to a brief chat this week?\n\nBest regards,',
    '',
    '',
    now,
    now
  );
}

// Seamless migration of legacy contacts into isolated database if needed
const existingDatabasesCount = db.prepare('SELECT COUNT(*) as count FROM databases').get().count;
const existingContactsCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
if (existingDatabasesCount === 0 && existingContactsCount > 0) {
  try {
    const legacyContacts = db.prepare('SELECT * FROM contacts ORDER BY id ASC').all();
    const firstRowCustom = legacyContacts[0]?.custom_fields ? JSON.parse(legacyContacts[0].custom_fields) : {};
    const headers = Object.keys(firstRowCustom).length > 0 
      ? Object.keys(firstRowCustom) 
      : ['FirstName', 'LastName', 'Email', 'Company'];
    const now = new Date().toISOString();

    const dbInsert = db.prepare(`
      INSERT INTO databases (name, filename, file_path, headers, row_count, valid_email_count, email_column, first_name_column, company_column, created_at, is_attached)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      'Primary Outreach Database (Imported)',
      'initial_contacts.csv',
      null,
      JSON.stringify(headers),
      legacyContacts.length,
      legacyContacts.length,
      'Email',
      'FirstName',
      'Company',
      now
    );

    const newDbId = dbInsert.lastInsertRowid;
    const insertRecord = db.prepare(`
      INSERT INTO database_records (database_id, campaign_id, email, first_name, company, custom_fields, status, assigned_variant)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transferTx = db.transaction((records) => {
      for (const r of records) {
        insertRecord.run(newDbId, r.campaign_id || null, r.email, r.first_name, r.company, r.custom_fields, r.status || 'PENDING', r.assigned_variant || 'A');
      }
    });
    transferTx(legacyContacts);
  } catch (migErr) {
    console.warn('Legacy contacts migration notice:', migErr.message);
  }
}


// Insert default settings if not present
const defaultSettings = [
  ['daily_limit', '100'],
  ['min_delay_sec', '45'],
  ['max_delay_sec', '90'],
  ['start_hour', '09:00'],
  ['end_hour', '18:00'],
  ['enforce_schedule', '0'], // '0' = 24/7 on-demand dispatch, '1' = restrict to start_hour - end_hour
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
