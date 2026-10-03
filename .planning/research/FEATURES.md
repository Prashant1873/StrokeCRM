# Feature Research

**Domain:** Cold Email Outreach, Custom Domain Mail & Drip Sequences  
**Researched:** 2026-10-03  
**Confidence:** HIGH  

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Universal Custom SMTP/IMAP Setup | Users with business domains (e.g. `user@company.com`, Zoho, Fastmail, Namecheap, Outlook 365, cPanel) must be able to send via their host/port. | MEDIUM | Support port 587 (STARTTLS), 465 (SSL), 25; custom host, user, password; "Test Connection" button with diagnostic report. |
| Multi-Step Drip Sequence Builder | Cold outreach rarely converts on touch 1; users need Step 1, Step 2 (+N days), Step 3 (+M days). | MEDIUM | Clean step cards in Campaign Cockpit, custom delay input in days/hours, thread continuation vs new subject line toggle. |
| Inbound IMAP Reply Detection | If a lead replies to Step 1, sending them Step 2 ("Hey just bumping this...") looks unprofessional and ruins relationships. | HIGH | Background periodic IMAP poll (or on-demand scan) checking Inbox for replies matching lead email or `In-Reply-To` headers. |
| Automatic Sequence Disarm on Reply | When reply detected, lead's sequence state must transition to `REPLIED` and cancel all remaining steps. | LOW | Atomic SQLite update query marking pending sequence steps as `CANCELLED_REPLIED`. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Email Threading Mode | Keeps follow-ups inside the exact same email conversation thread by setting `In-Reply-To` and `References` headers to original message ID. | MEDIUM | Makes follow-ups look organic, identical to manual Gmail replies. |
| Step-by-Step Funnel Analytics | Shows drop-offs and response rates per sequence step (e.g. Step 1: 4% reply, Step 2: 7% reply). | LOW | Visual scorecard in Campaign view showing Step 1, Step 2, Step 3 performance. |
| One-Click "Simulate Reply / Mark Replied" | Allows manual reply marking for leads who reply via phone, LinkedIn, or forward. | LOW | Provides immediate escape hatch if lead replied through alternative channel. |

### Anti-Features (Avoid)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-Account Inbox Rotation | Users want to blast 5,000 emails/day across 10 burner domains. | Encourages spammer behavior, burns domains, complex DKIM/SPF management, high defect surface. | Focus on clean single custom domain or Gmail sending with proper throttle pacing and high deliverability. |
| AI Icebreaker Generation | Users think AI can write personalized lines for each row. | Hallucinates awkward lines, high token cost, requires external API keys, slows down dispatch. | High-quality handlebars variable mapping (`{{Company}}`, `{{Role}}`, `{{RecentPost}}`) from carefully curated spreadsheets. |

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Custom Domain SMTP Settings & Test | HIGH | LOW | P1 |
| Multi-Step Drip Sequence Scheduling | HIGH | MEDIUM | P1 |
| Inbound IMAP Reply Scanner & Auto-Halt | HIGH | MEDIUM | P1 |
| Email Threading (`In-Reply-To` preservation) | HIGH | LOW | P1 |
| Step-by-Step Visual Funnel Metrics | MEDIUM | LOW | P2 |
| Manual "Mark Replied" override button | MEDIUM | LOW | P2 |

---
*Feature research for: StrokeCRM v2.0 Custom Domains & Automated Drips*  
*Researched: 2026-10-03*
