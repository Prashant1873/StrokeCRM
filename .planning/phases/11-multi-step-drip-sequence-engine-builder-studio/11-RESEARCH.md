# Phase 11: Multi-Step Drip Sequence Engine & Builder Studio - Research

**Date:** 2026-10-03  
**Status:** Complete  

## 1. Executive Summary

Phase 11 introduces multi-step drip cadence automation into StrokeCRM's outreach engine. When launching cold outreach campaigns, follow-up emails are where 60-70% of positive responses originate. This phase equips StrokeCRM with:
1. Linear 3-step sequence modeling (Step 1 Initial, Step 2 Follow-up, Step 3 Closing/Breakup).
2. Custom delay offsets in days and hours (e.g. Step 2 after 3 days, Step 3 after 4 days).
3. Dynamic template binding or custom body/subject with attached database header variables.
4. Organic conversation threading via standard RFC 2822 `In-Reply-To` and `References` headers.
5. Scheduled timestamp queue evaluation preventing premature campaign completion while follow-ups are pending.

---

## 2. Technical Deep Dive

### 2.1 Schema Extensions (`server/db.js`)

#### A. New Table: `campaign_drip_steps`
```sql
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
  thread_reply INTEGER DEFAULT 1, -- 1 = thread as Re: previous, 0 = standalone email
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE (campaign_id, step_number)
);
```

#### B. Alterations to `database_records` and `contacts`
```sql
-- Migration check in db.js:
ALTER TABLE database_records ADD COLUMN current_step INTEGER DEFAULT 1;
ALTER TABLE database_records ADD COLUMN initial_message_id TEXT;
ALTER TABLE database_records ADD COLUMN next_step_scheduled_at TEXT;

ALTER TABLE contacts ADD COLUMN current_step INTEGER DEFAULT 1;
ALTER TABLE contacts ADD COLUMN initial_message_id TEXT;
ALTER TABLE contacts ADD COLUMN next_step_scheduled_at TEXT;
```

#### C. Alteration to `email_logs`
```sql
ALTER TABLE email_logs ADD COLUMN step_number INTEGER DEFAULT 1;
```

---

### 2.2 RFC 2822 Organic Threading Mechanics

When an email client (Gmail, Apple Mail, Outlook, Superhuman) groups messages into conversation threads, it evaluates three criteria in order of authority:
1. `In-Reply-To`: Contains the verbatim `Message-ID` of the immediate preceding email (e.g. `<b487c6e0-94e1-2291-7649-abc12345@domain.com>`).
2. `References`: Contains an ordered whitespace-separated list of all message IDs in the conversation hierarchy (`<initial_id> <step2_id>`).
3. `Subject`: Starts with `Re: ` followed by the original normalized subject line.

In Nodemailer:
```javascript
const mailOptions = {
  from: fromAddress,
  to: contact.email,
  subject: subject,
  text: renderedPlainText,
  html: renderedHtml,
  headers: {
    'X-Mailer': 'StrokeCRM Outreach Engine',
    'X-Campaign-ID': String(campaign.id),
    'X-Drip-Step': String(stepNumber)
  }
};

if (stepNumber > 1 && threadReply && initialMessageId) {
  mailOptions.headers['In-Reply-To'] = initialMessageId;
  mailOptions.headers['References'] = initialMessageId;
  if (!mailOptions.subject.toLowerCase().startsWith('re:')) {
    mailOptions.subject = `Re: ${initialSubject || campaign.subject_a || mailOptions.subject}`;
  }
}
```

---

### 2.3 Scheduled Timestamp Queue Algorithm (`server/queueService.js`)

#### A. Fetching Next Eligible Contact
Instead of blindly selecting any `status = 'PENDING'` contact, the query verifies whether the contact is due:
```sql
SELECT * FROM database_records 
WHERE database_id = ? 
  AND status = 'PENDING' 
  AND included = 1
  AND (next_step_scheduled_at IS NULL OR next_step_scheduled_at <= ?)
ORDER BY 
  CASE WHEN current_step > 1 THEN 0 ELSE 1 END,
  id ASC 
LIMIT 1;
```
- Passing `new Date().toISOString()` ensures precise millisecond comparison.
- Prioritizing `current_step > 1` ensures follow-ups are sent punctually.

