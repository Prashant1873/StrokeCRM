const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const db = require('./db');

const dataDir = path.resolve(__dirname, '../data');
const databasesStorageDir = path.join(dataDir, 'databases');

if (!fs.existsSync(databasesStorageDir)) {
  fs.mkdirSync(databasesStorageDir, { recursive: true });
}

/**
 * Validates email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Parses uploaded spreadsheet buffer (.xlsx, .xls, .csv)
 */
function parseSpreadsheet(buffer, filename) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Spreadsheet contains no sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('Spreadsheet is empty or has no data rows.');
  }

  // Extract all distinct headers across rows
  const headersSet = new Set();
  rows.forEach(row => {
    Object.keys(row).forEach(k => {
      const cleanKey = k.trim();
      if (cleanKey) headersSet.add(cleanKey);
    });
  });
  const headers = Array.from(headersSet);

  // Auto-detect columns
  let detectedEmail = '';
  let detectedFirstName = '';
  let detectedCompany = '';

  for (const h of headers) {
    const lower = h.toLowerCase().replace(/[_\s-]/g, '');
    if (!detectedEmail && (lower.includes('email') || lower.includes('mail'))) {
      detectedEmail = h;
    }
    if (!detectedFirstName && (lower === 'firstname' || lower === 'fname' || lower === 'first' || lower === 'name')) {
      detectedFirstName = h;
    }
    if (!detectedCompany && (lower.includes('company') || lower.includes('organization') || lower.includes('org') || lower.includes('business'))) {
      detectedCompany = h;
    }
  }

  // Data fallback heuristic for email if not detected by header name
  if (!detectedEmail) {
    for (const h of headers) {
      const sample = rows.slice(0, 5).map(r => String(r[h] || ''));
      if (sample.some(v => isValidEmail(v))) {
        detectedEmail = h;
        break;
      }
    }
  }

  const enrichedRows = rows.map((row, idx) => {
    const emailVal = detectedEmail ? String(row[detectedEmail] || '').trim() : '';
    const valid = isValidEmail(emailVal);
    return {
      _rowId: idx + 1,
      _validEmail: valid,
      ...row
    };
  });

  const validCount = enrichedRows.filter(r => r._validEmail).length;
  const invalidCount = enrichedRows.length - validCount;

  return {
    filename,
    headers,
    detectedFields: {
      email: detectedEmail,
      firstName: detectedFirstName,
      company: detectedCompany
    },
    totalRows: enrichedRows.length,
    validEmailCount: validCount,
    invalidEmailCount: invalidCount,
    sampleRows: enrichedRows.slice(0, 10),
    allRows: enrichedRows
  };
}

/**
 * Creates and persists a new isolated Database with verbatim file preservation on disk
 */
function createDatabase({ buffer, filename, customName, fieldMapping, deduplicate = true }) {
  const parsed = parseSpreadsheet(buffer, filename);
  const emailCol = fieldMapping?.email || parsed.detectedFields.email;
  const firstNameCol = fieldMapping?.firstName || parsed.detectedFields.firstName;
  const companyCol = fieldMapping?.company || parsed.detectedFields.company;

  if (!emailCol) {
    throw new Error('An email column must be selected.');
  }

  // 1. Physically persist raw file to data/databases/
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storedFilename = `${timestamp}_${sanitizedFilename}`;
  const diskPath = path.join(databasesStorageDir, storedFilename);
  fs.writeFileSync(diskPath, buffer);

  const databaseName = (customName && customName.trim()) 
    ? customName.trim() 
    : filename.replace(/\.[^/.]+$/, '');
  const now = new Date().toISOString();

  // 2. Insert into databases table
  const insertDbStmt = db.prepare(`
    INSERT INTO databases (
      name, filename, file_path, headers, row_count, valid_email_count,
      email_column, first_name_column, company_column, created_at, is_attached
    ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 0)
  `);

  const dbInfo = insertDbStmt.run(
    databaseName,
    filename,
    diskPath,
    JSON.stringify(parsed.headers),
    emailCol,
    firstNameCol || null,
    companyCol || null,
    now
  );
  const databaseId = dbInfo.lastInsertRowid;

  // 3. Insert records into database_records with optional deduplication
  const insertRecordStmt = db.prepare(`
    INSERT INTO database_records (
      database_id, email, first_name, company, custom_fields, status, assigned_variant
    ) VALUES (?, ?, ?, ?, ?, 'PENDING', 'A')
  `);

  let validInserted = 0;
  const seenEmails = new Set();

  const insertTx = db.transaction((rows) => {
    for (const row of rows) {
      const email = String(row[emailCol] || '').trim();
      if (!isValidEmail(email)) continue;

      const lowerEmail = email.toLowerCase();
      if (deduplicate && seenEmails.has(lowerEmail)) continue;
      seenEmails.add(lowerEmail);

      const firstName = firstNameCol ? String(row[firstNameCol] || '').trim() : '';
      const company = companyCol ? String(row[companyCol] || '').trim() : '';

      const cleanCustomFields = { ...row };
      delete cleanCustomFields._rowId;
      delete cleanCustomFields._validEmail;

      insertRecordStmt.run(
        databaseId,
        email,
        firstName || null,
        company || null,
        JSON.stringify(cleanCustomFields)
      );
      validInserted++;
    }

    db.prepare(`
      UPDATE databases 
      SET row_count = ?, valid_email_count = ? 
      WHERE id = ?
    `).run(validInserted, validInserted, databaseId);
  });

  insertTx(parsed.allRows);

  return {
    id: databaseId,
    name: databaseName,
    filename,
    filePath: diskPath,
    headers: parsed.headers,
    totalRows: validInserted,
    validEmailCount: validInserted
  };
}

