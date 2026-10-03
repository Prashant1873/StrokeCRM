# Milestones

## v1.0 Initial MVP (Shipped: 2026-10-03)

**Phases completed:** 9 phases, 18 commits (git range `98fa681` → `5f72ed1`)

**Key accomplishments:**
- **Dual Gmail Auth Gateway**: Instant Google App Passwords SMTP and OAuth2 connection with encrypted SQLite local persistence.
- **Lead Ingestion & Column Mapping**: Universal `.xlsx`, `.xls`, and `.csv` parsing with automatic email header detection and interactive preview.
- **Template Personalization Engine**: Rich HTML formatting, Handlebars variable substitution (`{{var | fallback}}`), per-lead live preview, and preflight spam keyword scanning.
- **Resilient Throttle-Safe Dispatch Queue**: SQLite state machine with randomized jitter delays, working hours schedule windows, daily send quotas, and duplicate-safe pause/resume.
- **A/B Testing Studio**: Automatic 50/50 split across subject line and copy variants with comparative performance tracking.
- **Day-Wise Analytics & Audit Trail**: Real-time progress bar, daily send quota gauge, send-history timeline chart, and exportable CSV audit log.
- **Traceable App Shell & Preflight Cockpit**: URL hash routing with browser history support, hierarchical breadcrumbs, working-hours toggle, and test-send verification.

---
