# StrokeCRM (Free, Self-Hosted Cold Outreach Platform)

## What This Is

StrokeCRM is a free, privacy-first, self-hosted cold email outreach platform and local CRM. It empowers founders and startups to conduct high-deliverability cold email campaigns directly through their personal or Google Workspace Gmail accounts without recurring subscription fees or third-party data lock-in.

## Core Value

Reliable, throttle-safe, and personalized bulk cold email dispatch directly from the user's Gmail account with dynamic Excel/CSV variable mapping and zero duplicate sends.

## Business Context

- **Customer**: Startup founders, solo operators, sales reps, and bootstrapped teams conducting cold B2B outreach.
- **Revenue model**: 100% Free, open-source / local self-hosted tool (no paywalls, no monthly subscription fees).
- **Success metric**: 100% accurate variable interpolation, zero spam penalty flags due to automated pacing/jitter, and seamless campaign management.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Dual Gmail connectivity: Support Google App Password (instant SMTP setup) and official Google OAuth2.
- [ ] Excel/CSV ingestion: Parse `.xlsx`, `.xls`, `.csv` with arbitrary headers and detect email columns.
- [ ] Template & variable mapping: Visual template editor with `{{variable}}` substitution and real-time live preview.
- [ ] Pacing & humanized dispatch engine: Configurable delays, randomized jitter, daily send caps, and working-hour scheduling.
- [ ] Campaign state machine & audit log: SQLite-backed queue tracking `PENDING`, `SENDING`, `SENT`, `FAILED`, and `REPLIED` states with pause/resume support.
- [ ] Day-wise analytics dashboard: Visual timeline of emails sent per day, quota consumption monitor, and delivery health.
- [ ] Dedicated A/B testing suite: Split recipient lists between Variant A and Variant B with comparative metrics.
- [ ] Spam preflight & deliverability guard: Highlight spam words and deliverability hazards before campaign launch.

### Out of Scope

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

---
*Last updated: 2026-10-03 after project initialization*
