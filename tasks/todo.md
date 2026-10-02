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

- [x] **Task 5.1**: Implement A/B testing backend logic
  - *Acceptance Criteria*:
    - Campaign supports Variant A (Subject A, Body A) and Variant B (Subject B, Body B).
    - Alternates assignment evenly across contact list (Row 1 -> A, Row 2 -> B).
    - Logs which variant was delivered to each contact.
  - *Verification*: Ingest 10 contacts, assign variants, verify exact 5/5 distribution in DB.

- [x] **Task 5.2**: Build dedicated A/B Testing UI
  - *Acceptance Criteria*:
    - Tabbed or split-view editor for Variant A vs Variant B.
    - Analytics card showing comparative delivery stats for Variant A vs Variant B.
  - *Verification*: User switches between variants, edits copy, and reviews side-by-side stats.

## Checkpoint 5: A/B Testing
- [x] A/B testing page functions seamlessly with 50/50 split and comparative performance cards.

---

## Phase 6: Day-Wise Analytics Dashboard & Craft Polish

- [x] **Task 6.1**: Build day-wise send tracking engine & audit export
  - *Acceptance Criteria*:
    - Endpoint `/api/analytics/daily` returns array of `{ date, sentCount, failedCount }`.
    - Endpoint `/api/analytics/export` generates downloadable CSV audit report.
    - Daily Gmail quota calculator (tracking 500 or 2,000 allowance).
  - *Verification*: Dispatch emails across simulated dates and verify aggregated daily stats and CSV output.

- [x] **Task 6.2**: Build Analytics Dashboard UI
  - *Acceptance Criteria*:
    - Day-wise bar/line chart displaying emails dispatched over time.
    - Daily Quota Gauge showing used vs remaining Gmail quota.
    - Recent activity feed and one-click "Export Audit CSV" button.
  - *Verification*: View dashboard and confirm charts render correctly with active campaign data.

- [x] **Task 6.3**: UI Craft Polish & Accessibility Review
  - *Acceptance Criteria*:
    - Adheres to `frontend-skill` standards (no AI-purple generic slop, high-contrast dark/light theme, micro-animations, keyboard accessibility).
    - Smooth navigation tabs: Dashboard, Campaigns, Leads, Templates, A/B Testing, Settings.
  - *Verification*: Full keyboard tab navigation, zero layout shifts, clean optical rhythm.

## Checkpoint 6: Production Verification
- [x] End-to-end verification of entire StrokeCRM workflow from Gmail setup to lead dispatch and analytics tracking.

---

## Phase 7: Traceable Routing, Breadcrumb System & App Shell Architecture

- [x] **Task 7.1**: Build URL-Indexed Route & History Controller
  - **Description**: Implement a lightweight, zero-dependency browser hash router and navigation state controller that synchronizes the current view, campaign ID, and step with `window.location.hash`, enabling native browser Back/Forward traversal, deep linking, and bookmarkable views.
  - **Acceptance criteria**:
    - [x] Navigating between pages/subpages updates URL hash (e.g. `#/campaigns`, `#/campaigns/:id`, `#/campaigns/:id/preflight`, `#/leads/upload`, `#/leads/map`).
    - [x] Browser Back and Forward buttons navigate backward and forward in view history without page refresh.
    - [x] Directly pasting or refreshing an indexed URL loads the exact corresponding view and entity.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual check: Navigate Dashboard → Campaigns → Preflight, press browser Back button twice, verify return to Dashboard.
  - **Dependencies**: Phase 6
  - **Files likely touched**:
    - `client/src/App.jsx`
    - `client/src/router.js` (new)
  - **Estimated scope**: Medium: 2-3 files

- [x] **Task 7.2**: Build Traceable Breadcrumbs Component with Clickable Hierarchy
  - **Description**: Create a persistent, high-density breadcrumb component at the top of the main viewport showing the active path hierarchy (`Home > Campaigns > [Campaign Name] > Launch Preflight`), supporting one-click jumps to any ancestor level and a dedicated "Back" button with keyboard shortcut (`Esc`).
  - **Acceptance criteria**:
    - [x] Displays indexed crumbs trail with icons and labels reflecting current deep route.
    - [x] Clicking any parent breadcrumb crumb instantly navigates back to that exact parent page.
    - [x] Dedicated Back button pops navigation stack to previous step or parent directory.
    - [x] Pressing `Esc` when in a nested sub-page/step triggers back navigation.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual check: Click into nested campaign preflight, click middle crumb "Campaigns", verify instant return to campaigns list.
  - **Dependencies**: Task 7.1
  - **Files likely touched**:
    - `client/src/components/Breadcrumbs.jsx` (new)
    - `client/src/App.jsx`
  - **Estimated scope**: Small: 2 files

