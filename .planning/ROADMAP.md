# Roadmap: StrokeCRM

## Milestones

- ✅ **v1.0 Initial MVP** — Phases 1-9 (shipped 2026-10-03)
- 🚧 **v2.0 Custom Domains & Automated Drips** — Phases 10-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Initial MVP (Phases 1-9) — SHIPPED 2026-10-03</summary>

- [x] Phase 1: Project Scaffolding & Dual Gmail Authentication Gateway (completed 2026-10-03)
- [x] Phase 2: Lead Ingestion & Variable Header Mapping (completed 2026-10-03)
- [x] Phase 3: Template Personalization Engine & Spam Preflight (completed 2026-10-03)
- [x] Phase 4: Resilient Queue & Pacing Dispatcher (completed 2026-10-03)
- [x] Phase 5: A/B Testing Studio (completed 2026-10-03)
- [x] Phase 6: Day-Wise Analytics Dashboard & Polish (completed 2026-10-03)
- [x] Phase 7: Traceable Routing, Breadcrumb System & App Shell Architecture (completed 2026-10-03)
- [x] Phase 8: Multi-Step Wizards & Contextual Preflight Option Controls (completed 2026-10-03)
- [x] Phase 9: Frontend-Skill Polish, Apple Fluid Motion & WCAG 2.2 AA Hardening (completed 2026-10-03)

</details>

## Milestone v2.0: Custom Domains & Automated Drips

- [ ] **Phase 10: Custom Domain SMTP & IMAP Account Gateway** - Universal SMTP/IMAP configuration with port & SSL auto-detection, connection testing, and active sender selection.
- [ ] **Phase 11: Multi-Step Drip Sequence Engine & Builder Studio** - Sequence builder for Step 1, 2, and 3 with custom delay intervals, template binding, organic email threading (`In-Reply-To`), and scheduled dispatch.
- [ ] **Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics** - Background IMAP reply scanner, auto-responder filtering, atomic follow-up disarming (`CANCELLED_REPLIED`), manual reply marking, and step conversion funnel metrics.

---

## Phase Details

### Phase 10: Custom Domain SMTP & IMAP Account Gateway
**Goal**: Allow users to connect custom domain email addresses (e.g. `user@mycompany.com`, Zoho, Fastmail, Namecheap, Outlook 365) via standard SMTP and IMAP protocols with test connection validation.  
**Depends on**: Phase 9  
**Requirements**: [DOM-01, DOM-02, DOM-03]  
**Success Criteria**:
1. User can enter custom SMTP server credentials (host, port 465/587/25, SSL/TLS toggle, username, password) and receive instant connection verification test results.
2. User can enter custom IMAP server credentials (host, port 993/143, SSL/TLS toggle, username, password) and receive instant connection verification test results.
3. User can switch active sending provider between Gmail App Password, Gmail OAuth2, and Custom Domain SMTP in Settings and Campaign Preflight.
4. Custom domain credentials persist securely in encrypted SQLite settings.

### Phase 11: Multi-Step Drip Sequence Engine & Builder Studio
**Goal**: Enable campaigns to schedule automated multi-step follow-up sequences (Step 1, Step 2 after N days, Step 3 after M days) with independent templates, organic conversation threading, and throttle-safe scheduled queue dispatch.  
**Depends on**: Phase 10  
**Requirements**: [DRIP-01, DRIP-02, DRIP-03, DRIP-04]  
**Success Criteria**:
1. User can define Step 1, Step 2, and Step 3 in the Campaign Cockpit with custom day/hour delay offsets.
2. User can bind distinct subject and body templates to each step with dynamic header variable support.
3. Follow-up emails sent as Step 2 or 3 preserve original `Message-ID` in `In-Reply-To` and `References` headers for organic in-thread replies.
4. Queue engine evaluates `scheduled_at` timestamps and dispatches eligible follow-up steps respecting working hours and daily send caps.

### Phase 12: Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics
**Goal**: Automatically detect inbound replies from leads via IMAP, disarm subsequent follow-up steps for replied leads, filter out auto-responders, and display visual funnel metrics.  
**Depends on**: Phase 11  
**Requirements**: [REPLY-01, REPLY-02, REPLY-03, REPLY-04, DASH2-01, DASH2-02]  
**Success Criteria**:
1. Background IMAP poller (and manual "Scan Replies" button) detects incoming responses matching active campaign leads.
2. Replying leads transition to `REPLIED` status, and all pending subsequent steps are atomically marked `CANCELLED_REPLIED`.
3. Out-of-office and bounce auto-responders are filtered out via `Auto-Submitted` / `X-Autoreply` headers to prevent false halts.
4. User can manually mark any lead as replied or cancel follow-ups with a single click.
5. Campaign Cockpit displays a step-by-step conversion funnel and downloadable audit export with step and reply timestamps.
