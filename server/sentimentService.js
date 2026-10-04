const db = require('./db');

/**
 * Supported sentiment classification categories
 */
const SENTIMENT_CATEGORIES = {
  INTERESTED: 'INTERESTED',
  QUESTION: 'QUESTION',
  FOLLOW_UP: 'FOLLOW_UP',
  NOT_INTERESTED: 'NOT_INTERESTED',
  UNSUBSCRIBE: 'UNSUBSCRIBE'
};

/**
 * Strips email history quotes, reply headers, and excessive whitespace
 *
 * @param {string} rawText
 * @returns {string} Sanitized clean reply body
 */
function sanitizeEmailBody(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Remove HTML tags if raw HTML was supplied
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');

  // 2. Decode basic HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // 3. Split by lines to strip quote headers and '>' lines
  const lines = text.split(/\r?\n/);
  const cleanLines = [];

  const quoteHeaderRegex = /^(on\s.+wrote:|from:\s.+|sent:\s.+|-----original\smessage-----|________________________________)/i;

  for (let line of lines) {
    const trimmed = line.trim();
    // Stop processing if standard reply/forward boundary is hit
    if (quoteHeaderRegex.test(trimmed)) {
      break;
    }
    // Skip quoted lines starting with '>' or '|'
    if (trimmed.startsWith('>') || trimmed.startsWith('|')) {
      continue;
    }
    cleanLines.push(line);
  }

  text = cleanLines.join('\n');

  // 4. Collapse excessive blank lines & trim
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // 5. Cap length at 1,500 characters for token hygiene
  if (text.length > 1500) {
    text = text.slice(0, 1500) + '...';
  }

  return text;
}

/**
 * Offline, zero-dependency heuristic classifier
 *
 * @param {string} cleanText
 * @param {string} [subject='']
 * @returns {Object} { sentiment, confidence, summary, provider: 'heuristic' }
 */
