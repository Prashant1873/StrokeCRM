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
