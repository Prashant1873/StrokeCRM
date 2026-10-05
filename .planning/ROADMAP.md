# Roadmap: StrokeCRM

## Milestones

- ✅ **v1.0 Initial MVP** — Phases 1-9 (shipped 2026-10-03)
- ✅ **v2.0 Custom Domains & Automated Drips** — Phases 10-12 (shipped 2026-10-03)
- ✅ **v3.0 UI Overhaul, Light Mode & Free AI Reply Intelligence** — Phases 13-15 (shipped 2026-10-05)
- ✅ **v4.0 Campaign Duplication, Rich Cadences & Contrast Hardening** — Phases 16-19 (shipped 2026-10-06)
- ✅ **v5.0 Delivery Failure Tracking & Advanced Gmail Integration** — Phases 20-21 (shipped 2026-10-06)

---

## Phases

<details>
<summary>✅ v1.0 Initial MVP (Phases 1-9) — SHIPPED 2026-10-03</summary>

- [x] Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway (completed 2026-10-03)
- [x] Phase 2: Lead Ingestion & Variable Header Mapping (completed 2026-10-03)
- [x] Phase 3: Template Personalization Engine & Spam Preflight (completed 2026-10-03)
- [x] Phase 4: Resilient Queue & Pacing Dispatcher (completed 2026-10-03)
- [x] Phase 5: A/B Testing Studio (completed 2026-10-03)
- [x] Phase 6: Day-Wise Analytics Dashboard & Polish (completed 2026-10-03)
- [x] Phase 7: Traceable Routing, Breadcrumb System & App Shell Architecture (completed 2026-10-03)
- [x] Phase 8: Multi-Step Wizards & Contextual Preflight Option Controls (completed 2026-10-03)
- [x] Phase 9: Frontend-Skill Polish, Apple Fluid Motion & WCAG 2.2 AA Hardening (completed 2026-10-03)

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Custom Domains & Automated Drips (Phases 10-12) — SHIPPED 2026-10-03</summary>

- [x] **Phase 10: Custom Domain SMTP & IMAP Account Gateway** (completed 2026-10-03)
- [x] **Phase 11: Multi-Step Drip Sequence Engine & Builder Studio** (completed 2026-10-03)
- [x] **Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics** (completed 2026-10-03)

See: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 UI Overhaul, Light Mode & Free AI Reply Intelligence (Phases 13-15) — SHIPPED 2026-10-05</summary>

- [x] **Phase 13: Dual-Theme Architecture & Design Token Engine** (completed 2026-10-05)
- [x] **Phase 14: System-Wide UI Modernization & Professional UX Copywriting** (completed 2026-10-05)
- [x] **Phase 15: Free AI Inbound Reply Sentiment Engine & Cockpit Intelligence** (completed 2026-10-05)

</details>

<details>
<summary>✅ v4.0 Campaign Duplication, Rich Cadences & Contrast Hardening (Phases 16-19) — SHIPPED 2026-10-06</summary>

- [x] **Phase 16: Campaign Duplication Engine & Triad Cloning** (completed 2026-10-06)
- [x] **Phase 17: Rich Text Formatting Studio for Follow-Up Cadences** (completed 2026-10-06)
- [x] **Phase 18: System-Wide Light Mode WCAG Contrast & Token Hardening** (completed 2026-10-06)
- [x] **Phase 19: Template Assignment & Multi-Variant Bindings in A/B Testing** (completed 2026-10-06)

</details>

<details open>
<summary>✅ v5.0 Delivery Failure Tracking & Advanced Gmail Integration (Phases 20-21) — SHIPPED 2026-10-06</summary>

- [x] **Phase 20: Delivery Failure & Inaccurate Email Tracking Subsystem** (completed 2026-10-06)
- [x] **Phase 21: Native Gmail Auto-Labeling & Thread Organization Subsystem** (completed 2026-10-06)

</details>

---

## Phase Details

### Phase 16: Campaign Duplication Engine & Triad Cloning

**Goal**: Enable 1-click campaign duplication allowing users to clone an entire campaign with a new name and bind it to a new database while retaining all configurations and drip steps.  
**Depends on**: Phase 15  
**Requirements**: [DUP-01, DUP-02, DUP-03]  
**Success Criteria**:
1. User can click "Duplicate" on any campaign card in the Campaigns Directory or in the Campaign Cockpit header to open the Duplicate modal.
2. Modal validates that a non-empty new name is supplied and that a valid unattached database is chosen or a new spreadsheet uploaded.
3. Cloned campaign transactionally replicates all campaign attributes (`subject_a`, `body_a`, `subject_b`, `body_b`, `is_ab_test`, `min_delay`, `max_delay`, `daily_limit`, `template_id`, `sender_account_id`, `sender_provider`, `cc_addresses`, `bcc_addresses`) and all multi-step cadence rows from `campaign_drip_steps`.
4. Cloned campaign starts in `DRAFT` status with `sent_count = 0`, `failed_count = 0`, `reply_count = 0`, and contacts properly attached from the target database.