#### B. Scheduling Next Step on Success
After Step 1 completes:
1. Retrieve Step 2 configuration for this campaign:
   `SELECT * FROM campaign_drip_steps WHERE campaign_id = ? AND step_number = 2 AND is_active = 1`
2. If Step 2 exists:
   - Calculate delay: `((step2.delay_days * 86400) + (step2.delay_hours * 3600)) * 1000` ms.
   - `const scheduledIso = new Date(Date.now() + delayMs).toISOString();`
   - Update contact:
     ```sql
     UPDATE database_records SET
       current_step = 2,
       status = 'PENDING',
       sent_at = ?,
       initial_message_id = ?,
       next_step_scheduled_at = ?
     WHERE id = ?;
     ```
3. If no active Step 2:
   - Mark `status = 'SENT', next_step_scheduled_at = NULL`.

#### C. Non-Destructive Delay Polling
When the queue finds 0 immediately due contacts:
```javascript
const pendingFutureCount = db.prepare(`
  SELECT COUNT(*) as count FROM database_records 
  WHERE database_id = ? AND status = 'PENDING' AND included = 1 AND next_step_scheduled_at > ?
`).get(campaign.database_id, nowIso).count;

if (pendingFutureCount > 0) {
  const earliestNext = db.prepare(`
    SELECT MIN(next_step_scheduled_at) as next_time FROM database_records 
    WHERE database_id = ? AND status = 'PENDING' AND included = 1
  `).get(campaign.database_id).next_time;

  job.isWaitingSchedule = true;
  job.lastLog = `Waiting for scheduled follow-ups. ${pendingFutureCount} pending, next send at ${new Date(earliestNext).toLocaleTimeString()}`;
  db.prepare("UPDATE campaigns SET status = 'WAITING_SCHEDULE' WHERE id = ?").run(jobId);
  const keepGoing = await interruptibleSleep(30000, jobId);
  if (!keepGoing) break;
  continue;
}
```
This guarantees the campaign does NOT prematurely mark itself `COMPLETED` when Step 1 concludes.

---

## 3. Frontend Architecture (`CampaignsView.jsx`)

The Sequence Studio will be positioned in the Campaign Cockpit with:
1. **Interactive Step Pipeline Bar**:
   - Visual nodes connecting `Step 1 (Initial)` ──[ +3d Delay ]──> `Step 2 (Follow-up)` ──[ +4d Delay ]──> `Step 3 (Closing)`.
   - Node status badges: Active / Inactive / Threaded.
2. **Step Tabs / Editor Cards**:
   - Step 1: Synced with Campaign Template, immediate send.
   - Step 2: Delay inputs (Days, Hours) + Quick Preset pills (`1d`, `2d`, `3d`, `5d`, `1w`).
   - Threading toggle: "Organic Threading: Send as In-Reply-To within original email thread".
   - Template binding picker or custom Subject & Body.
   - Header variable badge bank (`{{FirstName}}`, `{{Company}}`).
   - Step Test-Send button to dispatch an isolated test email preview of that specific step.

---

## 4. Pitfalls & Mitigations

| Pitfall | Risk | Mitigation |
|---------|------|------------|
| Premature Campaign Completion | Worker finishes Step 1 and closes campaign before Step 2 timestamp arrives. | Worker checks for records where `next_step_scheduled_at > nowIso`; if found, sets `WAITING_SCHEDULE` and continues polling. |
| In-Reply-To Missing Message-ID | Step 1 didn't record messageId or Nodemailer returned undefined. | Fall back to clean subject-based threading (`Re: ...`) and graceful omission of `In-Reply-To` without crashing. |
| Regressing Single-Step Campaigns | Existing users or simple campaigns forced into multi-step setup. | Default state has 0 follow-up steps. If only Step 1 exists, campaign immediately marks contacts `SENT` as before. |
| Timezone Drift in Delays | System clock mismatch between client and server. | All delay calculations use standard UTC ISO strings (`new Date(Date.now() + ms).toISOString()`). |
