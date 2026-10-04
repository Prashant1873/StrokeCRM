# Phase 15: Free AI Inbound Reply Sentiment Engine - Research & Technical Specifications

**Researched:** 2026-10-05  
**Target Milestone:** v3.0  

---

## 1. Google Gemini 1.5 Flash Free Tier Integration

### Why Gemini 1.5 Flash?
- **Zero Cost**: Google offers a generous free tier of 15 requests per minute (RPM) and 1,500 requests per day (RPD) with no credit card required.
- **Speed & Latency**: Sub-second roundtrip latency (typically 400ms - 800ms) for short text evaluation.
- **Structured JSON Mode**: Supports native JSON enforcement (`responseMimeType: "application/json"`), eliminating unreliable parsing or markdown code-fence issues.
- **Zero Heavy SDK Dependencies**: Can be invoked directly via Node.js native `fetch` (built-in since Node 18), keeping `package.json` lean without Google Cloud SDK bloat.

### API Contract
```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are an expert sales development representative assistant analyzing an inbound email reply to a cold outreach campaign.
Analyze the recipient's reply and classify it into exactly ONE of the following 5 categories:
- INTERESTED: Lead expressed interest, requested a demo/call, asked for pricing, or invited a conversation.
- QUESTION: Lead is asking for clarification, more information, case studies, or how the product works.
- FOLLOW_UP: Lead is busy, on leave, or asked to be contacted at a later date/quarter.
- NOT_INTERESTED: Lead politely or firmly declined, stated they are not interested, or have no need.
- UNSUBSCRIBE: Lead requested to be removed, opted out, or demanded no further emails.

Return a JSON object with:
{
  "sentiment": "INTERESTED" | "QUESTION" | "FOLLOW_UP" | "NOT_INTERESTED" | "UNSUBSCRIBE",
  "confidence": <float between 0.0 and 1.0>,
  "summary": "<one clear, concise sentence explaining the lead's intent>"
}

Subject: ${subject}
Lead Reply Text:
${sanitizedBody}`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    }),
    signal: AbortSignal.timeout(10000) // 10s safety timeout
  }
);
```

---

## 2. Zero-Dependency Offline Heuristic Engine

### Fallback Guarantee
If no API key is configured in Settings, or if Gemini returns a rate-limit (429), network error, or timeout, the local heuristic classifier runs instantaneously with zero external network requests.

### Heuristic Rule Hierarchy
1. **Unsubscribe Detection**:
   - Matches: `/\b(unsubscribe|remove\s+(me|us|my\s+email)|stop\s+emailing|take\s+me\s+off|opt-?out|leave\s+me\s+alone|cease)\b/i`
   - Classification: `UNSUBSCRIBE` (Confidence: 0.95)
2. **Firm Negative / Not Interested**:
   - Matches: `/\b(not\s+interested|no\s+thanks|pass\s+on\s+this|not\s+a\s+fit|please\s+don't|not\s+looking|wrong\s+person|don't\s+contact)\b/i`
   - Classification: `NOT_INTERESTED` (Confidence: 0.88)
3. **High Intent / Positive**:
   - Matches: `/\b(interested|let's\s+talk|schedule|set\s+up\s+a\s+call|demo|calendar|zoom|meet|send\s+details|send\s+pricing|sounds\s+good|book\s+a\s+time|when\s+are\s+you\s+free)\b/i`
   - Classification: `INTERESTED` (Confidence: 0.85)
4. **Follow Up Later / Postponement**:
   - Matches: `/\b(next\s+(month|quarter|week|year)|reach\s+out\s+(later|in)|touch\s+base\s+(later|in)|busy\s+right\s+now|circle\s+back|ping\s+me\s+in|check\s+back)\b/i`
   - Classification: `FOLLOW_UP` (Confidence: 0.82)
5. **Inquiry / Question**:
   - Matches: `/\?|how\s+much|how\s+does|what\s+is|can\s+you|could\s+you|who\s+is|pricing|cost/i`
   - Classification: `QUESTION` (Confidence: 0.75)
6. **Neutral Fallback**:
   - Classification: `FOLLOW_UP` or `QUESTION` (Confidence: 0.50)

---

## 3. Email Body Quote-Stripping Sanitizer

Cold email replies typically append the entire previous conversation chain (`On Monday, Oct 5 wrote... > Hi Jane, Saw what your team...`). Analyzing this quoted text wastes tokens, confuses sentiment models, and introduces noise.

### Sanitization Pipeline
1. **Strip RFC 2822 Quoted Lines**: Remove all lines starting with `>` or `&gt;`.
2. **Truncate at Quote Header**: Detect delimiters such as:
   - `On <date>, <sender> wrote:`
   - `-----Original Message-----`
   - `From: <sender>`
   - `________________________________`
3. **Normalize Whitespace**: Collapse multiple empty lines and trim.
4. **Cap Length**: Slice to first 1,500 characters max for prompt injection safety and token hygiene.

---

## 4. SQLite Schema Additions

```sql
-- Settings table (key-value)
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('gemini_api_key', '', datetime('now'));

-- Add columns to database_records (isolated spreadsheet leads)
ALTER TABLE database_records ADD COLUMN sentiment TEXT; -- 'INTERESTED', 'QUESTION', 'FOLLOW_UP', 'NOT_INTERESTED', 'UNSUBSCRIBE'
ALTER TABLE database_records ADD COLUMN sentiment_confidence REAL;
ALTER TABLE database_records ADD COLUMN sentiment_summary TEXT;
ALTER TABLE database_records ADD COLUMN sentiment_provider TEXT; -- 'gemini_1.5_flash', 'heuristic', 'manual'

-- Add columns to contacts (legacy table)
ALTER TABLE contacts ADD COLUMN sentiment TEXT;
ALTER TABLE contacts ADD COLUMN sentiment_confidence REAL;
ALTER TABLE contacts ADD COLUMN sentiment_summary TEXT;
ALTER TABLE contacts ADD COLUMN sentiment_provider TEXT;

-- Add columns to reply_logs (audit history of incoming emails)
ALTER TABLE reply_logs ADD COLUMN sentiment TEXT;
ALTER TABLE reply_logs ADD COLUMN sentiment_confidence REAL;
ALTER TABLE reply_logs ADD COLUMN sentiment_summary TEXT;
ALTER TABLE reply_logs ADD COLUMN sentiment_provider TEXT;
```

---

## 5. Frontend Visual Hierarchy & Tokens

Adhering to `frontend-skill` and WCAG AA contrast standards:
- **`INTERESTED`**: Emerald badge (`bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`)
- **`QUESTION`**: Blue badge (`bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`)
- **`FOLLOW_UP`**: Amber badge (`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`)
- **`NOT_INTERESTED`**: Slate badge (`bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20`)
- **`UNSUBSCRIBE`**: Rose badge (`bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`)

Interactive Popover / Select for Manual Override:
- Clicking the badge opens a sleek dropdown with instant optimistic update and sync to the server.