- [x] **Task 7.3**: Overhaul App Shell with Collapsible Cockpit Navigation & Active Indicators
  - **Description**: Redesign the outer layout shell to support both modern high-density navigation (collapsible sidebar or sleek navbar with badge counters and path highlights) and unified header breadcrumb controls.
  - **Acceptance criteria**:
    - [x] Modern dark cockpit aesthetic (`#0b0f17` background, slate-800 borders, emerald/indigo accents).
    - [x] Active route indicator highlighting current section with zero layout shift.
    - [x] Displays live Gmail connection pill and active queue badge in the shell.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual check: Check visual responsiveness, verify collapse/expand toggles smoothly with no visual clipping.
  - **Dependencies**: Task 7.1, Task 7.2
  - **Files likely touched**:
    - `client/src/components/Navbar.jsx`
    - `client/src/components/AppShell.jsx` (new)
    - `client/src/App.jsx`
  - **Estimated scope**: Medium: 3 files

## Checkpoint 7: Navigation & Breadcrumbs
- [x] Deep URL paths work (`#/campaigns/:id/preflight`, `#/leads/upload`, etc.)
- [x] Browser Back and Forward buttons navigate without state loss
- [x] Clicking any breadcrumb ancestor navigates to that level

---

## Phase 8: Multi-Step Wizards & Contextual Preflight Option Controls

- [x] **Task 8.1**: Build Campaign Launch Preflight Cockpit with Working Hours Toggle
  - **Description**: Build an interactive preflight launch screen before starting a campaign, featuring a dedicated switch to "Enforce Working Hours (9 AM - 6 PM)" vs "Immediate 24/7 Dispatch", instant jitter interval tuning sliders, preflight safety checklists (quota, Gmail auth), and "Send Test to Me" verification.
  - **Acceptance criteria**:
    - [x] Interactive toggle switch: "Enforce Working Hours (9:00 AM - 6:00 PM)" (default ON). When switched OFF, confirms 24/7 immediate dispatch.
    - [x] Passes `{ bypassHours: true/false }` to `/api/campaigns/:id/start`.
    - [x] Pacing jitter selector/slider (e.g. 30s-90s) with real-time estimated completion calculation.
    - [x] Preflight health card: Gmail verified badge, remaining daily quota counter, spam preflight score.
    - [x] "Send Test Email to Me" button with instant result pill right inside preflight.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual check: Toggle Working Hours OFF, click Start Campaign, verify backend receives `{ bypassHours: true }` and dispatches immediately.
  - **Dependencies**: Phase 7
  - **Files likely touched**:
    - `client/src/components/CampaignPreflight.jsx` (new)
    - `client/src/components/CampaignsView.jsx`
  - **Estimated scope**: Medium: 2-3 files

- [x] **Task 8.2**: Build 3-Step Lead Ingestion Wizard (Upload → Map → Preview)
  - **Description**: Restructure lead ingestion into a clear, indexed 3-step wizard with step progression pills, options to skip or update duplicates, fallback defaults configuration, and seamless backward/forward navigation that preserves uploaded spreadsheet state.
  - **Acceptance criteria**:
    - [x] Step 1: Upload spreadsheet (`.xlsx`, `.csv`) with drag-and-drop and size/type validation.
    - [x] Step 2: Interactive column header to template variable mapping with duplicate-handling switch.
    - [x] Step 3: Verified leads preview table with email validity badges and row counts.
    - [x] Stepping back from Step 3 to Step 2 or Step 1 preserves the parsed file data.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual check: Upload file, proceed to step 2, click Back to step 1, proceed forward to step 2; confirm file is preserved.
  - **Dependencies**: Phase 7
  - **Files likely touched**:
    - `client/src/components/LeadsView.jsx`
    - `client/src/components/LeadWizard.jsx` (new)
  - **Estimated scope**: Medium: 2-3 files