function classifyWithHeuristics(cleanText, subject = '') {
  const combined = `${subject} ${cleanText}`.toLowerCase();

  // 1. Unsubscribe requests (highest priority)
  if (/\b(unsubscribe|remove\s+(me|us|my\s+email)|stop\s+emailing|take\s+me\s+off|opt-?out|leave\s+me\s+alone|cease|delete\s+my\s+(data|info))\b/i.test(combined)) {
    return {
      sentiment: SENTIMENT_CATEGORIES.UNSUBSCRIBE,
      confidence: 0.95,
      summary: 'Recipient requested to be unsubscribed or removed from outreach.',
      provider: 'heuristic'
    };
  }

  // 2. Firm negative / not interested
  if (/\b(not\s+interested|no\s+thanks|pass\s+on\s+this|not\s+a\s+fit|please\s+don't|not\s+looking|wrong\s+person|don't\s+contact|no\s+need|do\s+not\s+need)\b/i.test(combined)) {
    return {
      sentiment: SENTIMENT_CATEGORIES.NOT_INTERESTED,
      confidence: 0.88,
      summary: 'Recipient declined the outreach proposal or stated lack of interest.',
      provider: 'heuristic'
    };
  }

  // 3. High intent / positive interest
  if (/\b(interested|let's\s+talk|schedule|set\s+up\s+a\s+call|demo|calendar|zoom|meet|send\s+details|send\s+pricing|sounds\s+good|book\s+a\s+time|when\s+are\s+you\s+free|count\s+me\s+in|open\s+to\s+chat)\b/i.test(combined)) {
    return {
      sentiment: SENTIMENT_CATEGORIES.INTERESTED,
      confidence: 0.85,
      summary: 'Recipient expressed clear interest and invited further discussion or meeting.',
      provider: 'heuristic'
    };
  }

  // 4. Follow up later / postponement
  if (/\b(next\s+(month|quarter|week|year)|reach\s+out\s+(later|in)|touch\s+base\s+(later|in)|busy\s+right\s+now|circle\s+back|ping\s+me\s+in|check\s+back|out\s+of\s+office|currently\s+traveling)\b/i.test(combined)) {
    return {
      sentiment: SENTIMENT_CATEGORIES.FOLLOW_UP,
      confidence: 0.82,
      summary: 'Recipient is currently busy or requested to be contacted at a future date.',
      provider: 'heuristic'
    };
  }

  // 5. Inquiries / questions
  if (/\?|\b(how\s+(much|does|can)|what\s+is|can\s+you|could\s+you|who\s+is|pricing|cost|more\s+information|details)\b/i.test(combined)) {
    return {
      sentiment: SENTIMENT_CATEGORIES.QUESTION,
      confidence: 0.75,
      summary: 'Recipient asked questions or requested more specific information.',
      provider: 'heuristic'
    };
  }

  // 6. Ambiguous / neutral fallback
  return {
    sentiment: SENTIMENT_CATEGORIES.QUESTION,
    confidence: 0.50,
    summary: 'Lead provided a response requiring operator review.',
    provider: 'heuristic'
  };
}

/**
 * Calls Google Gemini 1.5 Flash REST API with JSON mode
 *
 * @param {string} cleanText
 * @param {string} subject
 * @param {string} apiKey
 * @returns {Promise<Object>} { sentiment, confidence, summary, provider: 'gemini_1.5_flash' }
 */
async function classifyWithGemini(cleanText, subject, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('Gemini API key is required.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  const promptText = `You are an expert sales development representative assistant analyzing an inbound email reply to a cold outreach campaign.
Analyze the recipient's reply and classify it into exactly ONE of the following 5 categories:
- INTERESTED: Lead expressed interest, requested a demo/call, asked for pricing, or invited a conversation.
- QUESTION: Lead is asking for clarification, more information, case studies, or how the product works.
- FOLLOW_UP: Lead is busy, on leave, or asked to be contacted at a later date/quarter.
- NOT_INTERESTED: Lead politely or firmly declined, stated they are not interested, or have no need.
- UNSUBSCRIBE: Lead requested to be removed, opted out, or demanded no further emails.

Return a JSON object matching this schema:
{
  "sentiment": "INTERESTED" | "QUESTION" | "FOLLOW_UP" | "NOT_INTERESTED" | "UNSUBSCRIBE",
  "confidence": <float between 0.0 and 1.0>,
  "summary": "<one clear, concise sentence explaining the lead's intent>"
}

Subject: ${subject || '(No Subject)'}
Lead Reply Text:
${cleanText || '(Empty message body)'}`;

  const requestBody = {
    contents: [{
      parts: [{ text: promptText }]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(10000) // 10s safety timeout
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error('Gemini response returned empty candidate text.');
  }

  const parsed = JSON.parse(rawJson);
  let sentiment = String(parsed.sentiment || '').toUpperCase().trim();
  if (!SENTIMENT_CATEGORIES[sentiment]) {
    // Normalization fallback
    if (sentiment.includes('INTEREST') && !sentiment.includes('NOT')) sentiment = SENTIMENT_CATEGORIES.INTERESTED;
    else if (sentiment.includes('UNSUB')) sentiment = SENTIMENT_CATEGORIES.UNSUBSCRIBE;
    else if (sentiment.includes('NOT') || sentiment.includes('DECLINE')) sentiment = SENTIMENT_CATEGORIES.NOT_INTERESTED;
    else if (sentiment.includes('FOLLOW') || sentiment.includes('LATER')) sentiment = SENTIMENT_CATEGORIES.FOLLOW_UP;
    else sentiment = SENTIMENT_CATEGORIES.QUESTION;
  }

  const confidence = typeof parsed.confidence === 'number' 
    ? Math.max(0.1, Math.min(1.0, parsed.confidence))
    : 0.85;

  const summary = (parsed.summary && typeof parsed.summary === 'string')
    ? parsed.summary.trim()
    : 'Analyzed via Gemini 1.5 Flash.';

  return {
    sentiment,
    confidence: Number(confidence.toFixed(2)),
    summary,
    provider: 'gemini_1.5_flash'
  };
}

/**
 * Master classification function: Tries Gemini 1.5 Flash if key is present,
 * gracefully falling back to offline heuristics on failure or timeout.
 *
 * @param {string} rawBodyText
 * @param {string} [subject='']
 * @param {Object} [options={}]
 * @param {string} [options.apiKey]
 * @returns {Promise<Object>} Classification result
 */
async function classifyReply(rawBodyText, subject = '', options = {}) {
  const cleanText = sanitizeEmailBody(rawBodyText);

  let apiKey = options.apiKey;
  if (!apiKey) {
    try {
      const settings = db.getSettings ? db.getSettings() : {};
      apiKey = settings.gemini_api_key;
    } catch {
      // ignore db error
    }
  }

  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    try {
      const geminiResult = await classifyWithGemini(cleanText, subject, apiKey);
      return {
        ...geminiResult,
        sanitizedSnippet: cleanText.slice(0, 300)
      };
    } catch (geminiErr) {
      console.warn(`[Sentiment] Gemini classification failed (${geminiErr.message}). Engaging heuristic fallback.`);
    }
  }

  // Fallback to local heuristic classifier
  const heuristicResult = classifyWithHeuristics(cleanText, subject);
  return {
    ...heuristicResult,
    sanitizedSnippet: cleanText.slice(0, 300)
  };
}

/**
 * Tests the Gemini API Key with a lightweight handshake prompt
 *
 * @param {string} apiKey
 * @returns {Promise<Object>} { success, model, latencyMs, message }
 */
async function verifyGeminiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return {
      success: false,
      message: 'API Key cannot be empty.'
    };
  }

  const startTime = Date.now();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Return JSON: {"handshake": true, "message": "ready"}' }]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      }),
      signal: AbortSignal.timeout(8000)
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errMsg = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error && parsed.error.message) errMsg = parsed.error.message;
      } catch {
        errMsg = errorText.slice(0, 150);
      }
      return {
        success: false,
        latencyMs,
        message: `Gemini verification failed: ${errMsg}`
      };
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return {
        success: false,
        latencyMs,
        message: 'Gemini responded with empty content.'
      };
    }

    return {
      success: true,
      model: 'gemini-1.5-flash',
      latencyMs,
      message: `Handshake verified successfully in ${latencyMs}ms. Gemini 1.5 Flash is ready for sentiment analysis.`
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: `Connection error: ${err.message}`
    };
  }
}

module.exports = {
  SENTIMENT_CATEGORIES,
  sanitizeEmailBody,
  classifyWithHeuristics,
  classifyWithGemini,
  classifyReply,
  verifyGeminiKey
};
