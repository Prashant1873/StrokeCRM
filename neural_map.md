# Neural Map of Logic & Architecture (StrokeCRM)

This document visualizes and maps the logical subsystems, state flows, and data relationships of StrokeCRM.

```mermaid
flowchart TD
    subgraph UI ["Frontend / User Control Center (Hierarchical & Traceable)"]
        Router["App Router & History Stack (Hash/URL Indexed)"]
        Breadcrumbs["Breadcrumb Tracker & Back-Trace Engine"]
        Dashboard["Analytics & Daily Cap Monitor"]
        DatabaseHub["Databases Hub: Isolated File Uploads, Schemas & Inspection"]
        TemplatesLibrary["Templates Library: Saved Collection & Management (#/templates)"]
        TemplateStudio["Templates Studio: Composer, Variable Ingestion & Spam Radar (#/templates/:id)"]
        CampaignsHub["Campaigns Directory: Card-List Overview & Management (#/campaigns)"]
        CampaignCockpit["Campaign Cockpit: Live Pacing Radar, 1:1 Triad & Queue (#/campaigns/:id)"]
        PreflightControls["Preflight Gates (Working Hours Toggle, Jitter, Test Mail)"]
        ABTesting["A/B Testing Studio"]
        Settings["Gmail Auth & Throttle Settings"]

        Router --> Breadcrumbs
        Router --> Dashboard
        Router --> DatabaseHub
        Router --> TemplatesLibrary
        TemplatesLibrary --> TemplateStudio
        Router --> CampaignsHub
        CampaignsHub --> CampaignCockpit
        CampaignCockpit --> PreflightControls
        Router --> ABTesting
        Router --> Settings
    end

    subgraph Core ["Application Core & Dispatch Engine (Strict 1:1 Triad)"]
        DiskStore["File Vault: data/databases/ (Verbatim File Preservation)"]
        DbEngine["SQLite Isolated Datasets & Column Schemas"]
        TemplateStore["Reusable Template Registry"]
        TriadBinder["Campaign Triad Binder: [1 DB + 1 Template + Config]"]
        Merger["Handlebars / Liquid Dynamic Interpolator"]
        Queue["Campaign-Scoped Dispatch Queue (Strict Isolated Rows)"]
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

    DatabaseHub -->|Upload raw sheet| DiskStore
    DiskStore -->|Extracted schemas & rows| DbEngine
    TemplateEditor -->|Create / Edit| TemplateStore
    CampaignMgr -->|Bind [1 DB + 1 Template]| TriadBinder
    DbEngine --> TriadBinder
    TemplateStore --> TriadBinder
    TriadBinder -->|Scoped campaign records| Queue
    Queue --> Merger
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
- **Row Picker**: `database_records.included` (default 1). Campaign Preview checkboxes call `setIncludedRecords`. The queue and contact counts only use `included = 1`. Attaching a database resets every row to included.
- **Rich Body & Attachments**: Template body is HTML from a contentEditable editor (legacy plain text auto-converted). Dispatch sends `html` + `htmlToText` plain copy. Template `attachments` (JSON metadata, files in `data/attachments/`) are read live via `campaign.template_id` at send time.

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
