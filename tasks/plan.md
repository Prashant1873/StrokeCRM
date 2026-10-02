# Implementation Plan: StrokeCRM

## Overview

StrokeCRM is a free, self-hosted, privacy-first cold email outreach CRM running locally on Node.js + Express + React (Vite) + SQLite. It controls the user's Gmail (via Google App Password SMTP or OAuth2) to send personalized outreach from Excel/CSV spreadsheets with human-like pacing, anti-spam protections, day-wise analytics, and A/B split testing.

## Architecture Decisions

- **Full-Stack Separation with Unified Runner**: Backend API on Express (`http://localhost:3001`), Frontend on Vite React (`http://localhost:5173`), with `concurrently` / `npm run dev` to launch both with one command.
- **Local Persistence with SQLite**: `better-sqlite3` database file `data/strokecrm.db` storing accounts, leads, templates, campaigns, dispatch queues, and day-wise analytics.
- **State Machine for Queue**: Leads are processed through explicit statuses (`PENDING`, `SENDING`, `SENT`, `FAILED`, `PAUSED`). Dispatch workers use atomic DB updates to ensure zero duplicate emails even across app restarts.
- **Human-Paced Dispatch Engine**: Asynchronous timer with configurable jitter (e.g. min 30s, max 90s), daily send caps, and working-hours guard to keep Gmail sender reputation pristine.
- **Frontend Craft**: Built following `frontend-skill` standards with high contrast, semantic typography, keyboard accessibility, smooth animations, and zero generic slop.

---

## Task List

### Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway
- [ ] Task 1.1: Initialize project repository with Express backend, Vite React frontend, Tailwind CSS, and SQLite schema.
- [ ] Task 1.2: Implement dual Gmail auth services: Google App Password (SMTP/IMAP) and Google OAuth2 credential verification.
- [ ] Task 1.3: Build Settings & Gmail Connection UI with real-time "Test Connection" button and status banner.

### Checkpoint 1: Auth & Foundation
- [ ] Backend and frontend run concurrently.
- [ ] User can input Gmail App Password, click Test Connection, and receive successful SMTP handshake verification.

### Phase 2: Lead Ingestion & Variable Header Mapping
- [ ] Task 2.1: Implement backend Excel/CSV parsing engine supporting `.xlsx`, `.xls`, `.csv` with auto-detected email fields.
- [ ] Task 2.2: Build Lead Import UI with drag-and-drop file upload, column header selector, and paginated lead preview table.

### Checkpoint 2: Data Ingestion
- [ ] User uploads any Excel/CSV spreadsheet.
- [ ] Headers are detected, rows are stored in SQLite, and preview table shows accurate lead data.

### Phase 3: Template Personalization Engine & Spam Preflight
- [ ] Task 3.1: Build Handlebars-compatible template merger with fallback support (`{{FirstName | "there"}}`).
- [ ] Task 3.2: Implement spam trigger word detector analyzing subject lines and email body.
- [ ] Task 3.3: Build Template Composer UI with variable tag pills, spam risk score meter, and real-time per-lead rendering preview.

### Checkpoint 3: Template Engine
- [ ] Templates correctly replace variables with spreadsheet data.
- [ ] Spam words are flagged visually in real time.

### Phase 4: Resilient Queue & Pacing Dispatcher
- [ ] Task 4.1: Build SQLite persistent dispatch queue worker with jitter pacing (random delays), daily limits, and active working-hour filters.
- [ ] Task 4.2: Build Campaign Dispatch Controller with Start, Pause, Resume, and Stop controls.
- [ ] Task 4.3: Implement Campaign Execution UI displaying live send progress, remaining queue, and countdown to next send.

### Checkpoint 4: Live Outbound Dispatch
- [ ] Outbound emails send through Gmail with randomized delay between sends.
- [ ] Pausing and resuming never duplicates any sent email.

### Phase 5: A/B Testing Studio
- [ ] Task 5.1: Implement A/B testing backend logic with 50/50 alternating/random cohort assignment.
- [ ] Task 5.2: Build dedicated A/B Testing UI with side-by-side variant editor and comparative performance cards.

