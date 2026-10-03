# Architecture Research

**Domain:** Cold Email Outreach, Custom Domain Mail & Drip Sequences  
**Researched:** 2026-10-03  
**Confidence:** HIGH  

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Client (UI)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ Settings View    │  │ Campaign Drip    │  │ Sequence  │  │
│  │ Custom SMTP/IMAP │  │ Step Builder     │  │ Funnel UI │  │
│  └─────────┬────────┘  └────────┬─────────┘  └─────┬─────┘  │
├────────────┼────────────────────┼──────────────────┼────────┤
│            ▼                    ▼                  ▼        │
│                    Express REST API                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ /api/settings    │  │ /api/campaigns/  │  │ /api/imap │  │
│  │ (SMTP/IMAP test) │  │ :id/steps        │  │ /scan     │  │
│  └─────────┬────────┘  └────────┬─────────┘  └─────┬─────┘  │
├────────────┼────────────────────┼──────────────────┼────────┤
│            ▼                    ▼                  ▼        │
│                Background Engine & Daemons                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pacing Queue Worker (queueService.js)                │    │
│  │ - Evaluates scheduled_at <= now() for active steps  │    │
│  │ - Dispatches Step N via Nodemailer custom transport │    │
│  │ - Stores original Message-ID in SQLite queue record │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ IMAP Reply Scanner (replyService.js)                 │    │
│  │ - Periodically connects via ImapFlow to INBOX       │    │
│  │ - Fetches messages since campaign start date        │    │
│  │ - Matches In-Reply-To / References / From address   │    │
│  │ - Executes atomic transaction: marks contact REPLIED│    │
│  │   and cancels pending subsequent steps              │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                     SQLite Storage                          │
│  - settings (smtp_host, smtp_port, imap_host, etc.)         │
│  - campaign_steps (id, campaign_id, step_number, delay_days)│
│  - campaign_queue (contact_id, step_number, message_id,     │
│                    status, scheduled_at, replied_at)        │
└─────────────────────────────────────────────────────────────┘
```

## Data Model Extensions

### 1. Settings Schema
Add custom domain mail fields to `settings` table:
- `mail_provider`: `'gmail_app_password' | 'gmail_oauth2' | 'custom_smtp'`
- `smtp_host`, `smtp_port`, `smtp_secure` (boolean: true for 465 SSL, false for 587 STARTTLS)
- `smtp_user`, `smtp_pass`
- `imap_host`, `imap_port`, `imap_secure`
- `imap_user`, `imap_pass`

### 2. Campaign Steps Schema (`campaign_steps`)
- `id` (INTEGER PRIMARY KEY)
- `campaign_id` (INTEGER REFERENCES campaigns(id))
- `step_number` (INTEGER, 1 = initial, 2 = first follow-up, 3 = second follow-up)
- `delay_days` (INTEGER, days after previous step was sent)
- `delay_hours` (INTEGER, additional hour offset)
- `template_id` (INTEGER REFERENCES templates(id))
- `thread_reply` (BOOLEAN, 1 = send as reply in same thread with `In-Reply-To`, 0 = new thread)

### 3. Queue Evolution (`campaign_queue`)
Add fields:
- `step_number` (INTEGER DEFAULT 1)
- `message_id` (TEXT, RFC Message-ID returned by Nodemailer on send)
- `in_reply_to` (TEXT, Message-ID of preceding step for threading)
- `scheduled_at` (DATETIME, when this step is eligible for dispatch)
- `status`: `'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'PAUSED' | 'CANCELLED_REPLIED'`

## Reply Matching Algorithm

1. On periodic interval (or user clicking "Scan Replies"):
   - Connect to IMAP inbox using user's configured IMAP credentials via `ImapFlow`.
   - Query messages with `SINCE [Campaign Created Date]`.
   - For each message:
     - Check `envelope.from[0].address`.
     - Check `inReplyTo` and `references` headers.
     - Match against contacts in active campaigns who have sent messages.
     - If match found:
       - Update contact status to `REPLIED` and record `replied_at`.
       - Query pending subsequent steps (`step_number > current_step`) for that contact and update status to `CANCELLED_REPLIED`.
       - Emit WebSocket / SSE or update state so UI dashboard instantly highlights the reply.

---
*Architecture research for: StrokeCRM v2.0 Custom Domains & Automated Drips*  
*Researched: 2026-10-03*
