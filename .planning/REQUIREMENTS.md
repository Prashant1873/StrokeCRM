# Requirements: StrokeCRM Milestone v4.0

**Milestone:** v4.0 — Campaign Duplication, Rich Cadences & Contrast Hardening  
**Status:** Scoped & Active  
**Last Updated:** 2026-10-06  

---

## v4.0 Requirements

### Campaign & Triad Duplication (`DUP`)

- [x] **DUP-01**: User can trigger "Duplicate" from any Campaign card in the Campaigns Directory (`#/campaigns`) or the Campaign Cockpit (`#/campaigns/:id`) action bar, launching the Duplicate Campaign modal.
- [x] **DUP-02**: Modal prompts user for a new campaign name (prefilled as `[Name] (Copy)`) and enforces selecting an unattached database or uploading a fresh spreadsheet to preserve the strict 1:1 Triad model.
- [x] **DUP-03**: Backend endpoint (`POST /api/campaigns/:id/duplicate`) transactionally clones all campaign configurations (subject/body A & B, sender accounts, pacing delays, jitter, daily limits, CC/BCC, template references) and all associated cadence rows (`campaign_drip_steps`), initializing the clone in `DRAFT` status with reset send counters.

### Rich Text Follow-Up Formatting Studio (`RICH`)

- [x] **RICH-01**: `DripSequenceStudio` provides a WYSIWYG formatting toolbar for follow-up steps (Bold, Italic, Underline, Bullet List, Numbered List, Link, Clear Formatting), replacing the plain textarea.
- [x] **RICH-02**: Dynamic audience header variable chips (`{{FirstName}}`, `{{Company}}`) insert seamlessly at the active editor selection/cursor without losing focus.
- [x] **RICH-03**: Follow-up editor stores clean, sanitized HTML and produces automatic plain-text fallbacks for dual-part RFC 2046 multipart MIME email dispatch.

### System-Wide Light Mode WCAG Contrast & Token Hardening (`CONTRAST`)

- [x] **CONTRAST-01**: Update CSS design tokens in `index.css` for Light Mode so that `--text-muted` and `--text-secondary` strictly satisfy WCAG 2.2 AA contrast (>= 4.5:1 for body copy and >= 3:1 for large text/icons against `#ffffff` and `#fafafa`).
- [x] **CONTRAST-02**: Purge hardcoded dark utility classes (`bg-slate-900`, `bg-slate-800`, `text-slate-400`, `text-slate-300`, `border-slate-800`) across all views (`CampaignsView`, `ABTestingView`, `SettingsView`, `DripSequenceStudio`, `DatabasesView`), migrating to semantic tokens (`bg-surface`, `bg-subtle`, `text-primary`, `text-secondary`, `border-subtle`).
- [x] **CONTRAST-03**: Standardize primary, secondary, and destructive button styles to ensure distinct visible borders, accessible hover states, and clear focus-visible rings in both light and dark modes.
- [x] **CONTRAST-04**: Fix contrast in modals, row pickers, and table headers so that light mode modal backdrops, dialog surfaces, search inputs, and table headers never render as dark slate patches or unreadable low-contrast text.

### Template Assignment to Variants in A/B Testing (`AB`)

- [x] **AB-01**: `ABTestingView` provides an interactive "Assign Saved Template" dropdown selector for Variant A and Variant B, enabling users to populate or link templates directly.
- [x] **AB-02**: Selecting a template populates the subject and body while displaying side-by-side comparative metadata (detected variable tokens, word counts, and spam risk radar).
- [x] **AB-03**: Outbound dispatch engine (`queueService.js`) dynamically resolves per-variant template attachments and configuration during split outreach execution.

---

## v5.0 Requirements (Active)

### Delivery Failure & Inaccurate Email Tracking (`BOUNCE`)

- [ ] **BOUNCE-01**: Inbound Mailer-Daemon & NDR parser in `replyScannerService.js` detecting bounce messages from `mailer-daemon@googlemail.com`, `postmaster@*`, and RFC 3464 delivery status notifications, extracting the recipient email and diagnostic code.
- [ ] **BOUNCE-02**: Outbound SMTP delivery error classifier in `queueService.js` identifying permanent recipient errors (`550`, `553`, `Invalid recipient`, `No recipients defined`) vs transient connection timeouts.
- [ ] **BOUNCE-03**: Atomic state transition marking contacts as `BOUNCED` with `bounce_reason` and `bounced_at`, immediately disarming and wiping all scheduled future drip cadence steps.
- [ ] **BOUNCE-04**: Delivery Failure & Inaccurate Leads Tracker in Campaign Cockpit and Database Inspector with filter tab, diagnostic error chips, and 1-click "Export Inaccurate Leads (CSV)".

### Native Gmail Auto-Labeling & Thread Organization (`GMAIL`)

