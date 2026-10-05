# StrokeCRM (Free, Self-Hosted Cold Outreach Platform)

## What This Is

StrokeCRM is a free, privacy-first, self-hosted cold email outreach platform and local CRM. It empowers founders and startups to conduct high-deliverability cold email campaigns directly through their personal or Google Workspace Gmail accounts without recurring subscription fees or third-party data lock-in.

## Core Value

Reliable, throttle-safe, and personalized bulk cold email dispatch directly from the user's Gmail account with dynamic Excel/CSV variable mapping and zero duplicate sends.

## Business Context

- **Customer**: Startup founders, solo operators, sales reps, and bootstrapped teams conducting cold B2B outreach.
- **Revenue model**: 100% Free, open-source / local self-hosted tool (no paywalls, no monthly subscription fees).
- **Success metric**: 100% accurate variable interpolation, zero spam penalty flags due to automated pacing/jitter, and seamless campaign management.

## Current Milestone: v4.0 Campaign Duplication, Rich Cadences & Contrast Hardening

**Goal:** Expand campaign productivity and UX polish with 1-click campaign and cadence duplication for new databases, full rich-text formatting for custom follow-ups, WCAG-hardened light mode contrast across all buttons and text, and direct template assignment in A/B testing.

**Target features:**
- **Campaign & Triad Duplication (`POST /api/campaigns/:id/duplicate`)**: Clone all settings (pacing, delays, CC/BCC, accounts, templates) and all multi-step drip cadence rows (`campaign_drip_steps`) into a new draft campaign bound to an unattached or newly uploaded database.
- **Rich Text Follow-Up Formatting Studio**: Full WYSIWYG formatting toolbar (Bold, Italic, Underline, Bulleted/Numbered Lists, Links, Clear Formatting) for follow-up steps in `DripSequenceStudio` with dynamic variable pill insertion.
- **System-Wide Light Mode WCAG Contrast & Token Hardening**: High-contrast text tokens in `index.css` (eliminating low-contrast `#a1a1aa` for muted text), purging hardcoded `slate-` dark classes across all views and buttons to guarantee crisp >= 4.5:1 contrast.
- **Direct Template Assignment to Variants in A/B Testing**: Assign saved templates directly to Variant A and Variant B in `ABTestingView` with live metadata previews, spam radar, and fallback inline overrides.

## Current State

Shipped **v3.0 UI Overhaul, Light Mode & Free AI Reply Intelligence** on 2026-10-05 across 3 phases (13–15). Delivered centralized dual-theme token engine, professional B2B outreach copywriting, curated starter presets, and asynchronous Gemini 1.5 Flash sentiment analysis with local heuristic fallback.

<details>
<summary>v3.0 UI Overhaul, Light Mode & Free AI Reply Intelligence (Shipped 2026-10-05)</summary>

Delivered persistent Dark/Light mode switcher with centralized CSS tokens and FOUT prevention, comprehensive UI modernization and B2B SaaS copywriting across all views, curated starter sequence presets, asynchronous Google Gemini 1.5 Flash reply sentiment engine (1,500 free calls/day), offline rule-based heuristic fallback, and Campaign Cockpit reply intelligence badges with 1-click filtering.

</details>

<details>
<summary>v2.0 Custom Domains & Automated Drips (Shipped 2026-10-03)</summary>

Delivered universal custom domain SMTP/IMAP gateway with 1-click presets, multi-step drip sequence engine with delay scheduling and RFC 2822 organic threading, inbound IMAP reply scanner with automated sequence disarming, auto-responder filtering, 5-tier visual conversion funnel, and RFC 4180 audit CSV export.

</details>

<details>
<summary>v1.0 Initial MVP (Shipped 2026-10-03)</summary>

Shipped **v1.0 Initial MVP** on 2026-10-03 across 9 complete phases and 18 git commits. Complete full-stack local CRM with dual Gmail authentication (App Password + OAuth2), lead ingestion (.xlsx, .xls, .csv), rich template editor with Handlebars substitution and spam buzzword detection, SQLite throttle-safe queue with jitter pacing, A/B testing studio, day-wise analytics, and an interactive dark cockpit UI with breadcrumb navigation.

</details>

## Requirements

### Validated

