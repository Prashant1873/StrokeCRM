# Neural Map of Logic & Architecture (StrokeCRM)

This document visualizes and maps the logical subsystems, state flows, and data relationships of StrokeCRM.

```mermaid
flowchart TD
    subgraph UI ["Frontend / User Control Center (Hierarchical & Traceable)"]
        Router["App Router & History Stack (Hash/URL Indexed)"]
        Breadcrumbs["Breadcrumb Tracker & Back-Trace Engine"]
        ThemeManager["Theme Engine: Dark / Light Mode & Token System"]
        Dashboard["Analytics & Daily Cap Monitor"]
        DatabaseHub["Databases Hub: Isolated File Uploads, Schemas & Inspection"]
        TemplatesLibrary["Templates Library & Curated Presets Gallery (#/templates)"]
        TemplateStudio["Templates Studio: Composer, Variable Ingestion & Spam Radar (#/templates/:id)"]
        CampaignsHub["Campaigns Directory: Card-List Overview & Management (#/campaigns)"]
        CampaignCockpit["Campaign Cockpit: Pacing Radar, Funnel & Reply Sentiment Badges (#/campaigns/:id)"]
        PreflightControls["Preflight Gates (Working Hours Toggle, Jitter, Test Mail)"]
        ABTesting["A/B Testing Studio"]
        Settings["Credentials, Throttle & Free AI Key Settings"]

        Router --> Breadcrumbs
        Router --> ThemeManager
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

    subgraph SentimentEngine ["Free AI Sentiment Engine (Zero Cost & Offline Resilience)"]
        Sanitizer["Thread Sanitizer: RFC 2822 Quote & Header Stripper"]
        ClassifierSwitch{"Gemini API Key Valid?"}
        GeminiREST["Google Gemini 1.5 Flash (Native Fetch REST, 1500/day Free)"]
        Heuristics["Local Rule Heuristic Fallback (Zero-Dependency Regex)"]
        SentimentDB["SQLite Sentiment Annotations (Confidence, Summary, Provider)"]
        ManualOverride["Operator Manual Override (Provider Precedence Lock)"]
    end

    subgraph GmailGateway ["Gmail & Custom IMAP Gateway"]
        AuthManager["OAuth2 Refresh Token / App Password / Custom SMTP"]
        QuotaMonitor["Daily Limit Guard (500 free / 2000 Workspace / Custom)"]
        Dispatcher["Universal Nodemailer SMTP / REST Dispatcher"]
        SentTracker["Thread & Message-ID Registry"]
        ReplyDetector["Inbound IMAP Reply Scanner (Port 993 SSL)"]
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
    ReplyDetector -->|Atomic sequence disarm| Queue
    ReplyDetector -->|Sanitize inbound body| Sanitizer
    Sanitizer --> ClassifierSwitch
    ClassifierSwitch -->|Yes & Online| GeminiREST
    ClassifierSwitch -->|No / Timeout / 429| Heuristics
    GeminiREST --> SentimentDB
    Heuristics --> SentimentDB
    ManualOverride --> SentimentDB
    SentimentDB --> CampaignCockpit
    SentimentDB --> DatabaseHub
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

### 3. Outbound Transport & Protocol Gateway (Universal Dual Gateway)
- **Mode A (Gmail REST API via OAuth2)**: Direct Google API integration, thread management, official labels, native draft creation.
- **Mode B (SMTP with Google App Passwords)**: Direct connection to `smtp.gmail.com:465/587` with zero Google Cloud console setup.
- **Mode C (Custom Domain SMTP & IMAP Gateway)**: Outbound dispatch via custom domain SMTP (host, port 465 SSL / 587 STARTTLS, auth) and inbound monitoring via IMAP (`imapflow`, port 993 SSL). Supports 1-click presets for Zoho Mail, Fastmail, Microsoft 365, Namecheap PrivateEmail, and self-hosted mail servers.
- **Dynamic Resolver**: `resolveTransporter(campaignSenderOverride)` routes each email dynamically to the active global default or campaign-specific sender override.
- **Quota Guard**: Enforces strict Google hard limits (500/day personal, 2,000/day Workspace) or custom daily caps.

### 4. A/B Testing & Optimization Engine
- **Variant Splitting**: Random or alternating assignment of recipient rows to Variant A vs Variant B (subject line, body, CTA).
- **Metric Tracking**: Sent count, Open rate (via tracking pixel), Reply rate (via thread monitoring).
- **Statistical Significance**: Calculates conversion delta between variants.

### 5. Day-Wise Analytics & Observability
- Sent emails per day timeline graph.
- Delivery status distribution.
- Hourly send velocity heatmaps.

### 6. Multi-Step Drip Cadence & Organic Threading Engine
- **Linear Cadence**: Step 1 (Initial Pitch), Step 2 (Follow-up), Step 3 (Breakup / Closing) with independent day and hour delays.
- **Dynamic Header Variables**: Binds template variables directly from the campaign's attached database schema with quick-click insertion.
- **RFC 2822 Organic Threading**: Follow-up emails inject `In-Reply-To` and `References` headers referencing the Step 1 `Message-ID`, landing naturally in the recipient's existing thread.
- **Non-Destructive Scheduled Delay Dispatch**: When Step 1 completes, contacts transition to `current_step = 2, next_step_scheduled_at = now + delay`. The worker enters `WAITING_SCHEDULE` and automatically dispatches follow-ups once their scheduled window arrives.

### 7. Inbound IMAP Reply Scanner, Sequence Disarm & Funnel Analytics
- **Universal IMAP Resolver**: Connects to Custom Domain IMAP servers (port 993 SSL) or Gmail IMAP via App Passwords.
- **Autoreply Filter**: Discards automated bounce, out-of-office, and delivery status notices using RFC 3834 `Auto-Submitted`, `X-Autoreply`, `Precedence: bulk/junk`, and regex subject heuristics to prevent false halts.
- **Atomic Disarm Invariant**: Detected replies atomically set `status = 'REPLIED'`, `replied_at = receivedAt`, and `next_step_scheduled_at = NULL` in `database_records`, permanently halting all future drip follow-ups.
- **Visual Funnel & Audit CSV**: Real-time conversion drop-off funnel (Audience -> Step 1 -> Step 2 -> Step 3 -> Replies) with conversion percentages and downloadable RFC 4180 audit CSV export (`/api/campaigns/:id/export-audit`).
- **Manual Cockpit Overrides**: 1-click manual "Mark Replied" and "Cancel Next" controls in the Database Inspector table for immediate operator intervention.

### 8. Dual-Theme Architecture & Design Token Engine (v3.0)
- **CSS Semantic Tokens**: Centralized variables (`--bg-canvas`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--border-subtle`) in `client/src/index.css` mapped dynamically to `[data-theme="dark"]` and `[data-theme="light"]`.
- **Theme Switcher**: React Context (`ThemeContext.jsx`) synchronizing state with `localStorage` and `document.documentElement`.
- **FOUT Prevention**: Synchronous pre-render script in `client/index.html` preventing theme flash on refresh.
- **Accessibility**: High-contrast WCAG 2.2 AA compliant palette (>4.5:1 text contrast) across both modes.