### Phase 17: Rich Text Formatting Studio for Follow-Up Cadences

**Goal**: Equip `DripSequenceStudio` with a rich text formatting toolbar for follow-up steps, providing bold, italics, links, lists, and dynamic token pill insertions with dual-part HTML/plaintext deliverability.  
**Depends on**: Phase 16  
**Requirements**: [RICH-01, RICH-02, RICH-03]  
**Success Criteria**:
1. Users writing custom follow-ups (Step 2 and Step 3) in `DripSequenceStudio` have access to a rich formatting toolbar (Bold, Italic, Underline, Bullet List, Numbered List, Link, Clear Format).
2. Clicking dynamic header variable chips (`{{FirstName}}`, `{{Company}}`) inserts variables at the current cursor position within the rich editor.
3. Content is stored as clean HTML, previewed accurately in test sends, and dispatched as RFC 2046 multipart MIME with plaintext fallback.

### Phase 18: System-Wide Light Mode WCAG Contrast & Token Hardening

**Goal**: Ensure strict WCAG 2.2 AA contrast compliance (>4.5:1) throughout light mode by refining semantic tokens in `index.css` and purging all lingering hardcoded dark utility classes (`slate-900`, `slate-800`, `text-slate-400`).  
**Depends on**: Phase 17  
**Requirements**: [CONTRAST-01, CONTRAST-02, CONTRAST-03, CONTRAST-04]  
**Success Criteria**:
1. Light mode text tokens in `index.css` (`--text-muted`, `--text-secondary`) guarantee >= 4.5:1 contrast against white surfaces, eliminating washed-out labels.
2. All hardcoded `slate-` colors across `CampaignsView`, `ABTestingView`, `SettingsView`, `DripSequenceStudio`, and `DatabasesView` are replaced with semantic theme tokens (`bg-surface`, `bg-subtle`, `text-primary`, `border-subtle`).
3. Primary, secondary, outline, and destructive buttons have distinct borders, accessible hover states, and clear focus-visible rings in both light and dark modes.
4. Modals, dropdown selectors, row pickers, and table headers render cleanly on light surfaces with high readability.

### Phase 19: Template Assignment & Multi-Variant Bindings in A/B Testing

**Goal**: Allow users to assign saved templates directly to Variant A and Variant B in the A/B Testing Studio, displaying comparative deliverability metrics and resolving templates dynamically at dispatch.  
**Depends on**: Phase 18  
**Requirements**: [AB-01, AB-02, AB-03]  
**Success Criteria**:
1. `ABTestingView` features an interactive template picker for Variant A and Variant B, enabling users to bind or import any saved template.
2. Selecting a template populates the variant content and displays side-by-side comparative metadata (word count, detected tokens, spam risk score).
3. The outbound dispatch engine (`queueService.js`) dynamically resolves attachments and template content per variant during split outreach runs.

### Phase 20: Delivery Failure & Inaccurate Email Tracking Subsystem

**Goal**: Automatically detect, classify, and track delivery-failed and bounced emails from Google Mailer-Daemon and SMTP dispatch errors, disarming future cadence steps and enabling export of inaccurate leads.  
**Depends on**: Phase 19  
**Requirements**: [BOUNCE-01, BOUNCE-02, BOUNCE-03, BOUNCE-04]  
**Success Criteria**:
1. `replyScannerService.js` actively parses incoming asynchronous bounce notifications from `mailer-daemon@googlemail.com`, `postmaster@*`, and delivery status headers, accurately extracting the failed recipient address and diagnostic error code.
2. `queueService.js` identifies synchronous permanent recipient rejections at SMTP time, recording error details immediately.
3. Bounced contacts transition atomically to `BOUNCED` / `FAILED_INVALID` status with timestamps and error codes, permanently disarming any future scheduled cadence steps.
4. Campaign Cockpit and Database Inspector feature a dedicated "Delivery Failures" / "Bounced" filter tab with diagnostic chips and 1-click "Export Inaccurate Leads (CSV)" for list hygiene.

### Phase 21: Native Gmail Auto-Labeling & Thread Organization Subsystem

**Goal**: Leverage native Gmail IMAP extensions (`X-GM-LABELS`) to automatically categorize and synchronize campaign threads, replies, and bounces into an organized folder hierarchy in the user's Gmail inbox.  
**Depends on**: Phase 20  
**Requirements**: [GMAIL-01, GMAIL-02, GMAIL-03]  
**Success Criteria**:
1. System creates and manages Gmail label hierarchy (`StrokeCRM`, `StrokeCRM/Interested`, `StrokeCRM/Replied`, `StrokeCRM/Bounced`, and `StrokeCRM/Campaign: [Name]`) without affecting non-CRM email.
2. Sent messages are auto-labeled with campaign identifiers, incoming replies receive sentiment-specific labels, and bounced threads are tagged for immediate inbox visibility.
3. SettingsView includes a toggle to enable/disable Gmail Auto-Labeling with safe fallback for standard non-Gmail IMAP accounts.

---
*Roadmap updated: 2026-10-06 for Milestone v5.0*
