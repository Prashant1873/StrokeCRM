# Phase 14: System-Wide UI Modernization & Professional UX Copywriting - Context

**Gathered:** 2026-10-05  
**Status:** Ready for planning  

---

<domain>
## Phase Boundary

Phase 14 modernizes the entire visual layer, typography, and copywriting of StrokeCRM. It elevates all application screens to full dual-theme compliance (`data-theme`), enforces authoritative B2B SaaS outreach terminology, embeds interactive deliverability guidance beacons, and introduces a built-in gallery of high-converting cold email starter presets with 1-click cloning.

</domain>

<decisions>
## Implementation Decisions

### 1. Starter Presets Gallery Experience
- **D-01:** Embedded Tab & Header Modal in Templates Hub — Provide a dedicated "Starter Presets" tab in `TemplatesView.jsx` alongside the user's custom templates, plus an "Explore Presets" header button. Presets are organized into high-converting outreach categories (Direct Problem Pitch, Case Study Teaser, 3-Day Bump Follow-Up, Breakup Closing) featuring rich syntax-highlighted previews with dynamic `{{variable}}` badges and a 1-click "Use This Preset" button that clones directly into active templates.
  — **Reversibility:** reversible — UI component and static preset registry.

### 2. B2B Outreach Terminology & Copywriting
- **D-02:** Balanced B2B SaaS Terminology — System-wide update of navigation labels, table columns, empty states, and action buttons to industry-standard cold outbound terminology:
  - "Databases" -> "Lead Audiences"
  - "Campaigns" -> "Outreach Campaigns"
  - "Pacing / Delay" -> "Deliverability Throttle & Jitter"
  - "Mark Replied" -> "Log Reply & Disarm"
  - "Sent" -> "Dispatched"
  - Technical error toasts and confirmation dialogs replace casual jargon with authoritative, clear instructions.
  — **Reversibility:** costly — Affects copy across all frontend components and navigation tabs.

### 3. Deliverability Technical Tooltips
- **D-03:** Interactive Info Beacons with Deliverability Advice Cards — Implement subtle circular info beacons `(i)` next to complex parameters in `PreflightCockpit.jsx`, `SettingsView.jsx`, and `CampaignFunnelCard.jsx`. On hover/focus, an elevated card explains both the technical mechanism and why it protects domain reputation:
  - *Throttle Jitter (45s–90s)*: Explains how irregular delays prevent ESP rate-limiting and heuristic bot detection.
  - *RFC 2822 Threading*: Explains how `In-Reply-To` and `References` headers force follow-ups into the existing inbox thread.
  - *Daily Sending Cap*: Recommends keeping initial volume under 50/day on fresh mailboxes.
  - *Inbound Reply Disarm*: Explains how detecting lead replies automatically suspends remaining drips to prevent embarrassing double-sends.
  — **Reversibility:** reversible — Reusable tooltip/popover component.

### 4. Cockpit & Table Micro-Interactions
- **D-04:** Apple Fluid Spring Micro-Interactions — Apply `frontend-skill` standards across all interactive elements:
  - Subtle card hover lift (`-translate-y-0.5 transition-transform duration-200`) on dashboard metric cards and campaign rows.
  - Pulsating live glow dots on active state badges (`Dispatching`, `Scanning`).
  - Sticky blurred table headers (`backdrop-blur-md bg-surface/90 sticky top-0`) on large lead tables.
  - Tactile spring press feedback (`spring-press active:scale-[0.98]`) on primary CTA buttons.
  — **Reversibility:** reversible — CSS and Tailwind classes.

### 5. Universal Dual-Theme Semantic Token Adoption
- **D-05:** Universal Design Token Refactor — Refactor all remaining application views (`DashboardOverview.jsx`, `CampaignsView.jsx`, `TemplatesView.jsx`, `DatabasesView.jsx`, `SettingsView.jsx`, `PreflightCockpit.jsx`, `CampaignFunnelCard.jsx`, `DripSequenceStudio.jsx`, `ABTestingStudio.jsx`) to consume the semantic CSS tokens created in Phase 13 (`bg-canvas`, `bg-surface`, `bg-elevated`, `border-subtle`, `border-default`, `text-primary`, `text-secondary`, `text-muted`). Replace hardcoded `bg-zinc-900`, `text-white`, `border-zinc-800` classes so all views look stunning in both Dark Mode and Light Mode with WCAG AA compliance.
  — **Reversibility:** costly — Touches all frontend page components.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `.planning/REQUIREMENTS.md` §UI Modernization & UX Copywriting — COPY-01 through COPY-05 definitions.
- `.planning/phases/13-dual-theme-architecture-design-token-engine/13-01-SUMMARY.md` — Established semantic token system and ThemeContext details.
- `.planning/research/PITFALLS.md` §UI & Copywriting Pitfalls — Guidance on avoiding unreadable text in light mode, layout shifts, and inconsistent terminology.
- `client/src/index.css` — Semantic utility classes (`.bg-canvas`, `.bg-surface`, `.border-subtle`, `.card-theme`, `.input-theme`, `.spring-press`).
- `client/src/components/AppShell.jsx` — Primary navigation and layout wrapper.
- `client/src/components/TemplatesView.jsx` — Target for Starter Presets Gallery and template editor polish.
- `client/src/components/DatabasesView.jsx` — Target for "Lead Audiences" terminology and sticky table polish.
- `client/src/components/PreflightCockpit.jsx` — Target for Deliverability Info Beacons and throttle controls.

</canonical_refs>

<code_context>
## Relevant Codebase Files

- `client/src/components/TemplatesView.jsx`: Template composition, list view, and variable chip insertion.
- `client/src/components/DatabasesView.jsx`: Lead inspection table, schema mapping, and manual disarm action buttons.
- `client/src/components/PreflightCockpit.jsx`: Jitter, working hours, sender routing, and dispatch launch controls.
- `client/src/components/CampaignsView.jsx`: Campaign cockpit, pacing radar, and funnel overview.
- `client/src/components/CampaignFunnelCard.jsx`: Multi-tier funnel cards and reply scanning triggers.
- `client/src/components/SettingsView.jsx`: Mailbox credentials, daily caps, and IMAP configuration.
- `client/src/components/DashboardOverview.jsx`: Metrics cards, day-wise analytics, and quick actions.
- `client/src/components/Sidebar.jsx`: Main navigation bar tabs and active highlights.

</code_context>
