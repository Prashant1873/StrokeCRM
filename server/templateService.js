/**
 * Template Personalization & Spam Analysis Service
 */

// Curated comprehensive list of cold outreach spam trigger keywords
const SPAM_KEYWORDS = [
  // High Risk / Financial
  '100% free', 'free money', 'make money fast', 'earn cash', 'fast cash', 'income from home',
  'million dollars', 'billion', 'pure profit', 'risk free', 'no risk', 'guarantee', 'guaranteed',
  'double your income', 'get rich', 'lowest price', 'unlimited', 'wire transfer', 'cryptocurrency investment',
  'no fees', 'hidden assets', 'refinance', 'pre-approved', 'congratulations', 'winner', 'winning',
  
  // Urgency / Pressure
  'act now', 'urgent', 'immediately', 'apply now', 'instant', 'limited time', 'expires today',
  'exclusive deal', 'don\'t delete', 'read immediately', 'order now', 'final notice', 'action required',
  'only today', 'last chance', 'hurry up', 'take action', 'once in a lifetime',
  
  // Exaggeration / Hype
  'cure', 'miracle', 'revolutionary breakthrough', 'magic', 'secret formula', 'incredible deal',
  'satisfaction guaranteed', 'unbelievable', 'you won', 'claim now', 'click here now', 'click below now',
  'special promotion', 'free trial no credit card', 'dear friend', 'friend', 'valuable customer'
];

/**
 * Normalizes keys for case-insensitive and punctuation-insensitive matching
 */
function normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds a matching key in rowData object regardless of casing or formatting
 */
