# Project Research Summary

**Project:** StrokeCRM (Free, Self-Hosted Cold Outreach Platform)  
**Domain:** Local Cold Email Outreach & Privacy-First CRM  
**Researched:** 2026-10-05  
**Confidence:** HIGH  

---

## Executive Summary

Milestone v3.0 expands StrokeCRM into an aesthetically elevated, dual-theme workspace featuring professional B2B outreach copywriting, curated starter sequences, and automated free AI inbound reply sentiment intelligence. 

Following our core ethos of **100% free, private, self-hosted operation with zero monthly fees**, the architecture leverages:
1. **CSS Variable Design Tokens** for instant, flash-free Dark and Light mode toggling that preserves tactile feel and WCAG AA contrast.
2. **Standardized B2B Outreach Copywriting** paired with a built-in gallery of proven cold email starter presets.
3. **Zero-Cost AI Classification** using Google's Gemini 1.5 Flash free tier (1,500 requests/day free forever) via native Node `fetch`, reinforced by an immediate local regex/keyword heuristic fallback that runs offline or without an API key.

All sentiment data is persisted directly in SQLite, and all AI keys remain strictly local to the user's machine.

---

## Key Findings

### Recommended Stack
- **Theming**: CSS custom properties (`:root`, `[data-theme="dark"]`, `[data-theme="light"]`) bridged to Tailwind utility classes. Avoids heavy runtime CSS-in-JS libraries and prevents unstyled theme flashing.
- **Inference**: Native Node `fetch` accessing Google Gemini 1.5 Flash REST endpoint. Zero npm bloat, zero cost, fast JSON response mode.
- **Failover**: Local rule-based keyword/regex classifier for zero-network dependency and instant execution.
- **Persistence**: SQLite non-destructive schema migrations (`reply_sentiment`, `reply_confidence`, `reply_summary` on `database_records`; `gemini_api_key` on `settings`).

### Expected Features
- **Must Have (Table Stakes)**:
  - Global Dark / Light theme toggle with `localStorage` persistence and system preference detection.
  - Complete UI overhaul of cards, tables, modals, and breadcrumbs following `frontend-skill` standards.
  - Systematic text cleanup and professional copywriting across all views, alerts, and tooltips.
  - Curated cold outreach starter presets (Problem Pitch, Case Study Teaser, 3-Day Bump, Breakup Email).
  - Automated inbound reply sentiment classification (`Interested`, `Question`, `Follow Up`, `Not Interested`, `Unsubscribe`).
  - Sentiment badges, confidence scores, and quick-filter tabs in the Campaign Cockpit and Database Inspector.
  - Settings panel for Gemini free API key with connection verification.
- **Should Have (Competitive)**:
  - Local heuristic classifier fallback when API key is not present.
  - 1-click manual sentiment override in the cockpit inspector.

### Architecture Approach
- **Theme Engine**: `ThemeContext` provides `theme` state and synchronizes `data-theme` on `document.documentElement` while an inline `<script>` in `index.html` prevents theme flashing.
- **Sentiment Integration**: Asynchronous hook in `replyScannerService.js` triggers after lead sequence disarming, sanitizes reply text (strips quoted email history), queries Gemini/heuristic, and updates SQLite.
- **Cockpit Filters**: Campaign Cockpit incorporates sentiment filter chips to isolate hot positive leads from unsubscribes instantly.

### Critical Pitfalls
1. **Invisible Text in Light Mode**: Avoid hardcoded Tailwind color utilities; rely strictly on semantic variables (`text-primary`, `bg-surface`).
2. **AI Throttling Blocking IMAP Scanner**: Always execute sequence disarming first atomically, then wrap sentiment analysis in a non-blocking timeout with automatic heuristic fallback.
3. **Quoted Thread Noise**: Sanitize inbound email bodies by removing historical quoted threads before evaluation to prevent classifying the sender's own pitch.

---

## Implications for Roadmap

The research directly informs a clean 3-phase execution roadmap:

### Phase 13: Dual-Theme Architecture & Design Token Engine
- **Rationale**: Theming foundation must be laid first so subsequent component modernization and copywriting can be built directly on unified tokens.
- **Delivers**: CSS variables design token palette in `client/src/index.css`, `ThemeContext` provider, tactile Sun/Moon header toggle, FOUT-free inline loader, and WCAG AA contrast validation.
- **Avoids**: Incomplete styling, flash of unstyled theme on page load.

### Phase 14: System-Wide UI Modernization & Professional UX Copywriting
- **Rationale**: Elevate component aesthetics and replace raw developer strings with authoritative B2B SaaS terminology across all views, and provide vetted starter templates.
- **Delivers**: Overhauled card layouts, sleek tables, fluid transitions, polished tooltips, standardized action verbs, and the Curated Cold Outreach Starter Presets gallery.
- **Avoids**: Tone inconsistency, generic jargon, clutter.

### Phase 15: Free AI Inbound Reply Sentiment Engine & Cockpit Intelligence
- **Rationale**: Builds directly on top of Phase 12's IMAP reply scanner and Phase 14's updated cockpit UI.
- **Delivers**: Free Gemini 1.5 Flash REST client, local rule-based heuristic fallback, automatic classification on detected replies, SQLite sentiment persistence, visual cockpit badges, quick-filters, and manual operator overrides.
- **Avoids**: Throttling delays, quoted thread confusion, lack of human-in-the-loop controls.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Native Node `fetch` and CSS variables require zero external package risks. |
| Features | HIGH | Directly maps to user request and validated cold outreach workflows. |
| Architecture | HIGH | Non-destructive SQLite migration and decoupled async sentiment analysis protect existing queues. |
| Pitfalls | HIGH | Clear mitigation strategies for theming contrasts, rate limits, and email thread stripping. |

**Overall confidence:** HIGH

---

## Sources

### Primary (HIGH confidence)
- Google AI Studio Gemini API Documentation (Free tier limits, REST endpoint specifications, JSON mode).
- WCAG 2.2 AA Contrast Guidelines & W3C Design Token specifications.
- StrokeCRM Phase 12 IMAP Reply Scanner implementation (`server/services/replyScannerService.js`).

---
*Research completed: 2026-10-05*  
*Ready for roadmap: yes*  
