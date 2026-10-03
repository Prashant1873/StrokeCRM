# StrokeCRM (Free, Self-Hosted Cold Outreach Platform)

## What This Is

StrokeCRM is a free, privacy-first, self-hosted cold email outreach platform and local CRM. It empowers founders and startups to conduct high-deliverability cold email campaigns directly through their personal or Google Workspace Gmail accounts without recurring subscription fees or third-party data lock-in.

## Core Value

Reliable, throttle-safe, and personalized bulk cold email dispatch directly from the user's Gmail account with dynamic Excel/CSV variable mapping and zero duplicate sends.

## Business Context

- **Customer**: Startup founders, solo operators, sales reps, and bootstrapped teams conducting cold B2B outreach.
- **Revenue model**: 100% Free, open-source / local self-hosted tool (no paywalls, no monthly subscription fees).
- **Success metric**: 100% accurate variable interpolation, zero spam penalty flags due to automated pacing/jitter, and seamless campaign management.

## Current State

Shipped **v2.0 Custom Domains & Automated Drips** on 2026-10-03 across 3 phases (10–12) and 12 git commits. Delivered universal custom domain SMTP/IMAP gateway with 1-click presets (Zoho, Fastmail, Office 365, Namecheap PrivateEmail), multi-step drip sequence engine with delay scheduling and RFC 2822 organic threading, inbound IMAP reply scanner with automated sequence disarming, auto-responder filtering, 5-tier visual conversion funnel, and RFC 4180 audit CSV export.

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

### Active
None (Milestone v2.0 Complete. Ready for next milestone).

### Out of Scope

- AI personalized icebreaker generator (deferred per user decision to prioritize clean deliverability and core CRM operations).
- Multi-account Gmail inbox rotation (deferred to maintain simplicity and focus on single custom domain / Gmail sender setups).
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
- **Privacy & Security**: All credentials, tokens, and lead contact lists remain stored strictly on the local machine in encrypted/local SQLite.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local Web App over Chrome Extension | Chrome Extensions have strict background service-worker termination rules (sleeps after 30s) and break when Gmail UI updates. Local web app runs background queues indefinitely. | ✓ Good |
| Dual Gmail Auth (App Password + OAuth2) | App Passwords allow 1-minute instant launch with zero Google Cloud setup; OAuth2 provides advanced API capabilities. | ✓ Good |
| SQLite for persistent dispatch state | Zero-configuration, file-backed, ACID-compliant database prevents duplicate sends and survives app restarts. | ✓ Good |
| URL Hash Routing & Breadcrumb Trail | Zero server-side rewrites needed, enables native browser back/forward buttons and single-key navigation without losing background queue state. | ✓ Good |
| Dedicated Campaign Preflight Cockpit | Provides tactile Working Hours enforcement switch (with 24/7 bypass), jitter tuning, and test-send verification prior to queue ignition. | ✓ Good |

---
*Last updated: 2026-10-03 after v1.0 milestone*
