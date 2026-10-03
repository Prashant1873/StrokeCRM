# Requirements: StrokeCRM (Milestone v2.0)

**Defined:** 2026-10-03  
**Core Value:** Reliable, throttle-safe, and personalized bulk cold email dispatch directly from the user's Gmail or custom domain mail account with dynamic Excel/CSV variable mapping, multi-step drip cadence, and automatic reply disarming.

## v2 Requirements

### Custom Domain Mail Connectivity
- [ ] **DOM-01**: User can configure custom domain SMTP connection (host, port 465 SSL / 587 STARTTLS, SSL toggle, username, password) with test-connection verification.
- [ ] **DOM-02**: User can configure custom domain IMAP connection (host, port 993 SSL / 143 STARTTLS, username, password) with test-connection verification.
- [ ] **DOM-03**: User can switch the active sender account between Gmail (App Password/OAuth2) and Custom Domain SMTP in Settings and Campaign Preflight.

### Multi-Step Drip Sequences
- [ ] **DRIP-01**: User can configure multiple sequence steps for a campaign (Step 1 Initial, Step 2 Follow-up, Step 3 Final) with customizable delay intervals in days and hours.
- [ ] **DRIP-02**: User can bind independent email templates and subject/body copy to each sequence step.
- [ ] **DRIP-03**: System supports Organic Threading mode, preserving original `Message-ID` in `In-Reply-To` and `References` headers so follow-ups arrive in the same conversation thread.
- [ ] **DRIP-04**: Queue engine evaluates `scheduled_at` timestamps to dispatch due follow-up steps while respecting working hours, jitter pacing, and daily caps.

### Inbound IMAP Reply Detection & Safety
- [ ] **REPLY-01**: System scans the configured IMAP inbox (periodic background polling and manual "Scan Replies" trigger) for incoming responses from active leads.
- [ ] **REPLY-02**: System automatically marks replied leads as `REPLIED` and immediately cancels all subsequent pending drip steps for that lead.
- [ ] **REPLY-03**: System filters out automated out-of-office and bounce auto-responses (`Auto-Submitted`, `X-Autoreply`) to prevent false-positive sequence halts.
- [ ] **REPLY-04**: User can manually click "Mark as Replied" or "Cancel Follow-ups" for any contact in the campaign lead list.

### Drip Funnel & Sequence Analytics
- [ ] **DASH2-01**: Campaign Cockpit displays a visual step-by-step conversion funnel (Contacts -> Step 1 Sent -> Step 2 Sent -> Step 3 Sent -> Replies).
- [ ] **DASH2-02**: Downloadable CSV audit export and live feed record sequence step numbers and reply event timestamps.

## Future Requirements (v3+)

- **V3-01**: Inbound sentiment analysis (Categorize replies as "Interested", "Not Interested", "Meeting Requested").
- **V3-02**: Outgoing Webhook triggers on lead reply (POST to Zapier / Make / Slack).
- **V3-03**: Built-in DNS verification tool for custom domain SPF, DKIM, and DMARC health checks.

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI Personalized Icebreaker Generator | Dropped per user decision to prioritize clean deliverability, deterministic variable mapping, and zero API token costs. |
| Multi-Account Burner Inbox Rotation | Dropped per user decision to maintain clean, focused domain reputation without spammer-style burner account complexity. |
| Cloud SaaS multi-tenant hosting | StrokeCRM runs locally on the user's machine to keep credentials and lead data 100% private. |
| Browser DOM extension hacking | Extensions are unstable against webmail UI updates and suffer from background tab sleeping. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOM-01 | Phase 10 | Pending |
| DOM-02 | Phase 10 | Pending |
| DOM-03 | Phase 10 | Pending |
| DRIP-01 | Phase 11 | Pending |
| DRIP-02 | Phase 11 | Pending |
| DRIP-03 | Phase 11 | Pending |
| DRIP-04 | Phase 11 | Pending |
| REPLY-01 | Phase 12 | Pending |
| REPLY-02 | Phase 12 | Pending |
| REPLY-03 | Phase 12 | Pending |
| REPLY-04 | Phase 12 | Pending |
| DASH2-01 | Phase 12 | Pending |
| DASH2-02 | Phase 12 | Pending |

**Coverage:**
- v2 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-03*
