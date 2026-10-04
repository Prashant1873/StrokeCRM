# Phase 15: Free AI Inbound Reply Sentiment Engine & Cockpit Intelligence - Context

**Gathered:** 2026-10-05  
**Status:** Ready for planning  

---

<domain>
## Phase Boundary

Phase 15 builds an asynchronous, zero-cost inbound email reply sentiment analysis engine and integrates intelligence directly into the Campaign Cockpit and Database Inspector.

It leverages Google Gemini 1.5 Flash's free API tier (1,500 requests/day, zero credit card requirement) via native Node.js `fetch` with structured JSON responses, coupled with an automatic local regex/keyword heuristic classifier that operates offline or as an instantaneous fallback when no API key is configured.

Detected inbound human replies are sanitized (quoted thread text stripped), asynchronously classified into 5 clear outreach categories (`Interested`, `Question`, `Follow Up`, `Not Interested`, `Unsubscribe`), annotated with a 1-sentence synopsis, and surfaced in the UI with color-coded badges, 1-click filter tabs, and operator manual override controls.

</domain>

<decisions>
## Implementation Decisions

### 1. Dual Classification Engine Architecture (Free Gemini 1.5 Flash + Local Heuristic)
- **D-01:** Gemini 1.5 Flash Free REST Client with Zero External SDKs:
  - Uses native Node 18+ `fetch` calling `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}` with `generationConfig: { responseMimeType: "application/json" }`.
  - Zero heavy Google cloud dependencies added to `package.json`.
  - Free tier allows 15 RPM and 1,500 RPD, well above any standard single-user cold outreach volume.
- **D-02:** Zero-Dependency Regex/Keyword Local Heuristic Fallback:
  - Runs instantly offline if no API key is saved, if the key is invalid, or if Gemini returns a network/rate-limit error.
  - Categorizes text using weighted sentiment patterns (e.g. "interested", "let's talk", "pricing", "send info", "not interested", "unsubscribe", "remove me", "follow up next month").
  - Ensures the reply processing pipeline never crashes or drops data.
  — **Reversibility:** reversible — Clean service abstraction in `server/sentimentService.js`.

### 2. Non-Blocking Asynchronous Processing Invariant
- **D-03:** Sequence Disarm Priority:
  - When the IMAP scanner detects a human response, the database record is **immediately and atomically disarmed** (`status = 'REPLIED'`, `next_step_scheduled_at = NULL`).
  - Sentiment classification is launched asynchronously in the background. If AI analysis takes 800ms, the drip sequence is already securely halted and cannot accidentally dispatch a follow-up.
  — **Reversibility:** reversible — Non-blocking promise dispatch in `replyScannerService.js`.

### 3. Thread Stripping & Privacy Sanitization
- **D-04:** Quoted Thread Truncation:
  - Outbound email history and forward headers (`On ... wrote:`, `> ...`, `From: ...`, `-----Original Message-----`) are stripped before sentiment evaluation.
  - Protects token limits, removes noise, and ensures the sentiment reflects only the new recipient reply.
  — **Reversibility:** reversible — Deterministic string parser.

### 4. Direct Cockpit Observability & Manual Override
- **D-05:** 1-Click Sentiment Filters & Color-Coded Badges:
  - Campaign Cockpit and Lead Audiences inspector display color-coded sentiment chips:
    - `Interested`: Emerald (`#10b981`)
    - `Question`: Blue (`#3b82f6`)
    - `Follow Up`: Amber (`#f59e0b`)
    - `Not Interested`: Slate/Zinc (`#71717a`)
    - `Unsubscribe`: Rose (`#f43f5e`)
  - Quick-filter tabs in the lead table allow 1-click filtering by sentiment category.
  - Operators can click any sentiment badge to open a 1-click dropdown and manually override or correct the classification at any time.
  — **Reversibility:** reversible — React UI component with standard REST endpoint.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `.planning/REQUIREMENTS.md` §Free AI Reply Sentiment Intelligence — SENT-01 through SENT-07.
- `.planning/phases/14-system-wide-ui-modernization-professional-ux-copywriting/14-01-SUMMARY.md` — Dual-theme styling and semantic CSS token conventions.
- `server/replyScannerService.js` — IMAP reply detection and disarm loop.
- `server/db.js` — SQLite database schema and settings storage.
- `client/src/components/SettingsView.jsx` — Settings and API configuration view.
- `client/src/components/CampaignsView.jsx` — Campaign cockpit and lead inspection table.
- `client/src/components/DatabasesView.jsx` — Lead Audiences inspection table.

</canonical_refs>

<code_context>
## Relevant Codebase Files

- `server/sentimentService.js`: (New) Gemini REST client, local heuristic classifier, thread stripper, and API handshake tester.
- `server/replyScannerService.js`: IMAP inbox fetcher, message body extraction, and async sentiment trigger.
- `server/db.js`: Database schema migration for sentiment columns and default settings.
- `server/index.js`: API endpoints for Gemini key handshake, sentiment override, and filtered lead queries.
- `client/src/components/SettingsView.jsx`: Free AI configuration card and real-time handshake check.
- `client/src/components/CampaignsView.jsx`: Campaign cockpit sentiment badges, filters, and override actions.
- `client/src/components/DatabasesView.jsx`: Lead Audiences inspector sentiment column and override actions.

</code_context>
