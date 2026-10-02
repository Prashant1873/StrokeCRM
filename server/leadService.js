const xlsx = require('xlsx');
const db = require('./db');

/**
 * Validates basic email format
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
  // Parse rows as array of objects with first row as keys
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

  // 1. Column header name heuristic
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

  // 2. Data fallback heuristic for email if not detected by header
  if (!detectedEmail) {
    for (const h of headers) {
      const sample = rows.slice(0, 5).map(r => String(r[h] || ''));
      const hasEmailFormat = sample.some(v => isValidEmail(v));
      if (hasEmailFormat) {
        detectedEmail = h;
        break;
      }
    }
  }

  // Check validity of rows based on detected email column
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
 * Persists imported leads into SQLite database
 */
function importLeadsIntoCampaign(campaignName, rows, fieldMapping) {
  const emailCol = fieldMapping.email;
  const firstNameCol = fieldMapping.firstName;
  const companyCol = fieldMapping.company;

  if (!emailCol) {
    throw new Error('An email column must be selected.');
  }

  const now = new Date().toISOString();

  // Create campaign if not exists, or get existing
  let campaign = db.prepare('SELECT id FROM campaigns WHERE name = ?').get(campaignName);
  let campaignId;

  if (campaign) {
    campaignId = campaign.id;
  } else {
    const info = db.prepare(`
      INSERT INTO campaigns (name, status, created_at, updated_at, total_contacts)
      VALUES (?, 'DRAFT', ?, ?, 0)
    `).run(campaignName, now, now);
    campaignId = info.lastInsertRowid;
  }

  // Insert contacts inside a single ACID transaction for high performance
  const insertContactStmt = db.prepare(`
    INSERT INTO contacts (campaign_id, email, first_name, company, custom_fields, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
  `);

  let importedCount = 0;
  let skippedCount = 0;

  const runImport = db.transaction((records) => {
    for (const row of records) {
      const email = String(row[emailCol] || '').trim();
      if (!isValidEmail(email)) {
        skippedCount++;
        continue;
      }

      const firstName = firstNameCol ? String(row[firstNameCol] || '').trim() : '';
      const company = companyCol ? String(row[companyCol] || '').trim() : '';

      // Clean row object without internal fields
      const cleanCustomFields = { ...row };
      delete cleanCustomFields._rowId;
      delete cleanCustomFields._validEmail;

      insertContactStmt.run(
        campaignId,
        email,
        firstName || null,
        company || null,
        JSON.stringify(cleanCustomFields)
      );
      importedCount++;
    }

    // Update campaign total_contacts
    db.prepare(`
      UPDATE campaigns 
      SET total_contacts = (SELECT COUNT(*) FROM contacts WHERE campaign_id = ?),
          updated_at = ?
      WHERE id = ?
    `).run(campaignId, now, campaignId);
  });

  runImport(rows);

  return {
    campaignId,
    campaignName,
    importedCount,
    skippedCount,
    totalInCampaign: db.prepare('SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ?').get(campaignId).count
  };
}

/**
 * Gets contacts for a campaign
 */
function getContacts(campaignId = null, limit = 100, offset = 0) {
  if (campaignId) {
    return db.prepare(`
      SELECT * FROM contacts 
      WHERE campaign_id = ? 
      ORDER BY id ASC 
      LIMIT ? OFFSET ?
    `).all(campaignId, limit, offset);
  }
  return db.prepare(`
    SELECT c.*, camp.name as campaign_name 
    FROM contacts c
    LEFT JOIN campaigns camp ON c.campaign_id = camp.id
    ORDER BY c.id DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

/**
 * Clear all contacts
 */
function clearAllContacts() {
  db.prepare('DELETE FROM contacts').run();
  db.prepare('UPDATE campaigns SET total_contacts = 0, sent_count = 0, failed_count = 0').run();
  return { success: true };
}

module.exports = {
  isValidEmail,
  parseSpreadsheet,
  importLeadsIntoCampaign,
  getContacts,
  clearAllContacts
};
