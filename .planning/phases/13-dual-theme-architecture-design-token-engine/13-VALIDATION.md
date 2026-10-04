---
phase: 13
slug: dual-theme-architecture-design-token-engine
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-05
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vite Build Compiler & Oxlint Linter |
| **Config file** | `client/vite.config.js`, `client/.oxlintrc.json` |
| **Quick run command** | `npm --prefix client run build` |
| **Full suite command** | `npm --prefix client run build && npm --prefix client run lint` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm --prefix client run build`
- **After plan wave completion:** Run `npm --prefix client run build && npm --prefix client run lint`
- **Before `/gsd-verify-work`:** Full suite must compile cleanly with 0 errors
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | THEME-04 | — | N/A | build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 13-01-02 | 01 | 1 | THEME-02, THEME-03 | — | Sanitized storage read | unit/build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 13-01-03 | 01 | 2 | THEME-01 | — | N/A | build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 13-01-04 | 01 | 2 | THEME-01, THEME-04 | — | High contrast ratio | visual/build | `npm --prefix client run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No additional test runner installation required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FOUT-Free Page Reload | THEME-03 | Visual rendering artifact prior to JS hydration | Switch to Light Mode, hit hard refresh (`Ctrl+F5`), verify zero dark flash occurs before page paint. |
| Contrast Ratio Compliance | THEME-04 | Visual accessibility audit | Use browser DevTools contrast inspector on body text, badges, and buttons to confirm ≥ 4.5:1 ratio. |
| Smooth Spring Physics | THEME-01 | Micro-interaction animation feel | Click Sun/Moon toggle repeatedly; observe tactile rotation and 150ms opacity transition without layout shift. |

---

## Validation Sign-Off

- [x] All tasks have automated build and lint checks
- [x] Sampling continuity: every task validates with Vite build
- [x] Wave 0 requires zero external dependencies
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
