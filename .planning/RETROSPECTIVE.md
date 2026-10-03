# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Initial MVP

**Shipped:** 2026-10-03
**Phases:** 9 | **Commits:** 18 | **Sessions:** 1

### What Was Built
- Full local CRM architecture with Node.js/Express, SQLite, React (Vite), and Tailwind CSS.
- Dual Gmail connectivity via App Passwords (instant SMTP) and OAuth 2.0 with token persistence.
- Lead list ingestion (.xlsx, .xls, .csv) with automatic email column discovery and interactive table preview.
- Rich HTML template composition engine with Handlebars interpolation (`{{var | fallback}}`), live preview, and spam risk scanning.
- Resilient background dispatch queue with randomized jitter delays, working hours schedule compliance, and duplicate-safe pause/resume.
- Side-by-side A/B testing suite with automatic 50/50 recipient cohort splitting.
- Day-wise analytics dashboard with send history timeline chart, daily Gmail quota gauge, and downloadable CSV audit log.
- URL hash routing with browser history support, hierarchical breadcrumb bar, and launch preflight cockpit.

### What Worked
- SQLite transaction persistence enabled seamless pause and resume with zero risk of duplicate sends.
- App Passwords allowed instantaneous out-of-the-box sending without requiring Google Cloud OAuth app verification hurdles.
- Hash-based navigation allowed instant deep-linking, browser history traversal, and keyboard navigation (`Esc` back-step) without complex server-side rewrites.

### What Was Inefficient
- Executing all 9 phases in code without pre-generating phase plan directories triggered GSD `W006` unstarted phase warnings until reconciled at milestone close.

### Patterns Established
- Local-first CRM architecture: all secrets and recipient data reside strictly on user's machine.
- 3-pillar preflight cockpit pattern: check pacing jitter, working hours, and test-send before launching queue.

### Key Lessons
1. Throttle-safety and jitter delays are paramount for maintaining Gmail account health during cold outreach.
2. Direct SQLite storage is significantly more reliable and simpler than multi-container setups for personal CRM tools.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 18 | 9 | Complete initial MVP foundation and interactive UX overhaul |

### Cumulative Quality

| Milestone | Verified Requirements | Tech Debt |
|-----------|-----------------------|-----------|
| v1.0 | 21/21 (100%) | 0 open blockers |

### Top Lessons (Verified Across Milestones)

1. Local web app with SQLite delivers zero-latency background queues without browser extension sleep issues.
