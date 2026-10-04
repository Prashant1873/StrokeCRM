# Feature Breakdown: UI Overhaul, Light Mode & Free AI Reply Intelligence

**Milestone:** v3.0  
**Domain:** Local Cold Email Outreach & Privacy-First CRM  
**Date:** 2026-10-05  

---

## 1. Feature Classification

### Must-Have (Table Stakes)
- **Global Theme Engine (Dark / Light)**:
  - Tactile theme toggle in top navigation / sidebar with smooth icon animation (Sun / Moon).
  - Instant transition without page reload or layout shift.
  - Automatic persistence to `localStorage` and initial default sync with OS `prefers-color-scheme`.
  - WCAG AA compliant contrast in both dark and light modes across all buttons, cards, text, badges, and modals.
- **System-Wide UI Polish & Visual Hierarchy**:
  - Unified card styling with subtle borders, elevation shadows, and clean padding.
  - Modernized data tables with zebra striping, sticky headers, and smooth pagination.
  - Fluid spring physics on switches, modals, drawers, and tabs conforming to `frontend-skill`.
  - Consistent layout containers across Dashboard, Campaigns, Templates, Databases, and Settings.
- **Professional UX Copywriting & Terminology**:
  - Replace informal or raw developer strings with clear, authoritative B2B SaaS outreach copy.
  - Clear action-oriented button verbs ("Launch Sequence", "Verify SMTP Handshake", "Synchronize Inbox", "Export Audit Trail").
  - Concise contextual help tooltips explaining technical deliverability concepts (pacing jitter, RFC threading, daily limits, IMAP disarm).
- **Curated Starter Presets Gallery**:
  - High-converting, professionally written cold outreach starter templates accessible from the Templates Library:
    - *The Problem-Centric Pitch* (Direct value proposition + low-friction CTA).
    - *The Case Study / Metric Teaser* (Concrete results + social proof).
    - *The 3-Day Follow-Up Bump* (Gentle, value-add reminder).
    - *The Polite Breakup Closing* (Final non-intrusive farewell that triggers replies).
  - One-click template duplication into user's editable collection with dynamic variable tag placeholders (`{{FirstName}}`, `{{Company}}`).
- **Free AI Inbound Reply Sentiment Analyzer**:
  - Zero-cost sentiment categorization for replies detected by the IMAP scanner:
    - `Interested / Call Requested` (Hot lead: requested demo, asked for meeting, wants pricing).
    - `Question / Information` (Warm lead: requested more details, asked about features/security).
    - `Follow Up Later` (Deferred: asked to circle back next month or next quarter).
    - `Not Interested` (Cold / Closed: polite decline, no budget, not a fit).
    - `Unsubscribe` (Opt-out: demanded removal, do not contact).
  - Short 1-sentence AI summary of the reply intent.
  - Sentiment badges displayed in the Campaign Cockpit activity feed and Database Inspector table.
  - Quick-filter tabs in Cockpit (`All`, `Interested`, `Questions`, `Follow Up`, `Not Interested`).
- **AI Settings & Fallback Controls**:
  - Free API Key configuration modal in Settings (with 1-click test button and step-by-step free key acquisition guide).
  - Toggle to enable/disable automated AI sentiment analysis on incoming replies.
  - Built-in local rule-based heuristic classifier operating seamlessly when no API key is provided.

### Should-Have (Differentiators)
- **Manual Sentiment Override**:
  - 1-click dropdown in the Database Inspector allowing the operator to correct or change a lead's classified sentiment if the AI misinterprets nuance.
- **Quick Reply Draft Generator**:
  - 1-click "Suggest Reply" button in the lead detail modal that drafts an appropriate response based on the detected sentiment (e.g. provides calendar link for Interested, provides quick answer framework for Question).
- **Sentiment Conversion Metrics**:
  - Funnel enhancement showing positive sentiment reply rate vs negative sentiment reply rate.

### Out of Scope (Defer to v4+)
- **Automated AI Reply Dispatch**: We classify replies and draft suggestions, but never send automated responses without human review.
- **Multi-Account Mailbox Rotation**: Deferred to keep v3.0 tightly focused on UI overhaul, copywriting, and reply intelligence.
- **Native CRM Webhooks**: Pushing leads to external webhooks (e.g., Zapier/HubSpot) deferred to subsequent versions.

---

## 2. User Flows & Scenarios

### Scenario A: Switching to Light Mode
1. User clicks the Sun icon in the top header.
2. The entire application transitions smoothly to a crisp, high-contrast light theme with zero unstyled flashes.
3. Contrast is sharp and readable; cards have subtle borders and light elevation.
4. Preference is saved to `localStorage` and persists on page reload.

### Scenario B: Ingesting an Inbound Reply & Viewing Sentiment
1. Background IMAP poller detects a new reply from `sarah@enterprise.com`.
2. System disarms the lead's next scheduled drip step atomically.
3. The sentiment engine analyzes the incoming email body via Gemini 1.5 Flash (or local heuristic fallback).
4. Sentiment is tagged as `Interested` with 98% confidence and summary: *"Sarah asked for pricing and a 15-minute call next Tuesday"*.
5. Campaign Cockpit displays a vibrant green `Interested` badge on Sarah's row and increments the Interested count.
6. Operator filters cockpit table to `Interested` leads with 1 click to prioritize follow-up.

### Scenario C: Drafting a Cold Campaign Using Curated Starter Presets
1. User opens Templates Library (`#/templates`).
2. Clicks "Starter Presets Gallery" and selects "Problem-Centric B2B Pitch".
3. Template is cloned into their collection with pre-formatted variable pills and spam score analysis.
4. The copy is professional, punchy, and ready for lead variable mapping.
