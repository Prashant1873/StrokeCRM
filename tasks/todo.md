# Task List: StrokeCRM

## Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway

- [x] **Task 1.1**: Initialize project repository with Express backend, Vite React frontend, Tailwind CSS, and SQLite schema
  - *Acceptance Criteria*:
    - Root `package.json` with scripts to launch backend (`server/index.js`), frontend (`client`), or both concurrently.
    - SQLite database initialized in `data/strokecrm.db` with tables for settings, accounts, contacts, campaigns, email_logs.
  - *Verification*: `npm run dev` starts both server and client without errors.

- [x] **Task 1.2**: Implement dual Gmail auth services (App Password SMTP & OAuth2)
  - *Acceptance Criteria*:
    - Nodemailer SMTP verification endpoint `/api/auth/test-smtp` with Gmail App Password.
    - Google OAuth2 token exchange and verification endpoint `/api/auth/google`.
    - Secure SQLite persistence for sender credentials and configuration.
  - *Verification*: POST request to `/api/auth/test-smtp` with valid credentials returns `{ success: true }`.

- [x] **Task 1.3**: Build Settings & Gmail Connection UI
  - *Acceptance Criteria*:
    - UI page to configure Gmail App Password or OAuth2.
    - Interactive "Test Connection" button with instant feedback (success pill or specific diagnostic error).
    - Status indicator showing whether Gmail sender is connected and ready.
  - *Verification*: User enters Gmail details, clicks "Test Connection", and sees verified status badge.

## Checkpoint 1: Auth & Foundation
- [x] Backend and frontend run concurrently
- [x] Gmail App Password SMTP verification verified end-to-end

---

## Phase 2: Lead Ingestion & Variable Header Mapping

- [x] **Task 2.1**: Implement backend Excel/CSV parsing engine
  - *Acceptance Criteria*:
    - Endpoint `/api/leads/upload` accepts `.xlsx`, `.xls`, and `.csv`.
    - Extracts all sheet headers, automatically detects the recipient email column, and stores records in SQLite.
  - *Verification*: Upload test spreadsheet, verify parsed JSON headers and row counts in response.

- [x] **Task 2.2**: Build Lead Import UI with mapping and preview
  - *Acceptance Criteria*:
    - Drag-and-drop file upload zone with file size/type validation.
    - Dropdown to select/confirm the email column.
    - Paginated data preview table displaying columns, contact count, and valid email badges.
  - *Verification*: User uploads sample file, selects email column, and reviews table rows.

## Checkpoint 2: Data Ingestion
- [x] Contacts successfully ingested into SQLite with arbitrary custom headers intact.

---

## Phase 3: Template Personalization Engine & Spam Preflight

- [x] **Task 3.1**: Build Handlebars-compatible template merger & variable extractor
  - *Acceptance Criteria*:
    - Supports syntax `{{ColumnName}}` and default fallback `{{ColumnName | "default"}}`.
    - Handles case-insensitive column matching.
  - *Verification*: Unit test template with sample row data and verify interpolated string.

- [x] **Task 3.2**: Implement spam trigger word detector
  - *Acceptance Criteria*:
    - Checks subject and body against curated database of 150+ spam buzzwords (e.g., "100% free", "guaranteed", "urgent action").
    - Returns risk rating (Low, Medium, High) and list of matched words.
  - *Verification*: Feeding a spam-heavy text triggers high risk warning with flagged terms.

- [x] **Task 3.3**: Build Template Composer UI with live preview and tag pills
  - *Acceptance Criteria*:
    - Clickable column pills to insert variables at cursor position into Subject or Body.
    - Real-time side-by-side preview showing rendered email for row 1, row 2, etc.
    - Visual Spam Score badge updating dynamically as user types.
  - *Verification*: User inserts pills, types copy, cycles between leads to see live preview.

## Checkpoint 3: Template Engine
- [x] Accurate variable interpolation across dynamic spreadsheet columns with live preview and spam scoring.

---