function findValueInRow(rowData, targetKey) {
  if (!rowData || typeof rowData !== 'object') return null;

  // Direct exact match
  if (rowData[targetKey] !== undefined && rowData[targetKey] !== null) {
    return String(rowData[targetKey]);
  }

  // Normalized key match
  const normalizedTarget = normalizeKey(targetKey);
  for (const [k, v] of Object.entries(rowData)) {
    if (normalizeKey(k) === normalizedTarget && v !== undefined && v !== null) {
      return String(v);
    }
  }

  // Check inside custom_fields JSON if present
  if (rowData.custom_fields) {
    try {
      const parsed = typeof rowData.custom_fields === 'string' ? JSON.parse(rowData.custom_fields) : rowData.custom_fields;
      for (const [k, v] of Object.entries(parsed)) {
        if (normalizeKey(k) === normalizedTarget && v !== undefined && v !== null) {
          return String(v);
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Interpolates variables in template string:
 * Supports: {{ColumnName}} and {{ColumnName | "fallback"}}
 */
function interpolate(templateStr, rowData) {
  if (!templateStr) return '';

  // Regex matches {{ Key }} or {{ Key | "fallback" }} or {{ Key | 'fallback' }}
  const variableRegex = /{{\s*([a-zA-Z0-9_\-\s]+?)(?:\s*\|\s*["'](.*?)["'])?\s*}}/g;

  return templateStr.replace(variableRegex, (match, key, fallback) => {
    const cleanKey = key.trim();
    const val = findValueInRow(rowData, cleanKey);

    if (val !== null && val.trim() !== '') {
      return val.trim();
    }

    if (fallback !== undefined && fallback !== null) {
      return fallback;
    }

    // If no value and no fallback, return empty string so raw curly braces don't leak
    return '';
  });
}

/**
 * Extracts list of variables referenced in a template
 */
function extractVariables(templateStr) {
  if (!templateStr) return [];
  const variableRegex = /{{\s*([a-zA-Z0-9_\-\s]+?)(?:\s*\|\s*["'].*?["'])?\s*}}/g;
  const matches = new Set();
  let m;
  while ((m = variableRegex.exec(templateStr)) !== null) {
    matches.add(m[1].trim());
  }
  return Array.from(matches);
}

/**
 * Analyzes subject line and body for spam trigger words, all-caps, and excessive punctuation
 */
function checkSpam(subject = '', body = '') {
  const combinedText = `${subject} ${body}`.toLowerCase();
  const flagged = [];
  let score = 0; // 0 (clean) to 100 (high risk)
  const recommendations = [];

  // 1. Scan for spam keywords
  for (const phrase of SPAM_KEYWORDS) {
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(combinedText)) {
      flagged.push(phrase);
      score += 15;
    }
  }

  // 2. Scan subject line for excessive uppercase words (e.g. "FREE", "URGENT")
  const subjectWords = subject.split(/\s+/).filter(w => w.length > 2);
  const upperWords = subjectWords.filter(w => /^[A-Z]{3,}$/.test(w) && !['CEO', 'CTO', 'B2B', 'SaaS', 'API', 'CRM', 'AI'].includes(w));
  if (upperWords.length > 0) {
    score += upperWords.length * 12;
    recommendations.push(`Avoid ALL-CAPS words in subject (${upperWords.join(', ')}).`);
  }

  // 3. Scan for excessive punctuation (e.g. "???", "!!!", "$$$")
  if (/!{2,}/.test(subject) || /!{2,}/.test(body)) {
    score += 10;
    recommendations.push('Remove multiple consecutive exclamation marks (!!).');
  }
  if (/\${2,}/.test(combinedText)) {
    score += 15;
    recommendations.push('Remove multiple currency symbols ($$$).');
  }

  // 4. Check length of subject
  if (subject.length > 70) {
    score += 5;
    recommendations.push('Subject line is over 70 characters; cold emails perform best between 30–50 chars.');
  }

  // Cap score between 0 and 100
  score = Math.min(100, score);

  let rating = 'Low';
  if (score >= 40) {
    rating = 'High';
  } else if (score >= 20) {
    rating = 'Medium';
  }

  if (flagged.length > 0) {
    recommendations.push(`Replace flagged spam words: "${flagged.slice(0, 4).join('", "')}" with natural language.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Your copy looks clean and conversational! High deliverability expected.');
  }

  return {
    score,
    rating, // 'Low' | 'Medium' | 'High'
    flaggedKeywords: flagged,
    recommendations
  };
}

/**
 * Reusable Templates CRUD
 */
function getTemplates() {
  const db = require('./db');
  return db.prepare('SELECT * FROM templates ORDER BY updated_at DESC').all();
}

function getTemplateById(id) {
  const db = require('./db');
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
}

function createTemplate({ name, subject_a, body_a, subject_b = '', body_b = '', is_ab_test = 0 }) {
  const db = require('./db');
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO templates (name, subject_a, body_a, subject_b, body_b, is_ab_test, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name || 'Untitled Template',
    subject_a || '',
    body_a || '',
    subject_b || '',
    body_b || '',
    is_ab_test ? 1 : 0,
    now,
    now
  );
  return getTemplateById(info.lastInsertRowid);
}

function updateTemplate(id, { name, subject_a, body_a, subject_b = '', body_b = '', is_ab_test = 0 }) {
  const db = require('./db');
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE templates 
    SET name = ?, subject_a = ?, body_a = ?, subject_b = ?, body_b = ?, is_ab_test = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name || 'Untitled Template',
    subject_a || '',
    body_a || '',
    subject_b || '',
    body_b || '',
    is_ab_test ? 1 : 0,
    now,
    id
  );
  return getTemplateById(id);
}

function deleteTemplate(id) {
  const db = require('./db');
  // Check if any campaign is currently using this template
  db.prepare('UPDATE campaigns SET template_id = NULL WHERE template_id = ?').run(id);
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  return { success: true, message: 'Template deleted.' };
}

function attachTemplateToCampaign(templateId, campaignId) {
  const db = require('./db');
  const template = getTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  db.prepare(`
    UPDATE campaigns 
    SET template_id = ?,
        subject_a = ?, body_a = ?,
        subject_b = ?, body_b = ?,
        is_ab_test = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    templateId,
    template.subject_a,
    template.body_a,
    template.subject_b,
    template.body_b,
    template.is_ab_test,
    new Date().toISOString(),
    campaignId
  );
  return { success: true, message: `Template "${template.name}" attached to campaign.` };
}

function duplicateTemplate(id) {
  const db = require('./db');
  const original = getTemplateById(id);
  if (!original) throw new Error('Template not found');

  const now = new Date().toISOString();
  const newName = `${original.name} (Copy)`;

  const result = db.prepare(`
    INSERT INTO templates (name, subject_a, body_a, subject_b, body_b, is_ab_test, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newName,
    original.subject_a || '',
    original.body_a || '',
    original.subject_b || '',
    original.body_b || '',
    original.is_ab_test ? 1 : 0,
    now,
    now
  );

  return getTemplateById(result.lastInsertRowid);
}

module.exports = {
  interpolate,
  extractVariables,
  checkSpam,
  SPAM_KEYWORDS,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  attachTemplateToCampaign
};
