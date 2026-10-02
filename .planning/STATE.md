# Current State: StrokeCRM

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-10-03)

**Core value:** Reliable, throttle-safe, and personalized bulk cold email dispatch directly from the user's Gmail account with dynamic Excel/CSV variable mapping and zero duplicate sends.  
**Current focus:** Phase 1 complete. Ready for Phase 2 (Lead Ingestion & Variable Header Mapping).

## Current Phase

- **Active Phase**: Phase 2: Lead Ingestion & Variable Header Mapping
- **Status**: Ready to plan and execute
- **Blocked by**: None

## Phase Progress

- [x] Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway (Completed 2026-10-03)
- [ ] Phase 2: Lead Ingestion & Variable Header Mapping (0/1 plans)
- [ ] Phase 3: Template Personalization Engine & Spam Preflight (0/1 plans)
- [ ] Phase 4: Resilient Queue & Pacing Dispatcher (0/1 plans)
- [ ] Phase 5: A/B Testing Studio (0/1 plans)
- [ ] Phase 6: Day-Wise Analytics Dashboard & Polish (0/1 plans)

## Recent Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-03 | Local Web App Architecture | Guarantees resilient background dispatch queue without browser extension sleep issues, and keeps contact lists private. |
| 2026-10-03 | Dual Gmail Auth Support | Enables zero-friction 1-minute setup via Google App Passwords while also providing OAuth2 support. |
| 2026-10-03 | Node.js + Express + React (Vite) + SQLite | Snappy, lightweight, asynchronous, with battle-tested Nodemailer and SQLite ACID transactions. |