## Phase 4: Resilient Queue & Pacing Dispatcher

- [x] **Task 4.1**: Build SQLite persistent dispatch queue worker with jitter pacing
  - *Acceptance Criteria*:
    - Queue worker selects next pending recipient, waits randomized delay between `minDelay` and `maxDelay` seconds, and sends via Gmail.
    - Atomically updates record to `SENT` or `FAILED` with timestamp and error message.
    - Respects daily send cap (stops if cap reached for the calendar day).
  - *Verification*: Queue processes 3 test emails with configured 5-second interval and updates DB states.

- [x] **Task 4.2**: Build Campaign Dispatch Controller (Start, Pause, Resume, Stop)
  - *Acceptance Criteria*:
    - API endpoints `/api/campaigns/:id/start`, `/pause`, `/resume`, `/stop`.
    - Survives server restart: in-flight queue can be resumed without resending to already `SENT` contacts.
  - *Verification*: Pause campaign mid-run, resume, verify no duplicate sends occur.

- [x] **Task 4.3**: Implement Campaign Execution UI
  - *Acceptance Criteria*:
    - Controls for Start, Pause, Stop.
    - Live progress bar (Sent / Total), countdown timer to next send, and live log stream.
  - *Verification*: Launch campaign and observe real-time progress updates and status badges.

## Checkpoint 4: Live Outbound Dispatch
- [x] Safe, paced email sending directly through user's Gmail with pause/resume resilience.

---

## Phase 5: A/B Testing Studio

- [ ] **Task 5.1**: Implement A/B testing backend logic
  - *Acceptance Criteria*:
    - Campaign supports Variant A (Subject A, Body A) and Variant B (Subject B, Body B).
    - Alternates assignment evenly across contact list (Row 1 -> A, Row 2 -> B).
    - Logs which variant was delivered to each contact.
  - *Verification*: Ingest 10 contacts, assign variants, verify exact 5/5 distribution in DB.

- [ ] **Task 5.2**: Build dedicated A/B Testing UI
  - *Acceptance Criteria*:
    - Tabbed or split-view editor for Variant A vs Variant B.
    - Analytics card showing comparative delivery stats for Variant A vs Variant B.
  - *Verification*: User switches between variants, edits copy, and reviews side-by-side stats.

## Checkpoint 5: A/B Testing
- [ ] A/B testing page functions seamlessly with 50/50 split and comparative performance cards.

---

## Phase 6: Day-Wise Analytics Dashboard & Craft Polish

- [ ] **Task 6.1**: Build day-wise send tracking engine & audit export
  - *Acceptance Criteria*:
    - Endpoint `/api/analytics/daily` returns array of `{ date, sentCount, failedCount }`.
    - Endpoint `/api/analytics/export` generates downloadable CSV audit report.
    - Daily Gmail quota calculator (tracking 500 or 2,000 allowance).
  - *Verification*: Dispatch emails across simulated dates and verify aggregated daily stats and CSV output.

- [ ] **Task 6.2**: Build Analytics Dashboard UI
  - *Acceptance Criteria*:
    - Day-wise bar/line chart displaying emails dispatched over time.
    - Daily Quota Gauge showing used vs remaining Gmail quota.
    - Recent activity feed and one-click "Export Audit CSV" button.
  - *Verification*: View dashboard and confirm charts render correctly with active campaign data.

- [ ] **Task 6.3**: UI Craft Polish & Accessibility Review
  - *Acceptance Criteria*:
    - Adheres to `frontend-skill` standards (no AI-purple generic slop, high-contrast dark/light theme, micro-animations, keyboard accessibility).
    - Smooth navigation tabs: Dashboard, Campaigns, Leads, Templates, A/B Testing, Settings.
  - *Verification*: Full keyboard tab navigation, zero layout shifts, clean optical rhythm.

## Checkpoint 6: Production Verification
- [ ] End-to-end verification of entire StrokeCRM workflow from Gmail setup to lead dispatch and analytics tracking.