### 9. UX Copywriting Polish & Curated Starter Presets Gallery (v3.0)
- **Standardized Outreach Vocabulary**: Authoritative B2B terminology across all navigation items, toasts, modals, and error boundaries.
- **Contextual Tooltips**: Interactive explanatory tooltips for technical email deliverability parameters (jitter, limits, threading, disarm).
- **Curated Starter Presets Gallery**: Static vetted outreach templates (Problem Pitch, Social Proof, 3-Day Bump, Breakup) clonable directly into the active templates library with dynamic variable pill bindings.

### 10. Free AI Reply Sentiment Intelligence & Cockpit Filtering (v3.0)
- **Zero-Cost Inference**: Google Gemini 1.5 Flash REST client via native Node `fetch`, using free API tier keys stored locally in SQLite `settings`.
- **Dual Engine Architecture**: Automatically runs local rule-based regex/keyword heuristic analyzer if no API key is provided or during network timeouts.
- **Thread Sanitization**: Strips historical quoted email text before AI analysis to evaluate only the recipient's new message.
- **Taxonomy**: Classifies responses into `Interested`, `Question`, `Follow Up`, `Not Interested`, and `Unsubscribe` with 1-sentence summaries.
- **Cockpit Observability**: Color-coded badges, confidence scores, 1-click filter tabs, and operator manual override controls in the Campaign Cockpit and Database Inspector.

### 11. Campaign Duplication & Triad Cloning Subsystem (v4.0)
- **Transactional Cloning**: `POST /api/campaigns/:id/duplicate` executes within an ACID transaction (`db.transaction`).
- **Entity Replication**:
  - Clones `campaigns` row: inherits `subject_a`, `body_a`, `subject_b`, `body_b`, `is_ab_test`, `min_delay`, `max_delay`, `daily_limit`, `template_id`, `sender_account_id`, `sender_provider`, `cc_addresses`, `bcc_addresses`.
  - Re-keys new campaign `name` and binds targeted `database_id`.
  - Sets `status = 'DRAFT'`, `sent_count = 0`, `failed_count = 0`, `reply_count = 0`.
- **Drip Cadence Preservation**: Queries all rows from `campaign_drip_steps WHERE campaign_id = sourceId`, duplicates them with `campaign_id = newId`, retaining cadence delays and step content.
- **Database Triad Rebinding**: Marks the target database `is_attached = 1`, `campaign_id = newId`, binds records, and updates `total_contacts` to the database's valid row count.

### 12. A/B Testing Studio & Variant Template Assignment (v4.0)
- **Template Selector**: Enables direct binding or loading of saved templates into Variant A and Variant B.
- **Dynamic Resolution**: Supports per-variant template references (`template_id_a`, `template_id_b`) alongside custom inline overrides in `queueService.js`.
- **Dual Spam & Deliverability Preflight**: Displays side-by-side spam scores, word count, and token variables for both variants.