### Checkpoint 5: A/B Testing
- [ ] User creates Variant A and Variant B.
- [ ] Dispatcher splits audience evenly and displays comparative send metrics.

### Phase 6: Day-Wise Analytics Dashboard & Craft Polish
- [ ] Task 6.1: Build day-wise send tracking engine aggregating sends per day and daily Gmail quota consumption.
- [ ] Task 6.2: Build Analytics Dashboard with Recharts visualization, quota progress gauge, and CSV audit export.
- [ ] Task 6.3: Perform visual craft review, WCAG 2.2 AA accessibility check, and end-to-end user journey validation.

### Checkpoint 6: Production Verification
- [x] Complete end-to-end user workflow: Auth → Upload Leads → Compose Template with A/B → Launch Paced Dispatch → Monitor Day-Wise Analytics.

---

## Milestone v1.1: Interactive Navigation, Step Cockpit & UX Overhaul

### Phase 7: Traceable Routing, Breadcrumb System & App Shell Architecture
- [x] Task 7.1: Build URL-Indexed Route & History Controller with browser back/forward sync, deep linking, and view history stack.
- [x] Task 7.2: Build Traceable Breadcrumbs Component with clickable ancestor jumps, active path pill, and one-key (`Esc`/Back) backward tracing.
- [x] Task 7.3: Overhaul App Shell with persistent breadcrumb header, collapsible cockpit navigation, and active path indicators.

### Checkpoint 7: Navigation & Breadcrumbs
- [x] URLs reflect current page and sub-views (e.g. `#/campaigns/:id/preflight`, `#/leads/import/map`).
- [x] Browser Back and Forward buttons navigate cleanly between visited screens without data loss.
- [x] Clicking any breadcrumb ancestor instantly returns to that exact view level.

### Phase 8: Multi-Step Wizards & Contextual Preflight Option Controls
- [x] Task 8.1: Build Campaign Launch Preflight Screen with interactive "Enforce Working Hours (9 AM - 6 PM)" switch, jitter sliders, and test email gate.
- [x] Task 8.2: Build 3-Step Lead Ingestion Wizard (Upload → Column Mapping → Validation Preview) with duplicate handling switch and step continuity.
- [x] Task 8.3: Build Template Preflight Step View with real-time spam preflight meter, variable insertion pills, and per-lead rendering preview.

### Checkpoint 8: Step Controls & Preflight Cockpit
- [x] User can launch a campaign with working hours enforced or toggle off to dispatch immediately 24/7.
- [x] User can step backward and forward in the Leads wizard without losing uploaded spreadsheet data.
- [x] All preflight gates validate Gmail connectivity, quota headroom, and spam triggers prior to sending.

### Phase 9: Frontend-Skill Polish, Apple Fluid Motion & WCAG 2.2 AA Hardening
- [x] Task 9.1: Implement Apple fluid motion & spring physics on all switches, drawers, and modal transitions with zero pointer latency.
- [x] Task 9.2: Apply anti-slop visual craft pass: dark cockpit theme (`#0b0f17`), 4px/8px optical grid alignment, and typographic hierarchy.
- [x] Task 9.3: Implement WCAG 2.2 AA accessibility scan, full keyboard traversal (`Tab`, `Space`, `Escape`), and high-contrast visible focus rings.

### Checkpoint 9: Impeccable Delivery & Final Verification
- [x] Zero layout shifts and zero animation frame drops during transitions.
- [x] Full keyboard navigation across all views, breadcrumbs, and preflight controls.
- [x] High-contrast, distraction-free cockpit aesthetic meeting `frontend-skill` standards.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Form / upload state loss during backward navigation | High | Colocate state in parent route controller or lightweight client store so stepping backward preserves uploaded sheets and mapped fields. |
| Browser back button exiting app instead of sub-step | Med | Synchronize view stack with `window.location.hash` and pushState so native back buttons cleanly step back through breadcrumbs. |
| Inadvertent bypass of working hours causing Gmail spam flag | High | Default the "Enforce Working Hours" switch to ON with explicit visual confirmation when toggling OFF to 24/7 immediate mode. |
