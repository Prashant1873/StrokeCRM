const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const db = require('./db');

/**
 * Creates a Nodemailer transporter for Gmail via App Password
 */
function createSmtpTransporter(email, appPassword) {
  // Strip any spaces from the 16-character Google App Password (users often paste with spaces)
  const cleanPassword = appPassword.replace(/\s+/g, '');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: email.trim(),
      pass: cleanPassword
    }
  });
}

/**
 * Test SMTP connection using Google App Password
 */
async function testSmtpConnection(email, appPassword) {
  try {
    const transporter = createSmtpTransporter(email, appPassword);
    await transporter.verify();
    return { success: true, message: 'Gmail SMTP credentials successfully verified.' };
  } catch (error) {
    let friendlyError = error.message;
    if (error.responseCode === 535 || error.message.includes('Username and Password not accepted')) {
      friendlyError = 'Invalid credentials. Please verify your Gmail address and 16-character Google App Password. (Ensure 2-Step Verification is ON and generate an App Password under myaccount.google.com/apppasswords).';
    }
    return { success: false, message: friendlyError };
  }
}

/**
 * Test OAuth2 credentials
 */
async function testOAuthConnection(clientId, clientSecret, refreshToken) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId.trim(),
      clientSecret.trim(),
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken.trim() });
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Failed to retrieve access token with provided refresh token.');
    }
    return { success: true, message: 'OAuth2 credentials successfully verified.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Get the currently active sender account
 */
function getActiveAccount() {
  return db.prepare('SELECT * FROM accounts WHERE is_active = 1 LIMIT 1').get();
}

/**
 * Save or update sender account
 */
function saveAccount(data) {
  const { type, email, app_password, oauth_client_id, oauth_client_secret, oauth_refresh_token, verified } = data;
  
  // Set all existing to inactive first if this will be active
  db.prepare('UPDATE accounts SET is_active = 0').run();

  const existing = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
  if (existing) {
    db.prepare(`
      UPDATE accounts 
      SET type = ?, app_password = ?, oauth_client_id = ?, oauth_client_secret = ?, 
          oauth_refresh_token = ?, is_active = 1, verified = ?, last_verified_at = ?
      WHERE id = ?
    `).run(
      type || 'app_password',
      app_password ? app_password.replace(/\s+/g, '') : null,
      oauth_client_id || null,
      oauth_client_secret || null,
      oauth_refresh_token || null,
      verified ? 1 : 0,
      verified ? new Date().toISOString() : null,
      existing.id
    );
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(existing.id);
  } else {
    const info = db.prepare(`
      INSERT INTO accounts (type, email, app_password, oauth_client_id, oauth_client_secret, oauth_refresh_token, is_active, verified, last_verified_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      type || 'app_password',
      email.trim(),
      app_password ? app_password.replace(/\s+/g, '') : null,
      oauth_client_id || null,
      oauth_client_secret || null,
      oauth_refresh_token || null,
      verified ? 1 : 0,
      verified ? new Date().toISOString() : null
    );
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid);
  }
}

module.exports = {
  createSmtpTransporter,
  testSmtpConnection,
  testOAuthConnection,
  getActiveAccount,
  saveAccount
};