- [x] **Task 8.3**: Build Template Preflight Step View with Variable Pills & Spam Scanner
  - **Description**: Enhance template creation and review with indexed steps: Subject & Body Composer, Dynamic Handlebars insertion pills, real-time spam scoring preflight, and side-by-side per-lead row rendering preview.
  - **Acceptance criteria**:
    - [x] Step options: toggle spam highlighting on/off with alternative phrasing suggestions.
    - [x] Dynamic variable pills clickable to insert into subject or body at cursor position.
    - [x] Live preview toggle cycling across contacts to verify fallback tokens (`{{FirstName | "there"}}`).
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual check: Compose template with spam words, verify visual warning updates instantly as user types.
  - **Dependencies**: Phase 7
  - **Files likely touched**:
    - `client/src/components/TemplatesView.jsx`
  - **Estimated scope**: Small: 1-2 files

## Checkpoint 8: Step Controls & Preflight Cockpit
- [x] Campaign Start preflight switch for working hours works end-to-end with backend queue.
- [x] Lead ingestion wizard allows back-and-forth navigation without losing parsed data.
- [x] All step options and preflight checks function smoothly.

---

## Phase 9: Frontend-Skill Polish, Apple Fluid Motion & WCAG 2.2 AA Hardening

- [x] **Task 9.1**: Implement Apple Fluid Motion & Spring Physics on Interactive Elements
  - **Description**: Integrate fluid physics per `frontend-skill`: zero pointer latency on pointer-down, critically damped springs (damping 1.0, 0.35s duration) on toggle switches, modals, and breadcrumbs, with interruptible transitions.
  - **Acceptance criteria**:
    - [x] Toggle switches (including Working Hours toggle) feature tactile, fluid spring animation.
    - [x] Modals, drawers, and step transitions settle smoothly with zero bounce/overshoot (damping 1.0).
    - [x] Zero pointer latency: active press states trigger immediately on `pointerdown`.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual check: Click and drag switches, verify snappy 60fps response and smooth spring settlement.
  - **Dependencies**: Phase 8
  - **Files likely touched**:
    - `client/src/components/common/Switch.jsx` (new)
    - `client/src/components/common/Modal.jsx` (new)
    - `client/src/index.css`
  - **Estimated scope**: Medium: 3 files

- [x] **Task 9.2**: Anti-Slop Visual Craft & Optical Density Review
  - **Description**: Conduct rigorous visual craft audit per `frontend-skill` Section 1 & 2: eliminate any generic styling, ensure intentional typographic scale, enforce 4px/8px optical grid rhythm, and polish dark cockpit contrast.
  - **Acceptance criteria**:
    - [x] Consistent color tokens: dark cockpit `#0b0f17`, slate-900 panels, slate-800 borders, emerald/indigo accents.
    - [x] Zero arbitrary glassmorphism and zero generic purple AI gradient meshes.
    - [x] Clear typographic hierarchy with readable line lengths and distinct label weights.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Visual inspection: All components conform to cockpit theme with balanced whitespace.
  - **Dependencies**: Task 9.1
  - **Files likely touched**:
    - `client/src/index.css`
    - `client/src/App.css`
    - `client/src/components/*`
  - **Estimated scope**: Medium: 3-4 files

- [x] **Task 9.3**: WCAG 2.2 AA Keyboard Navigation & State Resilience Scan
  - **Description**: Implement and audit full keyboard navigation (`Tab`, `Shift+Tab`, `Space`, `Enter`, `Escape`), visible high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`), semantic ARIA attributes for all toggles/breadcrumbs, and empty/error state resilience.
  - **Acceptance criteria**:
    - [x] Every button, switch, breadcrumb link, and input is fully accessible via keyboard.
    - [x] High-contrast focus rings visible on all interactive elements during keyboard navigation.
    - [x] All toggles have programmatic `role="switch"` and `aria-checked` states.
    - [x] Zero-state, error-state, and loading-state handling across all views.
  - **Verification**:
    - [x] Build succeeds: `npm --prefix client run build`
    - [x] Manual keyboard check: Complete entire campaign preflight & launch using only keyboard (`Tab`, `Space`, `Enter`, `Esc`).
  - **Dependencies**: Task 9.1, Task 9.2
  - **Files likely touched**:
    - `client/src/components/*`
  - **Estimated scope**: Medium: 3-4 files

## Checkpoint 9: Impeccable Delivery & Final Verification
- [x] All interactive switches and step transitions feel fluid and responsive.
- [x] Full WCAG 2.2 AA keyboard accessibility verified.
- [x] End-to-end user journey tested: Navigate → Breadcrumb Trace → Upload Lead Wizard → Configure Template → Launch Campaign with Working Hours Switch → Live Monitoring.
