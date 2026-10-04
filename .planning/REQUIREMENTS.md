# Requirements: StrokeCRM Milestone v3.0

**Milestone:** v3.0 — UI Overhaul, Light Mode & Free AI Reply Intelligence  
**Status:** Scoped & Active  
**Last Updated:** 2026-10-05  

---

## v3.0 Requirements

### Theme & Design Tokens (`THEME`)

- [ ] **THEME-01**: User can toggle between Dark Mode and Light Mode with immediate visual transition and zero page reload.
- [ ] **THEME-02**: System automatically persists theme preference in `localStorage` and falls back cleanly to OS `prefers-color-scheme` on first visit.
- [ ] **THEME-03**: App prevents Flash of Unstyled Theme (FOUT) on load via synchronous pre-render theme attribute application.
- [ ] **THEME-04**: Semantic CSS variable token system ensures WCAG AA compliant contrast (>4.5:1 for body copy) across both dark and light modes.

### UI Modernization & UX Copywriting (`COPY`)

- [ ] **COPY-01**: System-wide UX copy, headers, action verbs, and error notifications use clear, authoritative B2B SaaS outreach terminology.
- [ ] **COPY-02**: Deliverability and configuration parameters feature clear explanatory tooltips (pacing jitter, RFC 2822 threading, daily caps, IMAP reply disarm).
- [ ] **COPY-03**: User can browse and preview a built-in gallery of high-converting cold outreach starter templates (Direct Pitch, Social Proof Teaser, Follow-Up Bump, Breakup Closing).
- [ ] **COPY-04**: User can clone any starter preset into their active templates collection with pre-mapped variable pills with a single click.
- [ ] **COPY-05**: Dashboard cards, data tables, and preflight controls feature elevated typography, subtle borders, and fluid spring micro-interactions adhering to `frontend-skill`.

### Free AI Reply Sentiment Intelligence (`SENT`)

- [ ] **SENT-01**: User can enter and verify a free Google Gemini 1.5 Flash API key in Settings with real-time handshake check.
- [ ] **SENT-02**: Inbound IMAP reply scanner triggers asynchronous sentiment analysis on newly detected lead replies immediately following atomic sequence disarming.
- [ ] **SENT-03**: Sentiment engine sanitizes email bodies (strips quoted thread history) and classifies replies into: `Interested`, `Question`, `Follow Up`, `Not Interested`, or `Unsubscribe`, along with a 1-sentence summary.
- [ ] **SENT-04**: System includes a built-in zero-dependency regex/keyword heuristic classifier that operates offline or as an instant fallback when no API key is provided.
- [ ] **SENT-05**: User can view color-coded sentiment badges, confidence scores, and reply summaries in the Campaign Cockpit and Database Inspector.
- [ ] **SENT-06**: User can filter campaign leads by sentiment category (`All`, `Interested`, `Questions`, `Follow Up`, `Not Interested`) with 1-click tab controls.
- [ ] **SENT-07**: User can manually override or correct any lead's classified sentiment directly from the Database Inspector.

---

## Future Requirements (v4.0+)

- **ROT-01**: Multi-account mailbox pool rotation with round-robin dispatch.
- **ROT-02**: Per-mailbox warmup ramp schedule.
- **PIPE-01**: Interactive drag-and-drop Kanban deal pipeline for replied leads.
- **TRACK-01**: Self-hosted 1x1 tracking pixel for open rate detection.
- **TRACK-02**: Click redirect tracking proxy with RFC 8058 one-click unsubscribe handling.

---

## Out of Scope

- **Auto-Reply Dispatch**: AI analyzes sentiment and drafts suggestions, but never sends cold outbound or reply emails automatically without human confirmation.
- **Third-Party Cloud Sync**: All API keys, contact databases, and sentiment annotations remain strictly on the local machine in SQLite.
- **Subscription / Paid AI Gateways**: No paid AI services or credit cards required; designed exclusively around Google Gemini 1.5 Flash free tier and local rule heuristics.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 13 | Pending |
| THEME-02 | Phase 13 | Pending |
| THEME-03 | Phase 13 | Pending |
| THEME-04 | Phase 13 | Pending |
| COPY-01 | Phase 14 | Pending |
| COPY-02 | Phase 14 | Pending |
| COPY-03 | Phase 14 | Pending |
| COPY-04 | Phase 14 | Pending |
| COPY-05 | Phase 14 | Pending |
| SENT-01 | Phase 15 | Pending |
| SENT-02 | Phase 15 | Pending |
| SENT-03 | Phase 15 | Pending |
| SENT-04 | Phase 15 | Pending |
| SENT-05 | Phase 15 | Pending |
| SENT-06 | Phase 15 | Pending |
| SENT-07 | Phase 15 | Pending |
