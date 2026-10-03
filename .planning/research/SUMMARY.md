# Project Research Summary

**Project:** StrokeCRM  
**Domain:** Cold Email Outreach, Custom Domain SMTP/IMAP & Drip Automation  
**Researched:** 2026-10-03  
**Confidence:** HIGH  

## Executive Summary

StrokeCRM Milestone v2.0 expands beyond the single Gmail account paradigm to empower users with custom domain emails (e.g. `user@mycompany.com`) via standard SMTP/IMAP protocols, and introduces automated multi-step follow-up sequences that halt immediately upon receiving lead replies.

The recommended architectural approach builds natively upon StrokeCRM's existing Node.js + Express + SQLite foundation. Outbound sending continues through `nodemailer` with dynamic transport configuration (supporting custom SMTP host, port 465 SSL, port 587 STARTTLS, and custom credentials alongside existing Gmail options). Inbound reply detection leverages `imapflow` (the modern, async/await native IMAP client by the Nodemailer author) and `mailparser` to inspect inbox replies, match `In-Reply-To` and sender addresses, and atomically disarm pending follow-up steps in SQLite.

Per explicit user direction, high-defect features like AI icebreaker generation and multi-account burner inbox rotation are excluded, concentrating engineering effort on deliverability, rock-solid threading, and dependable sequence automation.

## Key Findings

### Recommended Stack
- **Outbound SMTP**: `nodemailer` (already installed) configured with custom host/port/secure settings.
- **Inbound IMAP**: `imapflow` (^1.0.160) for robust, async/await connection management, folder inspection, and reply retrieval.
- **MIME Parsing**: `mailparser` (^3.7.1) for extracting headers (`In-Reply-To`, `References`, `From`, `Auto-Submitted`) and reply text.
- **Date & Cadence Logic**: `date-fns` (^4.1.0) for timezone-aware business-day offsets and interval calculations.
- **Persistence**: `better-sqlite3` (already installed) for ACID transaction integrity across sequence state transitions.

### Expected Features

**Must have (table stakes):**
- **Universal Custom SMTP/IMAP Configuration**: Support custom domain mail servers with test connection verification.
- **Multi-Step Drip Sequences**: Step 1 (Initial), Step 2 (+N days), Step 3 (+M days) with independent templates and pacing.
- **Inbound IMAP Reply Detection**: Background IMAP scan that identifies lead replies and marks contact status as `REPLIED`.
- **Automatic Sequence Disarming**: Immediate cancellation of subsequent pending steps once a reply is detected.
- **Organic Email Threading**: Follow-up emails sent as replies in the exact same thread via `In-Reply-To` and `References` headers.

**Should have (competitive):**
- **Step-by-Step Funnel Analytics**: Visual drop-off and conversion rates across sequence touches.
- **Out-of-Office / Auto-Reply Filter**: Avoid false-positive reply halts when an automated auto-responder fires.
- **Manual "Mark as Replied" button**: One-click override if a prospect replies via LinkedIn or phone.

**Out of Scope (v2.0):**
- AI Personalized Icebreaker Generation (dropped).
- Multi-Account Burner Inbox Rotation (dropped).

### Architecture Approach
- **Settings Store**: Extend `settings` in SQLite to store custom SMTP and IMAP host, port, credentials, and active provider choice (`gmail_app_password` vs `custom_smtp`).
- **Campaign Steps**: New `campaign_steps` table defining ordered steps (1, 2, 3), delay offsets (`delay_days`, `delay_hours`), and assigned template IDs.
- **Queue Engine**: Upgrade `queueService.js` to index `scheduled_at` and `step_number`. When Step 1 completes, Step 2 is scheduled for `now() + delay`.
- **IMAP Reply Service**: Dedicated `replyService.js` running on scheduled intervals or manual trigger, comparing incoming email headers against active lead queues.

### Critical Pitfalls
1. **Port & SSL Mismatch**: Auto-configure `secure: true` for port 465 and `secure: false` for port 587/25 with inline test verification.
2. **False Positive Reply Halting**: Inspect `Auto-Submitted` and `X-Autoreply` headers to ignore out-of-office autoreponders.
3. **Threading Breakage**: Always store RFC `message_id` on initial send and pass it as `inReplyTo` and `references` for subsequent steps.

## Implications for Roadmap

Suggested phase structure for Milestone v2.0:

### Phase 10: Custom Domain SMTP & IMAP Account Gateway
- **Rationale**: Foundation for custom email support before building multi-step drips.
- **Delivers**: Custom SMTP settings, IMAP settings, connection testers for both, and dynamic transport resolver in backend.
- **Avoids**: Port and TLS mismatch pitfalls.

### Phase 11: Multi-Step Drip Sequence Engine & Builder UI
- **Rationale**: Enables campaigns to define Step 1, Step 2, and Step 3 with customizable delays.
- **Delivers**: `campaign_steps` schema, interactive step builder in Campaign Cockpit, `scheduled_at` queue processor, and email threading preservation (`In-Reply-To`).
- **Avoids**: Thread breakage pitfalls.

### Phase 12: Inbound IMAP Reply Scanner & Auto-Disarm Safeguard
- **Rationale**: Protects user reputation by ensuring follow-ups never send to prospects who have already responded.
- **Delivers**: `replyService.js` with `ImapFlow` and `mailparser`, auto-reply detection, atomic sequence disarming (`CANCELLED_REPLIED`), manual "Mark Replied" override, and step funnel analytics.
- **Avoids**: False-positive auto-responder halts and race conditions.

---
*Project research summary for: StrokeCRM v2.0*  
*Researched: 2026-10-03*
