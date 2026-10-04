# Pitfalls & Mitigations: UI Overhaul, Light Mode & Free AI Reply Intelligence

**Milestone:** v3.0  
**Domain:** Local Cold Email Outreach & Privacy-First CRM  
**Date:** 2026-10-05  

---

## 1. Theming & Light Mode Pitfalls

### Pitfall 1.1: Incomplete Theming & Invisible Text
- **Risk**: Hardcoded Tailwind dark classes (e.g., `text-white` or `bg-zinc-900`) left on individual components, causing white text on white cards or dark gray text on black cards when switching themes.
- **Warning Signs**: Unreadable table rows, washed-out icons, or modal backdrops that blend into the page.
- **Prevention Strategy**:
  - Ban ad-hoc raw hex and arbitrary dark classes in modified components.
  - Rely strictly on CSS semantic variables (`text-primary`, `bg-surface`, `border-subtle`).
  - Systematically audit every view (Dashboard, Campaigns Hub, Cockpit, Templates, Databases, Settings) in both modes.

### Pitfall 1.2: Flash of Unstyled Theme (FOUT) on Load
- **Risk**: Page loads with default dark mode, reads `localStorage` after React mounts, and flashes to light mode, jarring the user.
- **Prevention Strategy**:
  - In `client/index.html`, inject a tiny inline `<script>` before the root React container that immediately reads `localStorage.getItem('strokecrm_theme')` and sets `document.documentElement.setAttribute('data-theme', theme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'))`.

---

## 2. Free AI & Sentiment Analysis Pitfalls

### Pitfall 2.1: Free AI Rate Limits or Network Timeouts Blocking Inbound Scanning
- **Risk**: If the user receives 20 replies at once and the Gemini free tier throttles or Google API responds slowly, the IMAP reply scanner could stall or crash.
- **Warning Signs**: Unhandled Promise rejections, hung IMAP connection, or failure to disarm drip sequences.
- **Prevention Strategy**:
  - The IMAP reply scanner must perform sequence disarming **first and atomically**, before sentiment analysis is called.
  - Sentiment analysis must run in a safe `try / catch` block with a 5-second timeout.
  - If the Gemini API returns a 429 rate limit or network error, it must immediately fall back to the built-in rule-based heuristic classifier without throwing or halting the background job.

### Pitfall 2.2: Context Window Bloat & Quoted History Hallucination
- **Risk**: When leads reply, their email often contains the entire preceding email thread, disclaimers, and footers. Analyzing the entire thread wastes token budget and risks the AI classifying the *sender's* original pitch rather than the *lead's* actual response.
- **Warning Signs**: Incorrect sentiment classifications (e.g. classifying our own pitch's CTA as "Interested").
- **Prevention Strategy**:
  - Sanitize the reply body before sending to the classifier: extract only text above standard email reply markers (`> `, `On ... wrote:`, `From:`, `-----Original Message-----`).
  - Cap analyzed body length to 1,500 characters.

### Pitfall 2.3: Inaccurate Nuance or Sarcasm Misclassification
- **Risk**: A lead writes "Sure, email me again when pigs fly" and a naive classifier marks it as "Interested".
- **Prevention Strategy**:
  - Engineer the prompt with clear negative/sarcasm few-shot examples.
  - Provide a 1-click manual sentiment override in the Cockpit and Database Inspector so the human operator can instantly correct any misclassification with zero friction.

---

## 3. Copywriting & Tone Pitfalls

### Pitfall 3.1: Dense or Generic Buzzwords
- **Risk**: Replacing simple functional copy with corporate jargon that confuses users (e.g. "Synergize outbound velocity").
- **Prevention Strategy**:
  - Follow concise B2B SaaS principles: action-oriented, clear, and direct (e.g., "Launch Campaign", "Test Handshake", "Pacing Jitter", "Auto-Disarm on Reply").
