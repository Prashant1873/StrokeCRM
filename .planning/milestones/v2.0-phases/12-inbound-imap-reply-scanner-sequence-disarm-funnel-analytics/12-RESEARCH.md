# Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics - Research

**Date:** 2026-10-03  
**Status:** Complete  

## 1. Executive Summary

Phase 12 builds the inbound automation and safety net for StrokeCRM. In automated cold outreach, sending a follow-up email to someone who already replied is the #1 cause of lost deals and reputation damage. Phase 12 solves this by:
1. Connecting directly to the active email account's IMAP server (`imapflow`).
2. Scanning the `INBOX` for incoming replies from active campaign leads.
3. Automatically filtering out automated out-of-office (OOO) and bounce messages.
4. Atomically disarming pending follow-ups (`status = 'REPLIED'`, `next_step_scheduled_at = NULL`).
5. Providing manual "Mark as Replied" / "Cancel Follow-ups" overrides.
6. Displaying a visual step-by-step conversion funnel and downloadable CSV audit export.

---

## 2. Technical Deep Dive

### 2.1 Universal IMAP Credentials Resolution

StrokeCRM supports both Gmail and Custom Domain mail accounts. The IMAP client dynamically resolves credentials from SQLite settings:

```javascript
function resolveImapConfig() {
  const settings = db.getSettings();
  const provider = settings.active_provider || 'gmail_app_password';

  if (provider === 'custom_domain') {
    if (!settings.custom_imap_host || !settings.custom_imap_user || !settings.custom_imap_pass) {
      throw new Error('Custom Domain IMAP credentials not configured in Settings.');
    }
    return {
      host: String(settings.custom_imap_host).trim(),
      port: Number(settings.custom_imap_port) || 993,
      secure: settings.custom_imap_secure === '1' || settings.custom_imap_secure === true || Number(settings.custom_imap_port) === 993,
      auth: {
        user: String(settings.custom_imap_user).trim(),
        pass: String(settings.custom_imap_pass)
      }
    };
  }

  // Gmail IMAP via App Password
  const account = authService.getActiveAccount();
  if (!account || !account.app_password) {
    throw new Error('Gmail App Password account is not configured.');
  }
  return {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: account.email,
      pass: account.app_password
    }
  };
}
```

---

### 2.2 Inbound Message Search & Auto-Responder Filtering

Using `ImapFlow`:
```javascript
const client = new ImapFlow({ ...imapConfig, logger: false });
await client.connect();

const lock = await client.getMailboxLock('INBOX');
try {
  // Query messages received in the last 14 days
  const sinceDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const messages = client.fetch({ since: sinceDate }, {
    envelope: true,
    headers: ['auto-submitted', 'x-autoreply', 'x-autorespond', 'precedence', 'in-reply-to', 'references']
  });

  for await (const message of messages) {
    const fromEmail = message.envelope.from?.[0]?.address?.toLowerCase();
    const subject = message.envelope.subject || '';
    const headers = message.headers;

    // Auto-responder inspection
    const autoSubmitted = headers.get('auto-submitted')?.toString().toLowerCase();
    const isAutoReply = Boolean(
      (autoSubmitted && autoSubmitted !== 'no') ||
      headers.get('x-autoreply')?.toString().toLowerCase() === 'yes' ||
      headers.get('x-autorespond') ||
      ['bulk', 'junk', 'auto_reply'].includes(headers.get('precedence')?.toString().toLowerCase()) ||
      /^(auto-reply|automatic reply|out of office|vacation auto-response|returned mail|undeliverable)/i.test(subject)
    );

    if (isAutoReply) {
      // Record auto-reply notice without halting sequence
      continue;
    }

    // Match against active campaign leads
    ...
  }
} finally {
  lock.release();
  await client.logout();
}
```

---

### 2.3 Atomic Sequence Disarm State Machine

When a lead reply is detected:
1. `database_records`:
   ```sql
   UPDATE database_records SET
     status = 'REPLIED',
     replied_at = ?,
     next_step_scheduled_at = NULL,
     error_message = NULL
   WHERE id = ?;
   ```
   **Critical Invariant**: Setting `next_step_scheduled_at = NULL` immediately halts the queue worker from ever picking up this contact for Step 2 or Step 3!

2. `reply_logs` table:
   Record the verbatim reply metadata for audit and display:
   ```sql
   CREATE TABLE IF NOT EXISTS reply_logs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     campaign_id INTEGER,
     database_record_id INTEGER,
     contact_id INTEGER,
     sender_email TEXT NOT NULL,
     subject TEXT,
     snippet TEXT,
     in_reply_to TEXT,
     message_id TEXT,
     is_auto_reply INTEGER DEFAULT 0,
     received_at TEXT NOT NULL,
     created_at TEXT NOT NULL,
     FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
   );
   ```

3. `campaigns`:
   ```sql
   UPDATE campaigns SET
     reply_count = (SELECT COUNT(DISTINCT recipient_email) FROM email_logs WHERE campaign_id = ? AND status = 'REPLIED')
   WHERE id = ?;
   ```

---

### 2.4 Conversion Funnel & CSV Audit Generator

The Funnel metrics calculate real-world drop-off across all sequence steps:
- Total Contacts Bound (100%)
- Step 1 Delivered: `COUNT(*) FROM email_logs WHERE campaign_id = ? AND step_number = 1 AND status = 'SENT'`
- Step 2 Delivered: `COUNT(*) FROM email_logs WHERE campaign_id = ? AND step_number = 2 AND status = 'SENT'`
- Step 3 Delivered: `COUNT(*) FROM email_logs WHERE campaign_id = ? AND step_number = 3 AND status = 'SENT'`
- Inbound Replies: `COUNT(*) FROM database_records WHERE database_id = ? AND status = 'REPLIED'`
- Overall Reply Rate: `(Replies / Step 1 Delivered) * 100%`

The CSV audit endpoint (`GET /api/campaigns/:id/export-audit`) streams a formatted CSV with full step timestamps and reply verification:
```
Email,First Name,Company,Status,Current Step,Step 1 Sent,Step 2 Sent,Step 3 Sent,Replied At,Reply Subject
alex@acme.com,Alex,Acme Corp,REPLIED,2,2026-10-01 10:00,2026-10-04 10:00,,2026-10-04 14:22,Re: Quick question regarding Acme
```

---

## 3. UI/UX Architecture (`CampaignsView.jsx` & `DatabasesView.jsx`)

1. **Campaign Cockpit Funnel Card**:
   - Visual bar showing drop-off progression:
     `Contacts (100) ──> Step 1 (100) ──> Step 2 (72) ──> Step 3 (45) ──> Replies (18 · 18% Reply Rate)`
   - "Scan Replies Now" button with live spinner and last scanned timestamp.
   - "Export Audit CSV" button triggering instant browser file download.
2. **Databases Records Inspection**:
   - Row-level action buttons: "Mark Replied" and "Cancel Follow-ups".
