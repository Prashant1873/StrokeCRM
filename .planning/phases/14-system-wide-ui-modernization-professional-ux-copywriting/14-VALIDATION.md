---
phase: 14
slug: system-wide-ui-modernization-professional-ux-copywriting
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-05
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vite Build Compiler & Oxlint Linter |
| **Config file** | `client/vite.config.js`, `client/.oxlintrc.json` |
| **Quick run command** | `npm --prefix client run build` |
| **Full suite command** | `npm --prefix client run build; npm --prefix client run lint` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm --prefix client run build`
- **After plan wave completion:** Run `npm --prefix client run build; npm --prefix client run lint`
- **Before `/gsd-verify-work`:** Full suite must compile cleanly with 0 errors
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | COPY-02 | — | XSS safe tooltip popovers | build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 14-01-02 | 01 | 1 | COPY-03, COPY-04 | — | Valid variable interpolation | build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 14-01-03 | 01 | 2 | COPY-01, COPY-05 | — | WCAG AA contrast compliance | visual/build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 14-01-04 | 01 | 2 | COPY-01, COPY-02, COPY-05 | — | Dual-theme token consistency | visual/build | `npm --prefix client run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing build and lint infrastructure covers all phase requirements. No additional test runner installation required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Starter Preset Cloning | COPY-03, COPY-04 | End-to-end user workflow in UI | In `#/templates`, click "Starter Presets Gallery", click "Use This Preset" on "Direct Pitch", confirm new template is created and opened in composer. |
| Deliverability Tooltips | COPY-02 | Visual hover/focus interaction | Open `#/campaigns/:id/preflight`, hover over `(i)` icons for Pacing Jitter and Threading, verify popover opens with zero clipping. |
| Dual-Theme Token Audit | COPY-05 | Visual theme verification | Switch between Light and Dark mode across Dashboard, Audiences, Campaigns, and Templates; verify high contrast and zero invisible text. |

---

## Validation Sign-Off

- [x] All tasks have automated build and lint checks
- [x] Sampling continuity: every task validates with Vite build
- [x] Wave 0 requires zero external dependencies
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
