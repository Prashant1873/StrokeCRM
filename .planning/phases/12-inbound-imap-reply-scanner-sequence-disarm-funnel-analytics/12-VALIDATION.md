# Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics - Validation

**Date:** 2026-10-03  
**Status:** Defined  

## 1. Test Matrix & Acceptance Checkpoints

| Checkpoint | Requirement | Verification Method | Expected Result |
|------------|-------------|---------------------|-----------------|
| CP-01 | REPLY-01 | IMAP Scanner Config Resolver | `resolveImapConfig()` correctly resolves Custom Domain or Gmail App Password credentials without throwing. |
| CP-02 | REPLY-01 | `POST /api/replies/scan` endpoint | Endpoint executes inbox scan and returns count of scanned and matched messages. |
| CP-03 | REPLY-02 | Atomic Sequence Disarm | Matched reply updates contact to `status = 'REPLIED'` and sets `next_step_scheduled_at = NULL`. |
| CP-04 | REPLY-03 | Auto-Responder Filter | Messages with `Auto-Submitted` or out-of-office subject lines are flagged `is_auto_reply = 1` and do not disarm sequences. |
| CP-05 | REPLY-04 | Manual Mark as Replied | Endpoint `POST /api/campaigns/:id/contacts/:contactId/mark-replied` disarms lead immediately. |
| CP-06 | DASH2-01 | Conversion Funnel UI | Cockpit displays Step 1 -> Step 2 -> Step 3 -> Replies drop-off funnel and conversion percentages. |
| CP-07 | DASH2-02 | CSV Audit Export | Endpoint `GET /api/campaigns/:id/export-audit` streams valid CSV with all contact step timestamps. |
| CP-08 | Frontend | `npm run build --prefix client` | Client builds cleanly with 0 JSX/Tailwind compilation errors. |

---

## 2. Automated & Manual Test Scripts

### 2.1 Backend Schema & Service Test
```bash
node -e "
const db = require('./server/db');
const replyScanner = require('./server/replyScannerService');
console.log('reply_logs columns:', db.prepare('PRAGMA table_info(reply_logs)').all().map(c => c.name));
console.log('replyScanner service loaded successfully');
"
```

### 2.2 Client Production Build
```bash
npm run build --prefix client
```

---

## 3. Edge Cases to Guard Against

1. **IMAP Credentials Missing or Invalid**: Return clean, actionable error banner in the UI instructing user to configure IMAP in Settings without crashing the app.
2. **Duplicate Reply Processing**: Use `message_id` deduplication so scanning the inbox multiple times does not increment reply counts repeatedly.
3. **Empty Campaign Database**: Funnel calculations gracefully handle 0 total contacts or 0 sent emails without divide-by-zero errors.
