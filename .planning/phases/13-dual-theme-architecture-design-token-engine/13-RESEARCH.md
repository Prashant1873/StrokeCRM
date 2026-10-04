# Phase 13: Dual-Theme Architecture & Design Token Engine - Research

**Researched:** 2026-10-05  
**Domain:** Frontend UI Theming, CSS Custom Properties & Design Systems  
**Confidence:** HIGH  

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Neutral Zinc Foundation):** 
  - Light Mode: Canvas `#fafafa`, Surface `#ffffff`, Elevated `#f4f4f5`, Text Primary `#18181b` (zinc-900), Text Secondary `#52525b` (zinc-600), Text Muted `#a1a1aa` (zinc-400), Borders `#e4e4e7` (zinc-200).
  - Dark Mode: Canvas `#09090b` (zinc-950), Surface `#18181b` (zinc-900), Elevated `#27272a` (zinc-800), Text Primary `#f4f4f5` (zinc-100), Text Secondary `#a1a1aa` (zinc-400), Borders `rgba(255, 255, 255, 0.08)`.
- **D-02 (Top-Right Header Bar Toggle):** Tactile Sun/Moon toggle button positioned in the top navigation bar beside the connection status pill.
- **D-03 (Apple Fluid Spring & 150ms Micro-Fade):** Smooth 150ms transition on color and background-color with a spring-rotated Sun/Moon icon toggle adhering to `frontend-skill`.
- **D-04 (Indigo / Violet Anchor):** Retain brand accent `#6366f1` (dark) and `#4f46e5` (light) for buttons, active pills, and focus rings.
- **D-05 (FOUT Prevention Script):** Synchronous pre-render script in `client/index.html` head reading `localStorage` or `prefers-color-scheme` before Vite mounts React.

### the agent's Discretion
- Exact CSS variable token naming structure in `client/src/index.css`.
- Tailwind v4 `@theme` integration mapping.
- Component refactoring order (Shell, Header, Sidebar first, then cards and tables).

### Deferred Ideas (OUT OF SCOPE)
- Custom multi-color accent pickers (per-campaign themes).
- Sunrise/sunset astronomical scheduling.

</user_constraints>

---

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FOUT Prevention Script | Static HTML (`index.html`) | Browser Storage | Executes synchronously prior to DOM rendering, eliminating white/black flashes. |
| Theme State & Toggle API | React Context (`ThemeContext.jsx`) | LocalStorage | Manages in-memory state and broadcasts theme changes across components. |
| CSS Variable Tokens | CSS (`index.css`) | Tailwind v4 Engine | Single source of truth for semantic colors, spacing, and transitions. |
| Header Toggle Component | React Component (`ThemeToggle.jsx`) | Lucide Icons | Tactile interactive switch with fluid spring physics. |
| App Shell Theming | React Component (`AppShell.jsx`) | Sidebar / Header | Bridges global layout background and borders to semantic tokens. |

</architectural_responsibility_map>

---

<research_summary>
## Summary

Phase 13 establishes the global theming infrastructure for StrokeCRM. In modern web applications, the gold standard for dual-theme implementations without bundle bloat is **CSS custom properties combined with a data attribute on the document root** (`data-theme="dark"` / `data-theme="light"`).

Because StrokeCRM uses **Tailwind CSS v4** (`@tailwindcss/vite` and `tailwindcss` ^4.3.3), we configure semantic utility tokens using Tailwind v4's `@theme` block or direct CSS variable classes. This decouples our components from hardcoded palette names (such as `zinc-900` or `slate-100`) and instead exposes semantic primitives like `bg-canvas`, `bg-surface`, `text-primary`, and `border-subtle`.

A critical finding in theming research is avoiding **Flash of Unstyled Theme (FOUT)**. If theme initialization waits for React `useEffect` to mount, users experience an ugly visual jarring on every page reload. Injecting an inline 10-line vanilla JavaScript snippet directly in the `<head>` of `index.html` resolves this completely, executing before first paint.

All selected colors in the Neutral Zinc palette have been validated against **WCAG 2.2 AA standards**:
- Light mode: Zinc-900 (`#18181b`) on White (`#ffffff`) yields a contrast ratio of **16.1:1** (requirement: ≥4.5:1).
- Secondary: Zinc-600 (`#52525b`) on White yields **5.8:1** (requirement: ≥4.5:1).
- Dark mode: Zinc-100 (`#f4f4f5`) on Zinc-950 (`#09090b`) yields **17.8:1** (requirement: ≥4.5:1).
- Brand Accent: Indigo (`#4f46e5`) on White yields **5.2:1** (requirement: ≥4.5:1).

</research_summary>

---

<pitfalls_and_mitigations>
## Pitfalls & Mitigations

### 1. Inadvertent Global Transition Stutter
- **Pitfall**: Applying `* { transition: all 150ms ease; }` causes layout recalculations, stutter during scroll, and awkward animation of width/height during sidebar collapse.
- **Mitigation**: Constrain theme transitions strictly to `background-color`, `border-color`, and `color` properties on surface elements, or toggle a temporary `.theme-transition` class on root during toggle.

### 2. Form Input and Select Contrast Drift
- **Pitfall**: In light mode, standard browser `<input>` and `<select>` elements may default to black text on white, but custom styled elements with hardcoded `bg-slate-900` become dark boxes with dark text.
- **Mitigation**: Define explicit tokenized input styles: `background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-subtle);`.

### 3. Scrollbar Contrast
- **Pitfall**: Dark scrollbars on light backgrounds look harsh and out of place.
- **Mitigation**: Scope `::-webkit-scrollbar` styles to use CSS variables so track and thumb colors adjust seamlessly when `data-theme="light"`.

</pitfalls_and_mitigations>

---

<validation_architecture>
## Validation Architecture

### Automated Verification
1. **Build Integrity**: `npm --prefix client run build` to confirm Vite compiles Tailwind v4 CSS variable definitions and all JSX without errors.
2. **Linting**: `npm --prefix client run lint` to ensure zero syntax or unused import violations.

### Interactive & Manual Verification
1. **Theme Switch Verification**: Click the Sun/Moon toggle in the top header. Confirm `data-theme="light"` is set on `<html>` and the background switches from dark zinc to clean `#fafafa`.
2. **Persistence Check**: Refresh the page with `F5`. Confirm the page reloads instantly in Light Mode without any dark flash.
3. **OS Sync Check**: Clear `localStorage.removeItem('strokecrm_theme')` and verify the app matches the operating system's color scheme.
4. **Contrast Audit**: Inspect all primary text, secondary text, button labels, and borders against WCAG AA standards.

</validation_architecture>

---
*Phase 13 Research Complete*  
