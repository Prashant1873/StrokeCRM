# Phase 11: Multi-Step Drip Sequence Engine & Builder Studio - Context

**Gathered:** 2026-10-03  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Phase 11 delivers a multi-step drip sequence engine and builder studio for StrokeCRM campaigns. It allows users to define up to 3 sequence steps (Step 1 Initial, Step 2 Follow-up, Step 3 Closing/Breakup) with custom delay intervals (days and hours), bind distinct templates or custom copy with dynamic database variable interpolation, preserve email conversation threads organically via RFC 2822 `In-Reply-To` and `References` headers, and evaluate scheduled timestamps in the background queue dispatcher.

Requirements: `DRIP-01`, `DRIP-02`, `DRIP-03`, `DRIP-04`.
</domain>

<decisions>
## Implementation Decisions

### Sequence Structure & Storage
- **D-01: Linear 3-Step Sequence Model**: Limit sequences to 3 clean linear steps: Step 1 (Initial), Step 2 (Follow-up 1), and Step 3 (Closing/Breakup). Branching decision trees are intentionally avoided (YAGNI) to keep setup frictionless and reliable. — **Reversibility:** costly.
- **D-02: Dedicated `campaign_drip_steps` Table**: Create a dedicated table in SQLite to store step configurations per campaign (`campaign_id`, `step_number`, `delay_days`, `delay_hours`, `template_id`, `subject_a`, `body_a`, `subject_b`, `body_b`, `thread_reply`, `is_active`). Step 1 inherits/syncs with campaign template properties for full non-regression. — **Reversibility:** costly.
- **D-03: Step-Aware Contact State**: Extend `database_records` and `contacts` with `current_step` (INTEGER DEFAULT 1), `initial_message_id` (TEXT), and `next_step_scheduled_at` (TEXT ISO timestamp). Extend `email_logs` with `step_number` (INTEGER DEFAULT 1). — **Reversibility:** costly.

### Organic Threading & Header Handling
- **D-04: RFC 2822 In-Reply-To & References**: For Step 2 and Step 3, if `thread_reply` is enabled (default true), the dispatcher injects `In-Reply-To: <initial_message_id>` and `References: <initial_message_id>` headers. If the subject does not already start with `Re: `, it automatically prepends `Re: ` to the initial step's subject. This makes follow-ups land naturally in the same email thread in Gmail, Apple Mail, and Outlook. — **Reversibility:** reversible.

### Queue Engine Scheduling & State Machine
- **D-05: Non-Destructive Delay Polling**: When all Step 1 emails are sent, if contacts have Step 2 scheduled for a future timestamp (`next_step_scheduled_at > datetime('now')`), the campaign does NOT prematurely mark itself `COMPLETED`. Instead, it enters `WAITING_STEP_DELAY` / `isWaitingSchedule`, with a human-readable log and countdown until the next due send. — **Reversibility:** reversible.
- **D-06: Step-Priority Dispatch Order**: Due follow-ups (`current_step > 1`) are prioritized in the queue query ahead of new Step 1 sends so scheduled promises are kept promptly. — **Reversibility:** reversible.

### Builder Studio & UI
- **D-07: Cockpit-Integrated Sequence Studio**: The Sequence Builder is embedded directly inside the Campaign Cockpit (`#/campaigns/:id`) between the Triad summary and the live queue radar. Users can toggle steps on/off, adjust delays with presets (1d, 2d, 3d, 5d, 7d), pick templates or write custom copy with dynamic database variable pills, and send test previews of any step. — **Reversibility:** reversible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before implementing:**

- `server/db.js` — SQLite database schema, settings, campaigns, contacts, and email_logs tables.
- `server/queueService.js` — Dispatch worker, Nodemailer transport resolver, and queue loop.
- `server/index.js` — Campaign and queue API endpoints.
- `server/templateService.js` — Variable interpolation and HTML-to-text rendering.
- `client/src/components/CampaignsView.jsx` — Campaign Cockpit layout, Triad pillars, and action controls.
- `.planning/research/STACK.md` — Stack guidelines for Nodemailer headers and SQLite date operations.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `templateService.interpolate(text, rowData)`: Handles dynamic `{{Variable}}` replacement with fallbacks.
- `queueService.resolveTransporter(campaignSenderOverride)`: Handles dynamic Gmail vs Custom Domain routing.
- `queueService.interruptibleSleep(ms, jobId)`: Enables non-blocking, interruptible queue pauses.
- `client/src/components/CampaignsView.jsx`: Already handles real-time polling, status indicators, and modal triggers.

### Established Patterns
- Linear/Raycast dark theme styling (`bg-slate-900`, `border-slate-800`, `text-slate-300`, `text-white`).
- WCAG 2.2 AA compliant focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`).
- Atomic transactions in `better-sqlite3` (`db.transaction(...)`).

### Integration Points
- Backend endpoints:
  - `GET /api/campaigns/:id/drip-steps`: Retrieve steps for campaign.
  - `POST /api/campaigns/:id/drip-steps`: Upsert sequence steps.
  - `DELETE /api/campaigns/:id/drip-steps/:stepNumber`: Remove a step.
  - `POST /api/campaigns/:id/send-step-test`: Test-send a specific step to preview recipient.
- Frontend:
  - `CampaignsView.jsx`: Drip Sequence Studio section with step tabs, delay controls, threading toggle, and test button.

</code_context>

<specifics>
## Specific Ideas

- Default Cadence:
  - Step 1: Immediate outreach.
  - Step 2: 3 days after Step 1.
  - Step 3: 4 days after Step 2 (7 days total).
- Threading default: On. If turned off, step sends with fresh subject line and no `In-Reply-To` header.

</specifics>

<deferred>
## Deferred Ideas

- Inbound IMAP reply detection, automatic reply disarming (`CANCELLED_REPLIED`), and funnel conversion analytics are reserved for **Phase 12**.

</deferred>

---
*Phase: 11-multi-step-drip-sequence-engine-builder-studio*  
*Context gathered: 2026-10-03*
