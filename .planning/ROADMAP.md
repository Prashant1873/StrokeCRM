# Roadmap: StrokeCRM

## Milestones

- ✅ **v1.0 Initial MVP** — Phases 1-9 (shipped 2026-10-03)
- ✅ **v2.0 Custom Domains & Automated Drips** — Phases 10-12 (shipped 2026-10-03)
- 🟡 **v3.0 UI Overhaul, Light Mode & Free AI Reply Intelligence** — Phases 13-15 (active)

---

## Phases

<details>
<summary>✅ v1.0 Initial MVP (Phases 1-9) — SHIPPED 2026-10-03</summary>

- [x] Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway (completed 2026-10-03)
- [x] Phase 2: Lead Ingestion & Variable Header Mapping (completed 2026-10-03)
- [x] Phase 3: Template Personalization Engine & Spam Preflight (completed 2026-10-03)
- [x] Phase 4: Resilient Queue & Pacing Dispatcher (completed 2026-10-03)
- [x] Phase 5: A/B Testing Studio (completed 2026-10-03)
- [x] Phase 6: Day-Wise Analytics Dashboard & Polish (completed 2026-10-03)
- [x] Phase 7: Traceable Routing, Breadcrumb System & App Shell Architecture (completed 2026-10-03)
- [x] Phase 8: Multi-Step Wizards & Contextual Preflight Option Controls (completed 2026-10-03)
- [x] Phase 9: Frontend-Skill Polish, Apple Fluid Motion & WCAG 2.2 AA Hardening (completed 2026-10-03)

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Custom Domains & Automated Drips (Phases 10-12) — SHIPPED 2026-10-03</summary>

- [x] **Phase 10: Custom Domain SMTP & IMAP Account Gateway** (completed 2026-10-03)
- [x] **Phase 11: Multi-Step Drip Sequence Engine & Builder Studio** (completed 2026-10-03)
- [x] **Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics** (completed 2026-10-03)

See: `.planning/milestones/v2.0-ROADMAP.md`

</details>

### Milestone v3.0: UI Overhaul, Light Mode & Free AI Reply Intelligence

- [ ] **Phase 13: Dual-Theme Architecture & Design Token Engine**
- [ ] **Phase 14: System-Wide UI Modernization & Professional UX Copywriting**
- [ ] **Phase 15: Free AI Inbound Reply Sentiment Engine & Cockpit Intelligence**

---

## Phase Details

### Phase 13: Dual-Theme Architecture & Design Token Engine
**Goal**: Implement persistent Dark and Light modes using centralized CSS variable tokens, FOUT-free loading, and WCAG AA contrast.  
**Depends on**: Phase 12  
**Requirements**: [THEME-01, THEME-02, THEME-03, THEME-04]  
**Success Criteria**:
1. User clicks the Sun/Moon toggle in the header, and the UI transitions instantly between Dark and Light mode without layout shift or page refresh.
2. Page reload retains selected theme preference with zero unstyled flash (FOUT).
3. All typography, surface cards, badges, and controls satisfy WCAG AA contrast (>4.5:1 for body copy) across both themes.

### Phase 14: System-Wide UI Modernization & Professional UX Copywriting
**Goal**: Overhaul all application views, modernize cards and tables, elevate typography and micro-interactions, enforce authoritative B2B SaaS terminology, and provide a curated cold outreach starter presets gallery.  
**Depends on**: Phase 13  
**Requirements**: [COPY-01, COPY-02, COPY-03, COPY-04, COPY-05]  
**Success Criteria**:
1. All navigation items, modals, toasts, and status badges use professional, action-oriented B2B cold outreach terminology.
2. Contextual tooltips explain deliverability concepts (jitter, RFC threading, daily limits, auto-disarm) on hover.
3. User can browse the Starter Presets Gallery and preview high-converting cold outreach sequences (Problem Pitch, Case Study Teaser, 3-Day Bump, Breakup Closing).
4. User can clone any starter preset into their active templates collection with one click, preserving dynamic `{{variable}}` pills.
5. Dashboard cards, data tables, and preflight controls incorporate elevated spacing, subtle borders, and fluid spring physics compliant with `frontend-skill`.

### Phase 15: Free AI Inbound Reply Sentiment Engine & Cockpit Intelligence
**Goal**: Build an asynchronous reply sentiment classifier using Google Gemini 1.5 Flash free tier with automatic local regex heuristic fallback, displaying actionable sentiment badges, quick-filters, and manual overrides in the Campaign Cockpit.  
**Depends on**: Phase 14  
**Requirements**: [SENT-01, SENT-02, SENT-03, SENT-04, SENT-05, SENT-06, SENT-07]  
**Success Criteria**:
1. User can configure and verify a free Google Gemini 1.5 Flash API key in Settings with real-time handshake check.
2. Detected inbound lead replies are asynchronously classified into `Interested`, `Question`, `Follow Up`, `Not Interested`, or `Unsubscribe` with a 1-sentence summary without blocking sequence disarm.
3. In the absence of an API key or during network downtime, the local rule-based heuristic classifier automatically categorizes replies offline.
4. Campaign Cockpit and Database Inspector display color-coded sentiment badges and confidence ratings for all replied leads.
5. User can filter campaign leads by sentiment category (`Interested`, `Questions`, `Follow Up`, `Not Interested`) with 1-click tabs.
6. Operator can click any lead's sentiment badge to manually override or correct its classification.

---
*Roadmap updated: 2026-10-05 for Milestone v3.0*
