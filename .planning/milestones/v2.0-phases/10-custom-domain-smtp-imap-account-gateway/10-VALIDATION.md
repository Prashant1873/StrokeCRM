---
phase: 10
slug: custom-domain-smtp-imap-account-gateway
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-03
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node --check` / Express API endpoint testing |
| **Config file** | `package.json` |
| **Quick run command** | `node server/index.js --test-dry-run` or endpoint probe |
| **Full suite command** | `node -e "require('./server/db'); console.log('DB ok')"` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run quick syntax and DB migration check
- **After every plan wave:** Verify frontend build (`npm run build --prefix client`)
- **Before `/gsd-verify-work`:** Full custom domain settings, handshake tests, and dispatch test pass
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DOM-01, DOM-02 | T-10-01 | Encrypted password storage, port validation | backend | `node -e "require('./server/db')"` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | DOM-01, DOM-02 | T-10-02 | Safe TCP handshake without blocking process | api | `curl -s http://localhost:5000/api/settings` | ✅ | ⬜ pending |
| 10-01-03 | 01 | 2 | DOM-03 | T-10-03 | Active provider resolution and campaign picker | integration | `npm run build --prefix client` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Custom SMTP Handshake | DOM-01 | Requires valid external mail server credentials | Enter custom host/port in SettingsView, click "Test SMTP Connection", verify green banner |
| Custom IMAP Handshake | DOM-02 | Requires valid external mail server credentials | Enter custom IMAP host/port in SettingsView, click "Test IMAP Connection", verify green banner |
| Live Test-Send Verification | DOM-01, DOM-03 | Sends live email across public Internet | Enter personal recipient email, click "Send Test Email to Me", verify inbox receipt |

---

## Validation Sign-Off

- [x] All tasks have verification instructions
- [x] Sampling continuity verified
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-03
