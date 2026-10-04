# Phase 13: Dual-Theme Architecture & Design Token Engine - Context

**Gathered:** 2026-10-05  
**Status:** Ready for planning  

---

<domain>
## Phase Boundary

Phase 13 establishes the foundational CSS variable design token system and dual-theme runtime engine (Dark Mode & Light Mode) for StrokeCRM. It delivers instant, flash-free theme toggling via a top-right header button, persists user preference to `localStorage` with OS sync, and guarantees WCAG AA compliant contrast ratios across both modes.

</domain>

<decisions>
## Implementation Decisions

### 1. Palette & Neutral Tone
- **D-01:** Neutral Zinc Foundation — The light theme uses a crisp, balanced neutral palette:
  - Light Canvas: `#fafafa`
  - Light Surface / Cards: `#ffffff`
  - Light Elevated Panels: `#f4f4f5`
  - Light Typography: Primary `#18181b` (zinc-900), Secondary `#52525b` (zinc-600), Muted `#a1a1aa` (zinc-400)
  - Light Borders: `#e4e4e7` (zinc-200)
  - Dark Mode continues with deep zinc: Canvas `#09090b` (zinc-950), Surface `#18181b` (zinc-900), Text `#f4f4f5` (zinc-100), Border `rgba(255, 255, 255, 0.08)`.
  — **Reversibility:** costly — Foundation tokens are referenced by every component across the application.

### 2. Switcher Placement & Form Factor
- **D-02:** Top-Right Header Bar Toggle — Position a tactile Sun/Moon toggle button in the top navigation bar, right beside the server/account connection status pill, ensuring instant access from any screen without digging into settings.
  — **Reversibility:** reversible — Component placement in header shell.

### 3. Transition Dynamics & Fluid Motion
- **D-03:** Apple Fluid Spring & 150ms Micro-Fade — Smooth 150ms transition on color/background-color properties with a spring-rotated Sun/Moon icon toggle adhering to `frontend-skill` (no layout stutter, no abrupt jarring flashes).
  — **Reversibility:** reversible — Controlled via CSS transition rules.

### 4. Brand Accent Anchor
- **D-04:** Indigo / Violet Anchor — Retain brand accent indigo/violet (`#6366f1` in dark mode, `#4f46e5` in light mode) for active pills, CTA buttons, focus rings, and metric gauges to guarantee >4.5:1 contrast against both dark and light surfaces.
  — **Reversibility:** reversible — Tokenized as `--accent-primary` and `--accent-primary-hover`.

### 5. Flash-Free Pre-Render Execution
- **D-05:** FOUT Prevention Script — Inject a lightweight synchronous pre-render `<script>` inside `client/index.html` head that reads `localStorage.getItem('strokecrm_theme')` (or `window.matchMedia('(prefers-color-scheme: light)')`) and immediately sets `data-theme` on `document.documentElement` before Vite mounts React.
  — **Reversibility:** reversible — Single script injection in `index.html`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `.planning/REQUIREMENTS.md` §Theme & Design Tokens — THEME-01 through THEME-04 definitions.
- `.planning/research/SUMMARY.md` §Implications for Roadmap — Phase 13 scope and architectural boundaries.
- `.planning/research/ARCHITECTURE.md` §Dual-Theme CSS Token Architecture — Token definitions and `ThemeContext` contract.
- `.planning/research/PITFALLS.md` §Theming & Light Mode Pitfalls — Guidelines on avoiding invisible text and FOUT.
- `client/src/index.css` — Existing global styles, font imports, and component utility classes.
- `client/src/App.jsx` — Existing shell layout, header bar, and navigation mounting point.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lucide-react`: Contains `Sun`, `Moon`, and `Monitor` icons ready for toggle rendering.
- `client/src/index.css`: Already defines custom scrollbars, animations, and typography. Will house the CSS custom property definitions.

### Established Patterns
- URL Hash routing in `client/src/App.jsx` maintains browser history without backend roundtrips.
- Dark cockpit aesthetic previously used hardcoded `zinc-900`, `zinc-950`, `zinc-800`.

### Integration Points
- `client/index.html`: Pre-render theme initialization script.
- `client/src/context/ThemeContext.jsx`: Global theme state provider and toggle API.
- `client/src/components/ThemeToggle.jsx`: Animated tactile switch component.
- `client/src/App.jsx`: Header integration and `ThemeProvider` wrapper.

</code_context>

<specifics>
## Specific Ideas
- Clean, tactile feel inspired by Linear and Vercel's neutral light mode.
- Subtle rotation on Sun/Moon icon toggle on click with spring bounce.

</specifics>

<deferred>
## Deferred Ideas
- Per-campaign custom accent themes (deferred to keep system design tight and cohesive).
- Automatic daytime/nighttime scheduling based on local sunrise/sunset times (deferred, system OS sync is sufficient).

</deferred>

---
*Phase: 13-Dual-Theme-Architecture-Design-Token-Engine*  
*Context gathered: 2026-10-05*  
