# Neural Map of Logic & Architecture (StrokeCRM)

This document visualizes and maps the logical subsystems, state flows, and data relationships of StrokeCRM.

```mermaid
flowchart TD
    subgraph UI ["Frontend / User Control Center (Hierarchical & Traceable)"]
        Router["App Router & History Stack (Hash/URL Indexed)"]
        Breadcrumbs["Breadcrumb Tracker & Back-Trace Engine"]
        Dashboard["Analytics & Daily Cap Monitor"]
        CampaignMgr["Campaign Cockpit & Step Wizard"]
        PreflightControls["Preflight Gates (Working Hours Toggle, Jitter, Test Mail)"]
        ABTesting["A/B Testing Studio"]
        ContactManager["Leads Wizard: Upload -> Map -> Validate"]
        TemplateEditor["Template Engine & Spam Preflight"]
        Settings["Gmail Auth & Throttle Settings"]

        Router --> Breadcrumbs
        Router --> Dashboard
        Router --> CampaignMgr
        Router --> ContactManager
        Router --> TemplateEditor
        Router --> ABTesting
        Router --> Settings
        CampaignMgr --> PreflightControls
    end

    subgraph Core ["Application Core & Dispatch Engine"]
        Parser["Excel / CSV Parser & Sanitizer"]
        Merger["Handlebars / Liquid Variable Interpolator"]
        Queue["Persistent Dispatch Queue & State Tracker (SQLite)"]
        Scheduler["Adaptive Pacing & Randomized Jitter Engine"]
        ABEngine["Cohort Splitter & Stats Aggregator"]
    end

    subgraph GmailGateway ["Gmail Gateway & Transport Layer"]
        AuthManager["OAuth2 Refresh Token / App Password Manager"]
        QuotaMonitor["Daily Limit Guard (500 free / 2000 Workspace)"]
        Dispatcher["Gmail REST API / Nodemailer SMTP Sender"]
        SentTracker["Thread & Message-ID Registry"]
        ReplyDetector["Gmail Thread Reply Poller (Watch/History API)"]
    end

    ContactManager -->|Upload raw records| Parser
    Parser -->|Row schemas| Queue
    TemplateEditor -->|Subject & Body variants| Merger
    PreflightControls -->|Start campaign (bypassHours & options)| Queue
    ABTesting -->|Define Variant A / B| ABEngine
    ABEngine -->|Assign variant to rows| Queue

    Queue -->|Next eligible dispatch| Scheduler
    Scheduler -->|Throttle & randomize interval| QuotaMonitor
    QuotaMonitor -->|Within daily quota| Dispatcher
    AuthManager -->|Valid access token / credentials| Dispatcher
    Dispatcher -->|Send message| GmailGateway
    Dispatcher -->|Confirm send| SentTracker
    SentTracker -->|Update state: SENT / FAILED| Queue
    ReplyDetector -->|Detected inbound reply| Queue
    Queue -->|Push real-time progress| Dashboard
    SentTracker -->|Increment daily metrics| Dashboard
```

---

## Logical Subsystems Breakdown

### 1. Ingestion & Dynamic Mapping Layer
- **Input**: `.xlsx`, `.xls`, `.csv` uploads with arbitrary column names.
- **Normalization**: Column detection (e.g. Email, First Name, Company).
- **Template Interpolation**: Replaces `{{variable}}` with row values; supports fallback defaults (e.g. `{{FirstName | "there"}}`).

### 2. Campaign & Dispatch Queue Engine
- **State Machine**: Contacts transition through `UNPROCESSED` -> `QUEUED` -> `SENDING` -> `SENT` -> `FAILED` / `REPLIED` / `UNSUBSCRIBED`.
- **Fault-Tolerant Persistence**: Backed by SQLite so system halts, reboots, or pauses never result in duplicate sends.
- **Warmup & Pacing Logic**:
  - Time window: e.g. 9:00 AM - 6:00 PM in recipient's or sender's timezone.
  - Delay: e.g. Random delay between 45s to 180s between each send.
  - Daily limit throttle: e.g. Max 100 emails/day during warmup.

### 3. Gmail Transport & Protocol Layer
- **Mode A (Gmail REST API via OAuth2)**: Direct Google API integration, thread management, official labels, native draft creation.
- **Mode B (SMTP with Google App Passwords)**: Direct connection to `smtp.gmail.com:465/587` with zero Google Cloud console setup.
- **Quota Guard**: Enforces strict Google hard limits (500/day personal, 2,000/day Workspace).

### 4. A/B Testing & Optimization Engine
- **Variant Splitting**: Random or alternating assignment of recipient rows to Variant A vs Variant B (subject line, body, CTA).
- **Metric Tracking**: Sent count, Open rate (via tracking pixel), Reply rate (via thread monitoring).
- **Statistical Significance**: Calculates conversion delta between variants.

### 5. Day-Wise Analytics & Observability
- Sent emails per day timeline graph.
- Delivery status distribution.
- Hourly send velocity heatmaps.
