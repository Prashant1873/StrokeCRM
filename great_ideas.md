# Great Ideas & User Inputs

This document records high-value user inputs, design ideas, and creative directions for StrokeCRM.

---

## 1. Initial Vision & Core Concepts (Logged: 2026-10-03)
- **Concept**: Free, unlimited, self-controlled alternative to commercial outreach tools (e.g., Streak CRM) operating directly via the user's Gmail account without costly monthly subscriptions.
- **Dynamic Excel/CSV Mapping**: Provide an email template with handlebars/variables (`{{FirstName}}`, `{{Company}}`, etc.), upload an Excel/CSV file with arbitrary headers, auto-map headers to template variables, and preview merged output.
- **Timing & Rate Limiting Engine**: Configurable pacing, randomized intervals (jitter), working hours scheduling, and daily send limits to safeguard Gmail sender reputation.
- **Send State Machine & Audit Tracking**: Real-time tracking of what has been sent, pending, paused, or failed, ensuring zero duplicate sends and resume capability.
- **Day-Wise Analytics Dashboard**: Visual breakdown of emails sent per day, delivery success, response trends, and volume monitoring against Gmail quotas.
- **Dedicated A/B Testing Engine**: Separate testing dashboard to evaluate multiple subject lines and email body variants across lead cohorts to optimize reply rates.
- **Startup-Centric Outreach Innovations**:
  - Automated follow-up drip sequences that halt on reply.
  - Deliverability & spam-word preflight checker.
  - AI icebreaker / personalized snippet generation per recipient row.
  - Multi-account rotation (send across multiple Gmail accounts to scale safely).

---

## 2. Interactive Navigation & Step-Driven Cockpit Overhaul (Logged: 2026-10-03)
- **Hierarchical Navigation & Indexed Traceability**:
  - Replace flat tab switching with deeply indexed page paths and visual breadcrumbs (`Campaigns > [Campaign Name] > Launch Preflight`).
  - Enable seamless backward tracing (back-button friendly, route history stack, breadcrumb jumps).
- **Contextual Step-by-Step Option Controls**:
  - Interactive preflight modals and step-by-step launch gates.
  - Dedicated toggle switches at critical execution checkpoints:
    - "Enforce Working Hours (9 AM - 6 PM)" switch directly on the campaign start screen (with one-click bypass mode).
    - Pacing jitter override sliders (instant tuning before firing).
    - Mandatory or optional "Send test email to myself first" validation gate.
    - Quota ceiling threshold safety alerts before batch ignition.
- **Frontend-Skill Guided Craft**:
  - Anti-slop design aesthetic with dark cockpit theme, Apple-like fluid spring physics on switches/drawers, zero UI lag, and WCAG AA accessible contrast.

---

## 3. Isolated File-Backed Databases & Strict 1:1 Triad Architecture (Logged: 2026-10-03)
- **Problem Solved**:
  - Previously, all uploaded sheets merged into a single monolithic "Leads" database, causing header collisions across different file structures and risk of unintended batch dispatches.
- **The 1:1:1 Triad Model**:
  - **1 Campaign = 1 Database + 1 Template + 1 Dispatch Engine**:
    - **Isolated Databases**: Every uploaded spreadsheet (.csv, .xlsx, .xls) is stored and maintained as an independent, isolated database with its original file preserved and its unique header schema intact.
    - **Header Schema Independence**: Database A (e.g. Healthcare: `Doctor, Hospital, Specialty`) and Database B (e.g. SaaS: `Founder, ARR, TechStack`) retain their distinct column sets without cross-contamination.
    - **Strict Exclusive Attachment**: Once a database is attached to a campaign, it belongs exclusively to that campaign. The campaign dispatches strictly to that database's contacts.
    - **Dynamic Header Binding**: Templates bound to a campaign automatically read and expose the exact variable pills (`{{Specialty}}`, `{{TechStack}}`) from that campaign's attached database.
- **Nomenclature & UX Evolution**:
  - Replaced "Leads" with "Databases" across the entire platform.
  - Dedicated "Databases" management hub with schema inspection, row previewing, and direct campaign launch triggers.
  - Interactive 3-step Campaign Setup wizard: Select/Upload Database -> Attach/Create Template -> Configure & Launch.

---

## 4. Hub-and-Spoke Navigation: Dedicated Campaigns Directory & Saved Templates Library (Logged: 2026-10-03)
- **Problem Solved**:
  - Opening "Campaigns" or "Templates" directly dumped the user into a single campaign cockpit or raw email composer with a subtle dropdown. This lacked overview visibility, felt unorganized, and prevented intuitive management, comparison, and deletion across campaigns and templates.
- **The Hub-and-Spoke Architecture**:
  - **Campaigns Hub (`#/campaigns`)**:
    - Central directory displaying all campaigns in structured card format stacked vertically.
    - Card displays bound database, bound template, real-time status pill, delivery progress bar, and comprehensive management controls (Open Cockpit, Edit/Rebind, Delete with confirmation).
    - Dedicated "+ New Campaign" CTA launching the 3-step Triad wizard.
  - **Campaign Cockpit Detail (`#/campaigns/:id`)**:
    - Deep-linked detail page dedicated to live dispatch, pacing radar, audit log, and triad configuration, with an instant "← Back to Campaigns" crumb.
  - **Templates Library (`#/templates`)**:
    - Central collection displaying all saved reusable templates in rich cards.
    - Highlights subject preview with variable pills, body excerpt, detected variables, spam risk rating, and actions (Open Composer, Duplicate, Delete).
    - Dedicated "+ Create Template" CTA.
  - **Template Composer Detail (`#/templates/:id` or `#/templates/new`)**:
    - Focused studio for designing, previewing against sample database leads, and running spam scoring algorithms.---

## 5. Custom Domain Mail Support & Automated Drip Sequences (Logged: 2026-10-03)
- **Problem Solved**:
  - Many businesses, founders, and agencies send cold outreach from custom business domain emails (e.g. `alex@mycompany.com`, `contact@startup.io`) hosted on private mail servers, Zoho, Fastmail, or custom SMTP/IMAP relays, rather than strictly `@gmail.com` accounts.
- **Strategic Direction for v2.0**:
  - **Custom Domain Email Integration**:
    - Add universal SMTP/IMAP configuration controls (Host, Port, Secure/TLS, Username, Password/App Key).
    - Provide instant connection verification for custom domain servers.
    - Seamlessly select between connected accounts (Gmail vs Custom Domain Mail) when launching campaigns.
  - **Automated Drip Follow-Up Sequences**:
    - Multi-step sequence editor: Step 1 (Initial Outreach), Step 2 (Follow-up after X days), Step 3 (Breakup email after Y days).
  - **Inbound IMAP Reply Detection**:
    - Monitor inbox via IMAP to detect replies from contacted leads.
    - Automatically halt scheduled follow-up steps for replied contacts to prevent embarrassing follow-ups after a response.
  - **Deprioritized / Out of Scope for v2.0**:
    - AI icebreaker generator and multi-account rotation deferred to maintain maximum simplicity and core deliverability focus.