- [ ] **GMAIL-01**: Gmail IMAP `X-GM-LABELS` hierarchy management creating and synchronizing labels: `StrokeCRM`, `StrokeCRM/Interested`, `StrokeCRM/Replied`, `StrokeCRM/Bounced`, and `StrokeCRM/Campaign: [Name]`.
- [ ] **GMAIL-02**: Real-time label assignment tagging sent campaign threads, incoming replies by sentiment, and bounced threads directly in Gmail.
- [ ] **GMAIL-03**: Settings toggle for Gmail Auto-Labeling with fallback handling for non-Gmail IMAP accounts and UI sync indicators.

---

## Archival: Milestone v3.0 Requirements (Shipped 2026-10-05)

<details>
<summary>v3.0 UI Overhaul, Light Mode & Free AI Reply Intelligence (Completed)</summary>

- [x] **THEME-01**: User can toggle between Dark Mode and Light Mode with immediate visual transition and zero page reload.
- [x] **THEME-02**: System automatically persists theme preference in `localStorage` and falls back cleanly to OS `prefers-color-scheme` on first visit.
- [x] **THEME-03**: App prevents Flash of Unstyled Theme (FOUT) on load via synchronous pre-render theme attribute application.
- [x] **THEME-04**: Semantic CSS variable token system ensures WCAG AA compliant contrast (>4.5:1 for body copy) across both dark and light modes.
- [x] **COPY-01**: System-wide UX copy, headers, action verbs, and error notifications use clear, authoritative B2B SaaS outreach terminology.
- [x] **COPY-02**: Deliverability and configuration parameters feature clear explanatory tooltips (pacing jitter, RFC 2822 threading, daily caps, IMAP reply disarm).
- [x] **COPY-03**: User can browse and preview a built-in gallery of high-converting cold outreach starter templates (Direct Pitch, Social Proof Teaser, Follow-Up Bump, Breakup Closing).
- [x] **COPY-04**: User can clone any starter preset into their active templates collection with pre-mapped variable pills with a single click.
- [x] **COPY-05**: Dashboard cards, data tables, and preflight controls feature elevated typography, subtle borders, and fluid spring micro-interactions adhering to `frontend-skill`.
- [x] **SENT-01**: User can enter and verify a free Google Gemini 1.5 Flash API key in Settings with real-time handshake check.
- [x] **SENT-02**: Inbound IMAP reply scanner triggers asynchronous sentiment analysis on newly detected lead replies immediately following atomic sequence disarming.
- [x] **SENT-03**: Sentiment engine sanitizes email bodies (strips quoted thread history) and classifies replies into: `Interested`, `Question`, `Follow Up`, `Not Interested`, or `Unsubscribe`, along with a 1-sentence summary.
- [x] **SENT-04**: System includes a built-in zero-dependency regex/keyword heuristic classifier that operates offline or as an instant fallback when no API key is provided.
- [x] **SENT-05**: User can view color-coded sentiment badges, confidence scores, and reply summaries in the Campaign Cockpit and Database Inspector.
- [x] **SENT-06**: User can filter campaign leads by sentiment category (`All`, `Interested`, `Questions`, `Follow Up`, `Not Interested`) with 1-click tab controls.
- [x] **SENT-07**: User can manually override or correct any lead's classified sentiment directly from the Database Inspector.

</details>

---

## Future Requirements (v6.0+)

- **ROT-01**: Multi-account mailbox pool rotation with round-robin dispatch.
- **ROT-02**: Per-mailbox warmup ramp schedule.
- **PIPE-01**: Interactive drag-and-drop Kanban deal pipeline for replied leads.
- **DRAFT-01**: "Review in Gmail" mode generating campaign batches directly to Gmail Drafts.
- **SUPPR-01**: Global cross-campaign suppression blacklist preventing re-import of known bounced emails.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DUP-01 | Phase 16 | Complete |
| DUP-02 | Phase 16 | Complete |
| DUP-03 | Phase 16 | Complete |
| RICH-01 | Phase 17 | Complete |
| RICH-02 | Phase 17 | Complete |
| RICH-03 | Phase 17 | Complete |
| CONTRAST-01 | Phase 18 | Complete |
| CONTRAST-02 | Phase 18 | Complete |
| CONTRAST-03 | Phase 18 | Complete |
| CONTRAST-04 | Phase 18 | Complete |
| AB-01 | Phase 19 | Complete |
| AB-02 | Phase 19 | Complete |
| AB-03 | Phase 19 | Complete |
| BOUNCE-01 | Phase 20 | Complete |
| BOUNCE-02 | Phase 20 | Complete |
| BOUNCE-03 | Phase 20 | Complete |
| BOUNCE-04 | Phase 20 | Complete |
| GMAIL-01 | Phase 21 | Complete |
| GMAIL-02 | Phase 21 | Complete |
| GMAIL-03 | Phase 21 | Complete |

