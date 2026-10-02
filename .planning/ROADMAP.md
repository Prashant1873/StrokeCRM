# Roadmap: StrokeCRM

## Overview

StrokeCRM will be built in 6 structured phases: from project foundation & dual Gmail authentication, to contact ingestion, dynamic template engine with spam safeguards, resilient pacing & dispatch queue, dedicated A/B testing suite, and an anti-slop day-wise analytics dashboard.

## Phases

- [ ] **Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway** - Set up full-stack Node.js + Express + React (Vite) + SQLite project, implement App Password SMTP & OAuth2 connections, credential testing, and encrypted local storage.
- [ ] **Phase 2: Lead Ingestion & Variable Header Mapping** - Upload `.xlsx`, `.xls`, `.csv` files, parse headers, auto-detect emails, and display preview table.
- [ ] **Phase 3: Template Personalization Engine & Spam Preflight** - Variable interpolation (`{{FirstName}}`), fallback tokens, live per-row rendering preview, and spam buzzword scanner.
- [ ] **Phase 4: Resilient Queue & Pacing Dispatcher** - SQLite queue state machine, randomized jitter, daily limit quota guard, working-hours scheduler, and pause/resume execution.
- [ ] **Phase 5: A/B Testing Studio** - Variant A/B configuration (subject line/body), 50/50 cohort splitting, and comparative metrics page.
- [ ] **Phase 6: Day-Wise Analytics Dashboard & Polish** - Comprehensive analytics dashboard with day-wise send charts, quota consumption gauges, live activity feed, exportable audit logs, and WCAG AA design polish.

---

## Phase Details

### Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway
**Goal**: Establish the full-stack architecture and reliable connection to Gmail via App Password (SMTP) and OAuth2.  
**Depends on**: Nothing  
**Requirements**: [AUTH-01, AUTH-02, AUTH-03]  
**Success Criteria**:
1. User can launch backend server and React frontend simultaneously with a single command.
2. User can enter a Gmail address and 16-character App Password, click "Test Connection", and receive instant verification or clear diagnostic errors.
3. User can optionally configure Google OAuth2 Client ID/Secret with token refresh.
4. Settings and credentials persist reliably in local SQLite.

### Phase 2: Lead Ingestion & Variable Header Mapping
**Goal**: Allow uploading and inspection of lead lists in Excel or CSV format.  
**Depends on**: Phase 1  
**Requirements**: [LEAD-01, LEAD-02, LEAD-03]  
**Success Criteria**:
1. User can drag and drop any `.xlsx`, `.xls`, or `.csv` file.
2. System extracts all column headers and automatically selects the email column.
3. User can inspect a paginated preview table showing total leads and detected fields.

### Phase 3: Template Personalization Engine & Spam Preflight
**Goal**: Build the email composition interface with dynamic variable replacement and spam trigger analysis.  
**Depends on**: Phase 2  
**Requirements**: [TMPL-01, TMPL-02, TMPL-03, TMPL-04]  
**Success Criteria**:
1. User can insert variables like `{{FirstName}}` or `{{Company | "your company"}}` into subject and body.
2. User can click through individual lead rows to see exactly how the email renders for each recipient.
3. Spam preflight scanner warns the user if spam trigger words (e.g. "100% free", "act now", "guarantee") are present in the copy.

### Phase 4: Resilient Queue & Pacing Dispatcher
**Goal**: Build the background email sending queue with humanized intervals and throttle guards.  
**Depends on**: Phase 3  
**Requirements**: [DISP-01, DISP-02, DISP-03, DISP-04, DISP-05]  
**Success Criteria**:
1. User can configure pacing: min/max random delay (e.g. 45s-90s) and daily cap.
2. Emails send one-by-one with randomized human-like delays through user's Gmail.
3. Queue persists in SQLite: user can pause, stop, or close the app, and resume without sending any duplicate emails.
4. Sending respects working hours and stops when daily cap is reached.

### Phase 5: A/B Testing Studio
**Goal**: Provide split-testing capabilities for cold outreach campaigns.  
**Depends on**: Phase 4  
**Requirements**: [AB-01, AB-02, AB-03]  
**Success Criteria**:
1. User can define Variant A and Variant B with different subject lines or body copy.
2. Dispatcher alternates or randomly splits recipients 50/50 between variants.
3. Dedicated A/B test view displays side-by-side stats: total sent, delivery status, and engagement.

### Phase 6: Day-Wise Analytics Dashboard & Polish
**Goal**: Deliver a day-wise tracking dashboard, audit logging, and refined UI craft per frontend-skill.  
**Depends on**: Phase 5  
**Requirements**: [DASH-01, DASH-02, DASH-03, DASH-04]  
**Success Criteria**:
1. Dashboard displays day-wise breakdown chart of emails sent per day.
2. Visual gauge displays remaining Gmail quota for the day (e.g. 84/500 sent).
3. User can export CSV audit log of all sent, failed, and pending emails with timestamp and error details.
4. Clean, responsive, keyboard-navigable UI with zero slop and smooth micro-animations.

---

## Progress

**Execution Order:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffolding & Dual Gmail Auth | 0/1 | Not started | - |
| 2. Lead Ingestion & Variable Mapping | 0/1 | Not started | - |
| 3. Template Engine & Spam Guard | 0/1 | Not started | - |
| 4. Queue & Pacing Dispatcher | 0/1 | Not started | - |
| 5. A/B Testing Studio | 0/1 | Not started | - |
| 6. Day-Wise Dashboard & Polish | 0/1 | Not started | - |
