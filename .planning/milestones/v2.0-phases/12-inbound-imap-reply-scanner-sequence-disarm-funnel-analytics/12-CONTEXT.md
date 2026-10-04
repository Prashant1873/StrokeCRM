# Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics - Context

**Gathered:** 2026-10-03  
**Status:** Ready for planning  
**Milestone:** v2.0 (Custom Domains & Automated Drips)  

<domain>
## Phase Boundary

Phase 12 delivers the inbound intelligence and safety layer for StrokeCRM:
1. IMAP Reply Scanner: Automatically scans connected IMAP inboxes (Custom Domain IMAP or Gmail IMAP `imap.gmail.com:993`) via background polling and manual trigger.
2. Sequence Disarm: Atomically transitions replied leads to `REPLIED` and nullifies `next_step_scheduled_at` to halt pending follow-ups immediately.
3. Auto-Responder Filtering: Identifies out-of-office (OOO), vacation, and bounce autoreplies via RFC headers (`Auto-Submitted`, `X-Autoreply`, `Precedence`) to avoid false sequence cancellations.
4. Manual Controls: Allows users to click "Mark as Replied" or "Cancel Follow-ups" per contact.
5. Funnel Analytics & Audit Export: Visual step conversion funnel (Contacts -> Step 1 -> Step 2 -> Step 3 -> Replies) in the Campaign Cockpit and downloadable CSV audit report.

Requirements: `REPLY-01`, `REPLY-02`, `REPLY-03`, `REPLY-04`, `DASH2-01`, `DASH2-02`.
</domain>

<decisions>
## Implementation Decisions

### IMAP Scanning & Protocol Resolver
- **D-01: Universal IMAP Client (`replyScannerService.js`)**: Create a dedicated backend service using `imapflow`. If the active provider is `custom_domain`, it connects using `custom_imap_*` settings. If the active provider is `gmail_app_password`, it connects to `imap.gmail.com:993` (SSL) with the user's Gmail email and app password. This ensures seamless reply detection regardless of which mail provider the user runs. — **Reversibility:** costly.
- **D-02: Search & Matching Strategy**: Scan the `INBOX` for emails received since the earliest active campaign start date (or within the last 14 days). Match incoming messages against campaign contacts by recipient email address and/or RFC 2822 `In-Reply-To` / `References` matching our recorded `initial_message_id`. — **Reversibility:** reversible.

### Sequence Disarming & Lead Status
- **D-03: Atomic Disarm Mechanism**: When a matching reply is found, the system sets `status = 'REPLIED'`, `replied_at = nowIso`, and `next_step_scheduled_at = NULL` in `database_records` (and `contacts`). This instantly and permanently stops any future drip step (Step 2 or 3) from being dispatched to that recipient. — **Reversibility:** costly.
- **D-04: Auto-Responder Detection**: Messages with `Auto-Submitted` (`auto-replied`, `auto-generated`), `X-Autoreply: yes`, `Precedence: bulk|auto_reply|junk`, or subject lines matching `/^(auto-reply|out of office|vacation|undeliverable)/i` are flagged as `AUTOREPLY` and do NOT disarm subsequent drip steps. — **Reversibility:** reversible.

### Manual Overrides & Funnel Reporting
- **D-05: 1-Click Manual Disarm**: In the database records inspection table and campaign lead preview, add a 1-click "Mark as Replied" and "Cancel Follow-up" button so users can manually stop sequences if a lead responded via LinkedIn, phone, or another channel. — **Reversibility:** reversible.
- **D-06: Step-by-Step Funnel Cockpit Card**: Add a visual funnel card in the Campaign Cockpit displaying drop-off percentages between Step 1, Step 2, Step 3, and Replies, accompanied by an instant "Export Campaign Audit CSV" button. — **Reversibility:** reversible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before implementing:**

- `server/db.js` — SQLite database schema, `settings`, `database_records`, `email_logs`, `campaign_drip_steps`.
- `server/queueService.js` — Dispatch loop, step progression, and queue status.
- `server/databaseService.js` — Database record queries and status mutations.
- `client/src/components/CampaignsView.jsx` — Campaign Cockpit layout, stats summary, and action buttons.
- `client/src/components/DatabasesView.jsx` — Database records table where manual disarm buttons will be exposed.
- `.planning/phases/11-multi-step-drip-sequence-engine-builder-studio/11-01-SUMMARY.md` — Drip step progression state.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `imapflow`: Already installed in `package.json` (^2.2.1) and used in `POST /api/auth/test-custom-imap`.
- `db.getSettings()`: Exposes `custom_imap_*` and `active_provider`.
- `authService.getActiveAccount()`: Exposes Gmail credentials for `imap.gmail.com:993` fallback.
- `databaseService.getIncludedStats(databaseId)`: Computes contact metrics.

### Established Patterns
- Anti-slop UI design adhering to `frontend-skill` (dark cockpit theme, smooth transitions, WCAG 2.2 AA contrast).
- Atomic SQLite operations via `better-sqlite3`.

### Integration Points
- Backend endpoints:
  - `POST /api/replies/scan`: Trigger manual IMAP inbox scan.
  - `GET /api/campaigns/:id/replies`: Fetch detected replies for a campaign.
  - `POST /api/campaigns/:id/contacts/:contactId/mark-replied`: Manual disarm trigger.
  - `POST /api/campaigns/:id/contacts/:contactId/cancel-followup`: Cancel future steps without marking replied.
  - `GET /api/campaigns/:id/export-audit`: Stream downloadable CSV audit report.
- Frontend:
  - `CampaignsView.jsx`: Visual Step Conversion Funnel card, "Scan Replies Now" button, and "Export Audit CSV" button.
  - `DatabasesView.jsx`: Row action controls for "Mark Replied" / "Cancel Follow-ups".

</code_context>

<deferred>
## Deferred Ideas (v3+)

- Inbound reply sentiment analysis (AI categorization as "Interested" / "Not Interested").
- Webhook dispatch on reply event (Zapier / Slack / Make).

</deferred>

---
*Phase: 12-inbound-imap-reply-scanner-sequence-disarm-funnel-analytics*  
*Context gathered: 2026-10-03*
