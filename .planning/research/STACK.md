# Stack Research

**Domain:** Cold Email Outreach, Custom Domain SMTP/IMAP & Drip Automation  
**Researched:** 2026-10-03  
**Confidence:** HIGH  

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `nodemailer` | ^10.0.13 | Outbound SMTP dispatch | Already installed; natively supports arbitrary custom SMTP relays (port 587 STARTTLS, 465 SSL, custom host, auth credentials) without third-party lock-in. |
| `imapflow` | ^1.0.160 | Inbound IMAP reply monitoring | Modern, actively maintained (by Nodemailer author), pure async/await Promise API, built-in connection recovery and TLS support. Far superior to legacy `node-imap`. |
| `mailparser` | ^3.7.1 | MIME & RFC-822 email parsing | De-facto standard for extracting `In-Reply-To`, `References`, subject headers, and plain-text body from raw IMAP email messages. |
| `better-sqlite3` | ^13.0.3 | Sequence & queue persistence | Already installed; handles atomic transaction updates for drip steps, reply status mutations, and prevents duplicate sends. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | ^4.1.0 | Date & cadence interval calculation | Computing sequence delays (e.g. "+3 business days", "+5 days at 09:00 AM local time") cleanly. |

## Installation

```bash
# Inbound IMAP monitoring & parsing
npm install imapflow mailparser date-fns
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `imapflow` | `node-imap` | Legacy codebase only. `node-imap` has had no major updates for years, relies heavily on complex event emitters, and suffers from connection deadlock bugs. |
| `imapflow` | `imap-simple` | `imap-simple` is merely a thin wrapper around `node-imap`. Inherits all underlying deadlocks. |
| Custom cron / timer loop | `bullmq` / `agenda` | `bullmq` requires Redis. In a local single-user self-hosted CRM, SQLite indexed timestamps + lightweight in-memory interval worker is 100x simpler with zero external daemons. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| External Redis / Celery | Over-engineering for a local desktop CRM tool; requires user to install and run Docker/Redis services. | SQLite-backed task scheduler with `scheduled_at` timestamp indexing. |
| Scraping webmail interfaces | Fragile, violates TOS, breaks constantly when webmail DOM changes. | Standard RFC-compliant SMTP and IMAP protocols. |

---
*Stack research for: StrokeCRM v2.0 Custom Domains & Automated Drips*  
*Researched: 2026-10-03*
