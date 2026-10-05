# Phase 16 Summary: Campaign Duplication Engine & Triad Cloning

**Execution Status**: Completed ✅  
**Milestone**: v4.0 (Campaign Duplication, Rich Cadences & Contrast Hardening)  
**Date**: October 2026  

---

## 1. Executive Overview

Phase 16 delivers complete campaign and triad duplication capability to StrokeCRM. Operators can clone any existing campaign with 1 click from either the Campaigns Directory (`#/campaigns`) or the Campaign Cockpit (`#/campaigns/:id`). The duplication engine replicates all configuration settings, throttling/jitter parameters, template mappings, subject/body variants, and all multi-step drip cadence steps (`campaign_drip_steps`), while allowing the operator to supply a new campaign name and bind an isolated target database (or upload a fresh spreadsheet inline), maintaining the strict 1:1 Triad model (1 Campaign = 1 Database).

---

## 2. Key Architecture Decisions & Guarantees

### Strict 1:1 Triad Preservation
- In StrokeCRM, every campaign binds exclusively to exactly one audience database (`campaign_id UNIQUE` on `databases`).
- Duplication requires selecting an unattached audience database or uploading a new spreadsheet file directly inside the duplication modal.
- If a selected database was previously associated with another campaign that is currently `RUNNING`, the API rejects the request to prevent concurrent send interference.
- When bound, all contacts in the database start with `included = 1`, `status = 'PENDING'`, and all send/step counters cleanly reset.

### Atomic Transactional Duplication (`POST /api/campaigns/:id/duplicate`)
- The duplication logic executes inside an ACID transaction (`db.transaction`):
  1. Clones the campaign row, inheriting `sender_account_id`, `sender_provider`, `subject_a`, `body_a`, `subject_b`, `body_b`, `is_ab_test`, `min_delay`, `max_delay`, `daily_limit`, `template_id`, `cc_addresses`, and `bcc_addresses`.
  2. Sets `status = 'DRAFT'` and zeroes all performance counters (`sent_count = 0`, `failed_count = 0`, `reply_count = 0`).
  3. Queries all rows from `campaign_drip_steps WHERE campaign_id = sourceId ORDER BY step_number ASC` and duplicates each step mapped to the new campaign ID, preserving delay intervals, threading options, and copy.
  4. Binds the chosen database to the new campaign ID, updating `databases.is_attached = 1` and `campaigns.total_contacts`.

### Direct Spreadsheet Upload in Modal
- Operators can upload `.xlsx`, `.xls`, or `.csv` files directly inside the Duplicate Campaign modal.
- The file is ingested via `/api/databases/upload`, mapped, and auto-selected as the active target database.

---

## 3. UI/UX Implementation

- **Campaign Cards Action Bar**: Added "Duplicate" button (`Copy` icon) on every card in the Campaigns Directory.
- **Campaign Cockpit Header**: Added "Duplicate Campaign" button next to "Send Test Email" in the cockpit header.
- **Duplicate Campaign Modal**:
  - Semantic theme tokens (`bg-surface`, `bg-canvas`, `border-subtle`, `text-primary`) ensuring seamless Dark and Light mode rendering.
  - Pre-filled campaign name input: `[Source Campaign Name] (Copy)`.
  - Database selector grouping available unattached databases.
  - Configuration inheritance preview card detailing inherited settings (templates, pacing, cadence steps, mailbox credentials).
  - On submit, redirects operator directly to the newly cloned campaign cockpit.

---

## 4. Verification & Testing

- Automated test executed via Node against `http://localhost:3002/api/campaigns/:id/duplicate`:
  - Cloned test campaign with 2 drip sequence steps.
  - Confirmed new campaign created in `DRAFT` status with zeroed counters.
  - Confirmed 2 drip steps cloned with identical delay days/hours and copy.
  - Confirmed target database bound with contacts in `PENDING` status.
- Frontend build verified with `npm run build` in `client`: compiled cleanly with zero errors in 3.68s.
