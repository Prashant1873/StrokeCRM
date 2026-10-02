# Requirements: StrokeCRM

**Defined:** 2026-10-03  
**Core Value:** Reliable, throttle-safe, and personalized bulk cold email dispatch directly from the user's Gmail account with dynamic Excel/CSV variable mapping and zero duplicate sends.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Account Connectivity
- [ ] **AUTH-01**: User can configure Gmail connection using an App Password (SMTP/IMAP) with test-connection verification.
- [ ] **AUTH-02**: User can configure Gmail connection using OAuth 2.0 (Client ID / Client Secret with token refresh).
- [ ] **AUTH-03**: System securely stores credentials locally in SQLite.

### Contact List & File Ingestion
- [ ] **LEAD-01**: User can upload `.xlsx`, `.xls`, and `.csv` lead files.
- [ ] **LEAD-02**: System automatically parses column headers and detects recipient email column with manual override.
- [ ] **LEAD-03**: User can preview parsed lead rows and review total contact count and sample data.

### Template & Personalization Engine
- [ ] **TMPL-01**: User can write rich subject lines and email bodies with handlebars-style variables (e.g. `{{FirstName}}`, `{{Company}}`).
- [ ] **TMPL-02**: User can preview rendered templates for any selected row from the uploaded dataset.
- [ ] **TMPL-03**: System provides fallback values for missing row fields (e.g. `{{FirstName | "there"}}`).
- [ ] **TMPL-04**: System includes a Spam Keyword Detector highlighting risky buzzwords before sending.

### Pacing, Scheduling & Dispatch Queue
- [ ] **DISP-01**: User can set min/max randomized delay duration between consecutive emails (e.g., 45s to 120s jitter).
- [ ] **DISP-02**: User can define daily send caps (e.g. max 100/day) to stay safely within Gmail rate limits.
- [ ] **DISP-03**: User can specify sending schedules (allowed time window e.g., 09:00 - 18:00 and days of week).
- [ ] **DISP-04**: Persistent queue state machine in SQLite tracks states: `PENDING`, `SENDING`, `SENT`, `FAILED`, `PAUSED`.
- [ ] **DISP-05**: User can start, pause, resume, or abort an active campaign with zero duplicate sends on resume.

### A/B Testing Engine
- [ ] **AB-01**: User can configure Variant A and Variant B for subject lines and/or email bodies.
- [ ] **AB-02**: System automatically splits the contact list 50/50 across variants during dispatch.
- [ ] **AB-03**: Dedicated A/B testing page presents comparative performance metrics (sends, opens/replies).

### Analytics & Day-Wise Dashboard
- [ ] **DASH-01**: Real-time dashboard showing campaign progress bar, sent vs remaining counts, and live status feed.
- [ ] **DASH-02**: Day-wise bar/line chart visualizing number of emails sent per day over time.
- [ ] **DASH-03**: Daily quota gauge showing remaining Gmail daily allowance.
- [ ] **DASH-04**: Downloadable audit log / export of sent and failed emails with error messages.

## v2 Requirements

Deferred to future releases.

- **V2-01**: Automated multi-step follow-up sequences (Drip step 2 and 3 after X days).
- **V2-02**: Inbound reply detection via IMAP/Gmail API to automatically cancel scheduled follow-ups.
- **V2-03**: AI personalized icebreaker generator (OpenAI / Ollama / Claude integration per lead row).
- **V2-04**: Multi-account Gmail inbox rotation (spreading 500 emails across 3 sender accounts).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Third-party cloud SaaS hosting | The platform is built as a local, private tool to avoid subscription fees and protect lead privacy. |
| Spam scraping engines | Focus is strictly on clean CRM outreach with opt-out mechanisms. |
| Browser DOM extension hacking | Extensions are unstable against Gmail UI updates and suffer from background tab sleeping. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| LEAD-01 | Phase 2 | Pending |
| LEAD-02 | Phase 2 | Pending |
| LEAD-03 | Phase 2 | Pending |
| TMPL-01 | Phase 3 | Pending |
| TMPL-02 | Phase 3 | Pending |
| TMPL-03 | Phase 3 | Pending |
| TMPL-04 | Phase 3 | Pending |
| DISP-01 | Phase 4 | Pending |
| DISP-02 | Phase 4 | Pending |
| DISP-03 | Phase 4 | Pending |
| DISP-04 | Phase 4 | Pending |
| DISP-05 | Phase 4 | Pending |
| AB-01 | Phase 5 | Pending |
| AB-02 | Phase 5 | Pending |
| AB-03 | Phase 5 | Pending |
| DASH-01 | Phase 6 | Pending |
| DASH-02 | Phase 6 | Pending |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-03*
