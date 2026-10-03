# Pitfalls Research

**Domain:** Cold Email Outreach, Custom Domain Mail & Drip Sequences  
**Researched:** 2026-10-03  
**Confidence:** HIGH  

## Critical Pitfalls

### Pitfall 1: Port and SSL/TLS Mismatches on Custom SMTP
**What goes wrong:** Connection hangs or throws `ECONNRESET` / `ESOCKETTIMEDOUT` when user enters custom SMTP details.  
**Why it happens:** Port 465 requires `secure: true` (direct TLS). Port 587 requires `secure: false` with opportunistic STARTTLS upgrade. Many users choose port 587 with SSL enabled or vice versa.  
**How to avoid:**
1. Auto-detect `secure` setting based on port: if port === 465, set `secure: true`; if port === 587 or 25, set `secure: false`.
2. Provide explicit toggle with helper labels: `"Port 465 (SSL/TLS)"` vs `"Port 587 (STARTTLS)"`.
3. Provide an instant "Test SMTP Connection" button in Settings that runs `transporter.verify()` and returns clear human-readable error messages.

### Pitfall 2: False Positive Reply Halting (Auto-Responders & Out-of-Office)
**What goes wrong:** An automated "Out of office until next Monday" or "Thanks for your email, we received your ticket" auto-responder falsely marks the lead as `REPLIED` and permanently cancels the drip sequence.  
**Why it happens:** Simple `From:` address matching treats auto-replies identically to real human responses.  
**How to avoid:**
1. Check standard auto-reply headers:
   - `Auto-Submitted: auto-replied` / `auto-generated`
   - `X-Autoreply: yes`
   - `Precedence: bulk` / `auto_reply`
2. Inspect subject lines for `Automatic reply:`, `Out of Office:`, `Undeliverable:`.
3. If auto-reply detected: mark contact status as `OUT_OF_OFFICE` (or log it) rather than halting the sales sequence, or delay Step 2 by an additional 5 days.

### Pitfall 3: Race Condition Between Step Dispatch and Reply Detection
**What goes wrong:** A lead replies 2 minutes before Step 2 is scheduled to fire; because IMAP hasn't polled yet, Step 2 is dispatched to the lead anyway.  
**Why it happens:** IMAP polling on an interval (e.g. every 10 minutes) leaves a blind spot.  
**How to avoid:**
1. Run a lightweight targeted IMAP check immediately before dispatching any batch of Step 2/Step 3 follow-ups, or allow on-demand "Check for replies now" button.
2. In the queue worker, check if `status === 'CANCELLED_REPLIED'` right before sending each individual email.

### Pitfall 4: Message Threading Breakage in Follow-ups
**What goes wrong:** Follow-up email appears as a totally separate, disconnected conversation in the recipient's inbox instead of nesting neatly in the original thread.  
**Why it happens:** The dispatcher didn't store the RFC `Message-ID` of Step 1, or failed to populate the `In-Reply-To` and `References` headers on Step 2.  
**How to avoid:**
1. Capture `info.messageId` from `transporter.sendMail()` on Step 1 and store it in SQLite `campaign_queue.message_id`.
2. When dispatching Step 2, pass `inReplyTo: step1.message_id` and `references: [step1.message_id]`.
3. Prefix subject with `Re: [Original Subject]` unless original subject already starts with `Re:`.

---
*Pitfalls research for: StrokeCRM v2.0 Custom Domains & Automated Drips*  
*Researched: 2026-10-03*
