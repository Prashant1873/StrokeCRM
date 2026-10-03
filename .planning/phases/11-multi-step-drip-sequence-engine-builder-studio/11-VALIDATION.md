# Phase 11: Multi-Step Drip Sequence Engine & Builder Studio - Validation

**Date:** 2026-10-03  
**Status:** Defined  

## 1. Test Matrix & Acceptance Checkpoints

| Checkpoint | Requirement | Verification Method | Expected Result |
|------------|-------------|---------------------|-----------------|
| CP-01 | DRIP-01 | SQLite inspect `campaign_drip_steps` | Table exists with `delay_days`, `delay_hours`, `step_number` columns. |
| CP-02 | DRIP-01 | API test `POST /api/campaigns/:id/drip-steps` | Steps 1, 2, 3 save and persist across reloads. |
| CP-03 | DRIP-02 | Step template binding & variable interpolation | Custom subject and body with `{{FirstName}}` interpolate correctly for each step. |
| CP-04 | DRIP-03 | Organic Threading headers | Follow-up sends include `In-Reply-To` and `References` matching Step 1's `message_id`. |
| CP-05 | DRIP-04 | Queue scheduling & timestamp evaluation | Worker only dispatches contacts whose `next_step_scheduled_at <= now()`. |
| CP-06 | DRIP-04 | Non-premature completion | Campaigns with pending future steps remain in `WAITING_SCHEDULE` rather than closing. |
| CP-07 | Non-Regression | Single-step campaign dispatch | Campaigns without follow-ups dispatch and complete exactly as in v1.0. |
| CP-08 | Frontend | `npm run build --prefix client` | Client builds cleanly with 0 TypeScript/JSX syntax errors. |

---

## 2. Automated & Manual Test Scripts

### 2.1 Backend Schema & API Test
```bash
node -e "
const db = require('./server/db');
const tableInfo = db.prepare('PRAGMA table_info(campaign_drip_steps)').all();
console.log('campaign_drip_steps cols:', tableInfo.map(c => c.name));
const recordCols = db.prepare('PRAGMA table_info(database_records)').all();
console.log('database_records cols:', recordCols.map(c => c.name));
const logCols = db.prepare('PRAGMA table_info(email_logs)').all();
console.log('email_logs cols:', logCols.map(c => c.name));
"
```

### 2.2 Threading Header Verification
Verify that `dispatchSingleEmail` in `queueService.js` injects `In-Reply-To` and `References` when `stepNumber > 1` and `threadReply === 1`.

### 2.3 Frontend Compilation
```bash
npm run build --prefix client
```

---

## 3. Edge Cases to Guard Against

1. **Missing Initial Message ID**: If Step 1 sent prior to Phase 11 or without a returned `Message-ID`, follow-up steps should gracefully fall back to subject-based threading (`Re: ...`) without throwing errors.
2. **Zero Delay Configuration**: If user sets 0 days and 0 hours, Step 2 is eligible for dispatch immediately on next queue tick.
3. **Database Reopening**: When resetting or restarting a campaign, step state (`current_step = 1`, `next_step_scheduled_at = NULL`) resets cleanly for pending rows.