/**
 * Counts only rows the current campaign will actually use
 */
function getIncludedStats(databaseId) {
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
    FROM database_records
    WHERE database_id = ? AND included = 1
  `).get(databaseId);
}

/**
 * Checks `ids` in and every other not-yet-sent row out.
 * Sent and in-flight rows stay included.
 */
function setIncludedRecords(databaseId, ids) {
  const database = db.prepare('SELECT campaign_id FROM databases WHERE id = ?').get(databaseId);
  if (!database) throw new Error('Database not found.');

  if (database.campaign_id) {
    const campaign = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(database.campaign_id);
    if (campaign && campaign.status === 'RUNNING') {
      throw new Error('Pause the campaign before changing which rows it uses.');
    }
  }

  const chosen = [...new Set((ids || []).map(Number).filter(n => Number.isInteger(n) && n > 0))];
  if (!chosen.length) throw new Error('Select at least one row.');

  const apply = db.transaction(() => {
    db.prepare(`
      UPDATE database_records
      SET included = CASE WHEN status IN ('SENT', 'SENDING') THEN 1 ELSE 0 END
      WHERE database_id = ?
    `).run(databaseId);
    const mark = db.prepare('UPDATE database_records SET included = 1 WHERE database_id = ? AND id = ?');
    for (const id of chosen) mark.run(databaseId, id);

    const stats = getIncludedStats(databaseId);
    if (database.campaign_id) {
      db.prepare(`
        UPDATE campaigns
        SET total_contacts = ?, sent_count = ?, failed_count = ?, updated_at = ?
        WHERE id = ?
      `).run(stats.total || 0, stats.sent || 0, stats.failed || 0, new Date().toISOString(), database.campaign_id);
    }
    return stats;
  });

  const stats = apply();
  const total = db.prepare('SELECT COUNT(*) as count FROM database_records WHERE database_id = ?').get(databaseId).count;
  return { included: stats.total || 0, total, pending: stats.pending || 0 };
}

/**
 * Returns all databases with attachment status and counts
 */
function getDatabases() {
  const rows = db.prepare(`
    SELECT 
      d.*,
      c.name as campaign_name,
      c.status as campaign_status
    FROM databases d
    LEFT JOIN campaigns c ON d.campaign_id = c.id
    ORDER BY d.id DESC
  `).all();

  return rows.map(r => ({
    ...r,
    headers: JSON.parse(r.headers || '[]')
  }));
}

/**
 * Gets a single database with its headers and paginated records
 */
function getDatabaseById(id, { limit = 100, offset = 0, search = '' } = {}) {
  const database = db.prepare(`
    SELECT 
      d.*,
      c.name as campaign_name,
      c.status as campaign_status
    FROM databases d
    LEFT JOIN campaigns c ON d.campaign_id = c.id
    WHERE d.id = ?
  `).get(id);

  if (!database) return null;

  database.headers = JSON.parse(database.headers || '[]');

  let query = 'SELECT * FROM database_records WHERE database_id = ?';
  let countQuery = 'SELECT COUNT(*) as count FROM database_records WHERE database_id = ?';
  const params = [id];
  const countParams = [id];

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    query += ' AND (email LIKE ? OR first_name LIKE ? OR company LIKE ?)';
    countQuery += ' AND (email LIKE ? OR first_name LIKE ? OR company LIKE ?)';
    params.push(q, q, q);
    countParams.push(q, q, q);
  }

  query += ' ORDER BY id ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const records = db.prepare(query).all(...params);
  const totalCount = db.prepare(countQuery).get(...countParams).count;

  return {
    database,
    records,
    totalCount
  };
}

/**
 * Deletes a database and cleans up disk file and child records
 */
function deleteDatabase(id) {
  const database = db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
  if (!database) {
    throw new Error('Database not found.');
  }

  if (database.campaign_id) {
    const campaign = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(database.campaign_id);
    if (campaign && campaign.status === 'RUNNING') {
      throw new Error('Cannot delete database while attached campaign is currently RUNNING. Pause or stop the campaign first.');
    }
    // Detach from campaign
    db.prepare('UPDATE campaigns SET database_id = NULL, total_contacts = 0 WHERE id = ?').run(database.campaign_id);
  }

  // Delete physical file if present
  if (database.file_path && fs.existsSync(database.file_path)) {
    try {
      fs.unlinkSync(database.file_path);
    } catch (e) {
      console.warn('Could not delete disk file:', e.message);
    }
  }

  // Delete records and database row (CASCADE)
  db.prepare('DELETE FROM database_records WHERE database_id = ?').run(id);
  db.prepare('DELETE FROM databases WHERE id = ?').run(id);

  return { success: true, message: `Database "${database.name}" deleted successfully.` };
}

/**
 * Strictly binds 1 Database to 1 Campaign (1:1 exclusivity)
 */
function attachDatabaseToCampaign(databaseId, campaignId) {
  const database = db.prepare('SELECT * FROM databases WHERE id = ?').get(databaseId);
  if (!database) {
    throw new Error('Database not found.');
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  const now = new Date().toISOString();

  // A list can move to a new campaign. A live send keeps the list until that campaign is stopped.
  if (database.campaign_id && Number(database.campaign_id) !== Number(campaignId)) {
    const previous = db.prepare('SELECT id, name, status FROM campaigns WHERE id = ?').get(database.campaign_id);
    if (previous && previous.status === 'RUNNING') {
      throw new Error(`Stop "${previous.name}" before using this database on another campaign.`);
    }
    if (previous) {
      db.prepare('UPDATE campaigns SET database_id = NULL, updated_at = ? WHERE id = ?').run(now, previous.id);
    }
  }

  // If campaign previously had a different database attached, free that database
  if (campaign.database_id && campaign.database_id !== Number(databaseId)) {
    db.prepare('UPDATE databases SET campaign_id = NULL, is_attached = 0 WHERE id = ?').run(campaign.database_id);
  }

  const attachTx = db.transaction(() => {
    db.prepare(`
      UPDATE databases 
      SET campaign_id = ?, is_attached = 1 
      WHERE id = ?
    `).run(campaignId, databaseId);

    // A newly attached list starts with every row. The campaign can narrow it after.
    db.prepare('UPDATE database_records SET included = 1 WHERE database_id = ?').run(databaseId);
    const stats = getIncludedStats(databaseId);

    db.prepare(`
      UPDATE campaigns 
      SET database_id = ?, total_contacts = ?, sent_count = ?, failed_count = ?, updated_at = ?
      WHERE id = ?
    `).run(databaseId, stats.total || 0, stats.sent || 0, stats.failed || 0, now, campaignId);

    db.prepare(`
      UPDATE database_records 
      SET campaign_id = ? 
      WHERE database_id = ?
    `).run(campaignId, databaseId);
  });

  attachTx();
  reopenUnusedDatabase(databaseId, campaignId);

  const total = db.prepare('SELECT COUNT(*) as count FROM database_records WHERE database_id = ?').get(databaseId).count;
  return {
    success: true,
    message: `Database "${database.name}" successfully attached to campaign "${campaign.name}".`,
    totalContacts: total || 0
  };
}

/**
 * A database keeps one send status. A campaign that has never sent this list
 * should not inherit SENT from the last campaign that used it.
 */
function reopenUnusedDatabase(databaseId, campaignId) {
  const campaign = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign || campaign.status === 'RUNNING') return false;

  const activity = db.prepare('SELECT COUNT(*) as count FROM email_logs WHERE campaign_id = ?').get(campaignId).count;
  if (activity > 0) return false;

  const dirty = db.prepare(
    "SELECT COUNT(*) as count FROM database_records WHERE database_id = ? AND status != 'PENDING'"
  ).get(databaseId).count;
  if (!dirty) return false;

  const now = new Date().toISOString();
  const reopenTx = db.transaction(() => {
    db.prepare(`
      UPDATE database_records
      SET status = 'PENDING', sent_at = NULL, message_id = NULL, error_message = NULL, campaign_id = ?
      WHERE database_id = ?
    `).run(campaignId, databaseId);

    const total = getIncludedStats(databaseId).total || 0;
    db.prepare(`
      UPDATE campaigns
      SET total_contacts = ?, sent_count = 0, failed_count = 0,
          status = CASE WHEN status = 'COMPLETED' THEN 'DRAFT' ELSE status END,
          updated_at = ?
      WHERE id = ?
    `).run(total, now, campaignId);
  });
  reopenTx();
  return true;
}

module.exports = {
  isValidEmail,
  parseSpreadsheet,
  createDatabase,
  getDatabases,
  getDatabaseById,
  deleteDatabase,
  attachDatabaseToCampaign,
  reopenUnusedDatabase,
  getIncludedStats,
  setIncludedRecords
};
