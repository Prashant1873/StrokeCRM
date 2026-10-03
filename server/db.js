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
    included INTEGER NOT NULL DEFAULT 1, -- 0 = left out of the campaign that uses this database
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

  CREATE TABLE IF NOT EXISTS campaign_drip_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL, -- 1 = Initial, 2 = Follow-up 1, 3 = Follow-up 2
    delay_days INTEGER NOT NULL DEFAULT 3,
    delay_hours INTEGER NOT NULL DEFAULT 0,
    template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
    subject_a TEXT DEFAULT '',
    body_a TEXT DEFAULT '',
    subject_b TEXT DEFAULT '',
    body_b TEXT DEFAULT '',
    thread_reply INTEGER DEFAULT 1, -- 1 = thread as Re: previous, 0 = standalone
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, step_number)
  );

  CREATE TABLE IF NOT EXISTS reply_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    database_record_id INTEGER,
    contact_id INTEGER,
    sender_email TEXT NOT NULL,
    subject TEXT DEFAULT '',
    snippet TEXT DEFAULT '',
    in_reply_to TEXT,
    message_id TEXT,
    is_auto_reply INTEGER DEFAULT 0,
    received_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
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
  const templateColumns = db.prepare("PRAGMA table_info(templates)").all().map(c => c.name);
  if (!templateColumns.includes('attachments')) {
    db.exec("ALTER TABLE templates ADD COLUMN attachments TEXT DEFAULT '[]'"); // JSON [{ name, file, size }]
  }
  const recordColumns = db.prepare("PRAGMA table_info(database_records)").all().map(c => c.name);
  if (!recordColumns.includes('included')) {
    db.exec("ALTER TABLE database_records ADD COLUMN included INTEGER NOT NULL DEFAULT 1");
  }
  if (!campaignColumns.includes('sender_provider')) {
    db.exec("ALTER TABLE campaigns ADD COLUMN sender_provider TEXT DEFAULT 'default'");
  }

  // Phase 11: Multi-Step Drip Sequence Columns
  if (!recordColumns.includes('current_step')) {
    db.exec("ALTER TABLE database_records ADD COLUMN current_step INTEGER DEFAULT 1");
  }
  if (!recordColumns.includes('initial_message_id')) {
    db.exec("ALTER TABLE database_records ADD COLUMN initial_message_id TEXT");
  }
  if (!recordColumns.includes('next_step_scheduled_at')) {
    db.exec("ALTER TABLE database_records ADD COLUMN next_step_scheduled_at TEXT");
  }

  const contactColumns = db.prepare("PRAGMA table_info(contacts)").all().map(c => c.name);
  if (!contactColumns.includes('current_step')) {
    db.exec("ALTER TABLE contacts ADD COLUMN current_step INTEGER DEFAULT 1");
  }
  if (!contactColumns.includes('initial_message_id')) {
    db.exec("ALTER TABLE contacts ADD COLUMN initial_message_id TEXT");
  }
  if (!contactColumns.includes('next_step_scheduled_at')) {
    db.exec("ALTER TABLE contacts ADD COLUMN next_step_scheduled_at TEXT");
  }

  const logColumns = db.prepare("PRAGMA table_info(email_logs)").all().map(c => c.name);
  if (!logColumns.includes('step_number')) {
    db.exec("ALTER TABLE email_logs ADD COLUMN step_number INTEGER DEFAULT 1");
  }

  // Phase 12: Inbound Reply Scanner & Tracking Columns
  if (!recordColumns.includes('replied_at')) {
    db.exec("ALTER TABLE database_records ADD COLUMN replied_at TEXT");
  }
  if (!contactColumns.includes('replied_at')) {
    db.exec("ALTER TABLE contacts ADD COLUMN replied_at TEXT");
  }
  if (!campaignColumns.includes('reply_count')) {
    db.exec("ALTER TABLE campaigns ADD COLUMN reply_count INTEGER DEFAULT 0");
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
  ['gmail_quota_type', 'personal'], // 'personal' (500) | 'workspace' (2000)
  ['active_provider', 'gmail_app_password'], // 'gmail_app_password' | 'oauth2' | 'custom_domain'
  ['custom_sender_name', ''],
  ['custom_sender_email', ''],
  ['custom_smtp_host', ''],
  ['custom_smtp_port', '587'],
  ['custom_smtp_secure', '0'],
  ['custom_smtp_user', ''],
  ['custom_smtp_pass', ''],
  ['custom_imap_host', ''],
  ['custom_imap_port', '993'],
  ['custom_imap_secure', '1'],
  ['custom_imap_user', ''],
  ['custom_imap_pass', '']
];

const insertSettingStmt = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value, updated_at) 
  VALUES (?, ?, ?)
`);

for (const [key, val] of defaultSettings) {
  insertSettingStmt.run(key, val, new Date().toISOString());
}

/**
 * Retrieve all settings as a key-value object
 */
db.getSettings = function() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  });
  return settings;
};

/**
 * Update multiple settings atomically
 */
db.updateSettings = function(settingsObj) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const updateTx = db.transaction((obj) => {
    for (const [key, val] of Object.entries(obj)) {
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      stmt.run(key, strVal, new Date().toISOString());
    }
  });
  updateTx(settingsObj);
  return db.getSettings();
};

module.exports = db;