- ✓ Dual Gmail connectivity: Google App Password (SMTP) & OAuth2 — v1.0
- ✓ Excel/CSV ingestion: Parse `.xlsx`, `.xls`, `.csv` with auto-detected headers & email column — v1.0
- ✓ Template & variable mapping: Rich HTML, Handlebars `{{var | fallback}}`, live per-lead preview — v1.0
- ✓ Pacing & humanized dispatch: Min/max jitter delays, daily limits, working hours — v1.0
- ✓ Campaign state machine: SQLite queue tracking `PENDING`, `SENDING`, `SENT`, `FAILED` with pause/resume — v1.0
- ✓ Day-wise analytics dashboard: Timeline chart of sends, Gmail quota gauge, live feed, CSV audit export — v1.0
- ✓ Dedicated A/B testing suite: 50/50 recipient cohort split with comparative scorecards — v1.0
- ✓ Spam preflight guard: Real-time scan of high-risk deliverability buzzwords — v1.0
- ✓ App Shell & Breadcrumbs: URL hash routing, browser history traversal, Esc back-key — v1.0
- ✓ Preflight Launch Cockpit: Working hours switch with 24/7 bypass, test-send verification — v1.0
- ✓ Custom domain email connectivity: Universal SMTP & IMAP configuration with connection verification — v2.0
- ✓ Multi-step follow-up sequences: Drip cadence builder (Step 1, Step 2, Step 3) with delay scheduling & RFC 2822 threading — v2.0
- ✓ Inbound IMAP reply detection & disarm: Automated polling, auto-responder filter, and atomic sequence halting — v2.0
- ✓ Drip funnel analytics & CSV export: Visual 5-tier conversion drop-off funnel and downloadable RFC 4180 audit report — v2.0
- ✓ Dual-Theme Architecture & Design Tokens: Persistent Dark / Light theme switch, CSS variables design system, WCAG AA compliant contrast — v3.0
- ✓ UI Overhaul & Component Modernization: Elevated dashboard cards, sleek tables, fluid spring toggles, and responsive views following `frontend-skill` — v3.0
- ✓ Professional UX Copywriting: Clear, authoritative B2B outreach terminology across all navigation items, modals, tooltips, and status badges — v3.0
- ✓ Curated Cold Outreach Starter Presets: High-converting built-in templates with pre-mapped variable tags — v3.0
- ✓ Free AI Reply Sentiment Analyzer: Zero-cost classification (Interested, Question, Follow Up, Not Interested, Unsubscribe) via free-tier Gemini 1.5 Flash & local heuristics — v3.0
- ✓ Reply Intelligence Cockpit Integration: Visual sentiment badges, confidence scores, and one-click filtering in Campaign Cockpit and Database Inspector — v3.0

### Active (v4.0)

- [ ] **DUP-01..03**: 1-Click Campaign & Triad Duplication (`POST /api/campaigns/:id/duplicate`) cloning configs, cadence steps, and binding new isolated databases.
- [ ] **RICH-01..03**: Rich Text Formatting Studio for custom follow-up cadences in `DripSequenceStudio` with dynamic variable pill insertion.
- [ ] **CONTRAST-01..04**: System-Wide Light Mode WCAG 2.2 AA Contrast & Token Hardening across all buttons, inputs, modals, and text.
- [ ] **AB-01..03**: Direct Template Assignment to Variants in A/B Testing Studio with metadata previews and spam risk radar.

### Out of Scope

- Multi-account Gmail inbox rotation (deferred to maintain focus on UI elegance, copywriting, and reply intelligence).
- Cloud SaaS multi-tenant hosting (StrokeCRM runs locally on the user's machine to keep credentials and lead data 100% private).
- Sending spam or buying bulk scraped lead lists (focused on clean, opt-out compliant B2B outreach).
- Direct browser extension DOM hacking (StrokeCRM runs as a dedicated local web app for stability and background task resilience).

## Context

- Commercial tools like Streak CRM, Mailshake, and Lemlist charge high monthly fees and expose lead data to cloud servers.
- Google enforces daily send limits (500/day for personal `@gmail.com`, 2,000/day for Google Workspace).
- Outreach requires human-like cadence (randomized delays between sends) to protect domain reputation and prevent automated throttling.
- Node.js + Express backend with SQLite provides robust asynchronous queues, resilient state persistence, and native email sending via Nodemailer / Google APIs. React + Vite provides a clean, responsive interface adhering to anti-slop frontend standards.

## Constraints

- **Tech Stack**: Backend: Node.js (Express, SQLite, better-sqlite3, Nodemailer, xlsx/csv-parser). Frontend: React (Vite, Tailwind CSS, Lucide icons, Recharts).
- **Platform**: Local web application accessible via `http://localhost:port`.
- **Privacy & Security**: All credentials, tokens, and lead contact lists remain stored strictly on the local machine in encrypted/local SQLite. Free AI keys remain strictly local in SQLite settings.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local Web App over Chrome Extension | Chrome Extensions have strict background service-worker termination rules (sleeps after 30s) and break when Gmail UI updates. Local web app runs background queues indefinitely. | ✓ Good |
| Dual Gmail Auth (App Password + OAuth2) | App Passwords allow 1-minute instant launch with zero Google Cloud setup; OAuth2 provides advanced API capabilities. | ✓ Good |
| SQLite for persistent dispatch state | Zero-configuration, file-backed, ACID-compliant database prevents duplicate sends and survives app restarts. | ✓ Good |
| URL Hash Routing & Breadcrumb Trail | Zero server-side rewrites needed, enables native browser back/forward buttons and single-key navigation without losing background queue state. | ✓ Good |
| Dedicated Campaign Preflight Cockpit | Provides tactile Working Hours enforcement switch (with 24/7 bypass), jitter tuning, and test-send verification prior to queue ignition. | ✓ Good |
| Free AI API for Sentiment Analysis | Zero monthly subscription cost using free-tier API (e.g. Gemini 1.5 Flash free tier) or local model, keeping the tool 100% free and private. | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-05 for Milestone v3.0*
