# Stack Research: UI Overhaul, Light Mode & Free AI Reply Intelligence

**Milestone:** v3.0  
**Domain:** Local Cold Email Outreach & Privacy-First CRM  
**Date:** 2026-10-05  

---

## 1. UI Theming & Styling Stack

### Recommended Stack Additions
- **CSS Variable Semantic Tokens (`client/src/index.css`)**:
  - Implement a two-tier CSS variable system (`:root` / `[data-theme="dark"]` and `[data-theme="light"]`).
  - Core tokens:
    - Backgrounds: `--bg-canvas` (main app background), `--bg-surface` (cards, panels), `--bg-elevated` (modals, dropdowns), `--bg-subtle` (hover states, badges).
    - Borders: `--border-subtle`, `--border-default`, `--border-focus`.
    - Typography: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`.
    - Accents: `--accent-primary` (indigo/violet), `--accent-primary-hover`, `--accent-ring`.
    - Semantic States: `--color-success` (green), `--color-warning` (amber), `--color-danger` (rose), `--color-info` (cyan/blue).
- **Tailwind CSS Integration**:
  - Configure Tailwind in `tailwind.config.js` to map semantic utility classes (`bg-canvas`, `bg-surface`, `text-primary`, etc.) to the CSS variables.
  - Allows seamless usage: `className="bg-surface text-primary border border-subtle"` that instantly adapts when theme switches.
- **Lucide React Icons (Existing)**:
  - Continue leveraging `lucide-react` for theme toggle (`Sun`, `Moon`), sentiment badges (`CheckCircle2`, `HelpCircle`, `Clock`, `XCircle`, `Ban`), and status indicators.
- **What NOT to Add**:
  - **Do NOT add bulky UI frameworks (e.g., MUI, Chakra, Mantine)**: They bring heavy runtime overhead, style collision with custom components, and bloated bundle size.
  - **Do NOT use Tailwind's raw `dark:` variants everywhere**: Hardcoding `dark:bg-zinc-900 bg-white` across 40+ components creates maintainability nightmares. Semantic CSS variables solve both themes cleanly in one declaration.

---

## 2. Free AI Sentiment Analysis Stack

### Recommended AI Stack
- **Native Node `fetch` + Google Gemini 1.5 Flash Free Tier**:
  - **Zero External Dependencies**: Google Gemini 1.5 Flash REST API can be invoked directly using Node 18+'s native global `fetch`. No need to install heavy client SDKs (`@google/genai` or `@langchain/core`).
  - **Free Tier Specifications**:
    - Rate limits: 15 Requests Per Minute (RPM), 1,000,000 Tokens Per Minute (TPM), 1,500 Requests Per Day (RPD).
    - Cost: **100% Free** (No credit card required for standard free API key at Google AI Studio).
    - Latency: Fast response (< 500ms) with lightweight JSON response mode (`response_mime_type: "application/json"`).
  - **Structured Classification Prompt**:
    - Enforce strict JSON output with schema:
      ```json
      {
        "sentiment": "INTERESTED | QUESTION | FOLLOW_UP | NOT_INTERESTED | UNSUBSCRIBE",
        "confidence": 0.95,
        "summary": "Recipient is interested and asked for a 15-minute demo on Thursday."
      }
      ```
- **Local Rule-Based Heuristic Fallback Engine**:
  - Built-in zero-dependency regex and keyword classifier (`server/services/sentimentHeuristics.js`).
  - Evaluates subject and body for high-confidence markers:
    - *Unsubscribe*: "unsubscribe", "remove me", "stop emailing", "take off your list".
    - *Interested*: "calendly.com", "schedule", "book a time", "let's talk", "call me", "send over details", "pricing".
    - *Follow Up*: "next month", "next quarter", "reconnect in", "circle back", "busy right now".
    - *Not Interested*: "not interested", "no thanks", "not a fit", "we use an in-house".
  - Runs automatically when no Gemini API key is configured, or as a seamless failover if network/quota is exceeded.

---

## 3. Database Persistence Stack

- **SQLite Schema Evolution (`server/database.js`)**:
  - Non-destructive `ALTER TABLE` migrations:
    - `database_records`: Add `reply_sentiment TEXT`, `reply_confidence REAL`, `reply_summary TEXT`, `reply_analyzed_at TEXT`.
    - `settings`: Add `gemini_api_key TEXT`, `sentiment_auto_analyze INTEGER DEFAULT 1`, `sentiment_model TEXT DEFAULT 'gemini-1.5-flash'`.
  - Maintains existing `better-sqlite3` synchronous performance and ACID safety.

---

## 4. Stack Evaluation Summary

| Subsystem | Selected Tool / Pattern | Alternative Considered | Rationale |
|-----------|-------------------------|------------------------|-----------|
| Theming | CSS Variables + `data-theme` | Tailwind `dark:` utility sprawl | Centralized design tokens prevent missed styles and simplify dual-mode maintenance. |
| AI Inference | Gemini 1.5 Flash REST via Node `fetch` | Ollama / Local LLM | Free, requires zero GPU/RAM overhead on user's machine, fast, and structured JSON output. |
| AI Fallback | Rule-based Heuristic Regex | HuggingFace Inference API | Zero dependencies, instant execution, zero network failure risk. |
| Persistence | SQLite via `better-sqlite3` | File-based JSON | Atomic transactions, query indexing, and schema consistency with existing CRM state. |
