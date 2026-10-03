# Milestones

## v2.0 Custom Domains & Automated Drips (Shipped: 2026-10-03)

**Phases completed:** 3 phases (Phases 10–12), 12 commits (git range `b319899` → `24003dd`)

**Key accomplishments:**
- **Universal Dual Gateway (Custom Domains & Gmail)**: Outbound SMTP and inbound IMAP connectivity for custom business email domains (Zoho, Fastmail, Microsoft 365, Namecheap PrivateEmail, and self-hosted mail servers) alongside Gmail accounts with live connection verification.
- **Multi-Step Drip Sequence Studio**: Visual 3-step cadence builder (Step 1 Pitch, Step 2 Follow-up, Step 3 Closing) with customizable delay days/hours, quick variable insertion pills, and template bindings.
- **RFC 2822 Organic Threading**: Follow-up emails inject `In-Reply-To` and `References` headers referencing Step 1 `Message-ID` so follow-ups arrive naturally in the recipient's existing inbox conversation.
- **Non-Destructive Scheduled Delay Queue**: Queue engine automatically transitions contacts across delay windows, entering `WAITING_SCHEDULE` rather than closing prematurely when Step 1 concludes.
- **Inbound IMAP Reply Scanner & Autoreply Filter**: Automated background polling every 5 minutes and on-demand manual triggers to detect lead responses, with robust RFC 3834 auto-responder and OOO filtering.
- **Atomic Sequence Disarm State Machine**: Incoming replies automatically set `status = 'REPLIED'`, record `replied_at`, and atomically set `next_step_scheduled_at = NULL` to permanently halt subsequent follow-ups.
- **Visual Conversion Funnel & Audit CSV Exporter**: 5-tier visual conversion drop-off cards in the Campaign Cockpit and streaming RFC 4180 audit CSV export with per-step sent and reply timestamps.
- **Manual Cockpit Disarm Controls**: 1-click manual "Mark Replied" and "Cancel Next" buttons in the Database Inspector table for immediate operator intervention.

---

## v1.0 Initial MVP (Shipped: 2026-10-03)

**Phases completed:** 9 phases, 18 commits (git range `98fa681` → `5f72ed1`)

**Key accomplishments:**
- **Dual Gmail Auth Gateway**: Instant Google App Passwords SMTP and OAuth2 connection with encrypted SQLite local persistence.
- **Lead Ingestion & Column Mapping**: Universal `.xlsx`, `.xls`, and `.csv` parsing with automatic email header detection and interactive preview.
- **Template Personalization Engine**: Rich HTML formatting, Handlebars variable substitution (`{{var | fallback}}`), per-lead live preview, and preflight spam keyword scanning.
- **Resilient Throttle-Safe Dispatch Queue**: SQLite state machine with randomized jitter delays, working hours schedule windows, daily send quotas, and duplicate-safe pause/resume.
- **A/B Testing Studio**: Automatic 50/50 split across subject line and copy variants with comparative performance tracking.
- **Day-Wise Analytics & Audit Trail**: Real-time progress bar, daily send quota gauge, send-history timeline chart, and exportable CSV audit log.
- **Traceable App Shell & Preflight Cockpit**: URL hash routing with browser history support, hierarchical breadcrumbs, working-hours toggle, and test-send verification.

---

