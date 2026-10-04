# Phase 10: Custom Domain SMTP & IMAP Account Gateway - Context

**Gathered:** 2026-10-03  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Phase 10 delivers universal custom domain email account connectivity (SMTP outbound dispatch and IMAP inbound access) alongside existing Gmail options (App Passwords and OAuth2). It includes configuration management, host/port auto-presets, dual handshake testing + live test-send verification, and campaign-level sender selection.

Requirements: `DOM-01`, `DOM-02`, `DOM-03`.
</domain>

<decisions>
## Implementation Decisions

### Account Storage & Selection
- **D-01: Dual Configuration Storage**: The system stores both Gmail credentials and Custom Domain credentials in SQLite without overwriting each other. A global default provider (`active_provider`) is selected in Settings (`'gmail_app_password'`, `'gmail_oauth2'`, or `'custom_domain'`). — **Reversibility:** costly — affects settings schema and dispatch transport resolution.
- **D-02: Per-Campaign Sender Override**: In the Campaign Preflight Cockpit, the user can choose which configured account sends that specific campaign (Default, Gmail, or Custom Domain), allowing different campaigns to run from different email identities. — **Reversibility:** reversible — local to campaign setup and preflight state.

### Configuration & Presets
- **D-03: Smart Presets + Manual Custom**: Settings UI provides 1-click presets for popular business mail providers (Zoho Mail, Fastmail, Microsoft Outlook 365, Namecheap PrivateEmail) that auto-fill recommended hosts and ports, alongside a "Custom / Private Host" option with automatic port detection (Port 465 -> SSL/TLS `secure: true`; Port 587 -> STARTTLS `secure: false`). — **Reversibility:** reversible — pure UI helper and configuration convenience.
- **D-04: IMAP Credentials Auto-Sync**: A 1-click "Use same credentials as SMTP" button quickly copies host, username, and password from SMTP to IMAP settings since most custom domain providers use the same user/password for both. — **Reversibility:** reversible — client-side form convenience.

### Verification & Testing
- **D-05: Dual-Layer Verification**:
  1. **Handshake Test**: Test buttons for SMTP (`transporter.verify()`) and IMAP (`client.connect()`) verify host, port, TLS, and credentials with instant status pills and diagnostics.
  2. **Live Test-Send**: A "Send Test Email to Me" input allows users to send an actual live email to their personal inbox to verify DKIM/SPF acceptance and deliverability before launching outreach. — **Reversibility:** reversible.

### the agent's Discretion
- Exact layout and dark-cockpit styling of the Custom Domain tab in `SettingsView.jsx`, following existing Linear/Raycast design language and WCAG 2.2 AA contrast standards.
- Selection of specific icons from `lucide-react` (e.g. `Server`, `Mail`, `Shield`, `CheckCircle2`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing:**

- `server/index.js` — Current authentication test routes (`/api/auth/test-smtp`, `/api/auth/test-oauth`) and settings endpoints.
- `server/db.js` — SQLite database schema, settings table initialization, and credential persistence helpers.
- `server/queueService.js` — Dispatch worker resolving Nodemailer transporter for email sending.
- `client/src/components/SettingsView.jsx` — Existing Settings UI component managing email credentials and throttling options.
- `client/src/components/CampaignsView.jsx` — Campaign preflight cockpit where the sender account selector will be exposed.
- `.planning/research/STACK.md` — Stack research confirming `nodemailer` custom transport and `imapflow` for IMAP connection.
- `.planning/research/PITFALLS.md` — Critical pitfalls regarding port 465 SSL vs port 587 STARTTLS mismatches.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `nodemailer`: Already installed and battle-tested in `server/queueService.js` and `server/index.js`. Creating custom SMTP transport uses `nodemailer.createTransport({ host, port, secure, auth: { user, pass } })`.
- `client/src/components/SettingsView.jsx`: Has tab buttons, status cards, loading spinners, and test-result alert banners.
- `server/db.js`: Key-value or columnar `settings` table easily extensible with new columns or key rows (`smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_pass`, `imap_host`, `imap_port`, `imap_secure`, `imap_user`, `imap_pass`, `active_provider`).

### Established Patterns
- Password masking (`type="password"`) with visible focus rings (`focus-visible:ring-2`).
- Asynchronous API verification returning `{ success: boolean, message: string }`.
- Local-first security: all credentials stored exclusively in local SQLite database on user's machine.

### Integration Points
- Backend endpoints:
  - `POST /api/auth/test-custom-smtp`
  - `POST /api/auth/test-custom-imap`
  - `POST /api/auth/send-test-email`
  - `POST /api/settings/account` (saving active provider and custom domain credentials)
- Frontend:
  - `SettingsView.jsx` third tab: "Custom Domain (SMTP/IMAP)"
  - `CampaignsView.jsx` preflight cockpit: sender account selector dropdown/radios

</code_context>

<specifics>
## Specific Ideas

- Presets table:
  - **Zoho Mail**: SMTP `smtp.zoho.com` (465 SSL), IMAP `imap.zoho.com` (993 SSL)
  - **Fastmail**: SMTP `smtp.fastmail.com` (465 SSL), IMAP `imap.fastmail.com` (993 SSL)
  - **Outlook 365**: SMTP `smtp.office365.com` (587 STARTTLS), IMAP `outlook.office365.com` (993 SSL)
  - **PrivateEmail (Namecheap)**: SMTP `mail.privateemail.com` (465 SSL), IMAP `mail.privateemail.com` (993 SSL)
  - **Custom / Self-Hosted**: Empty inputs with auto-detection on port change.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed strictly within Phase 10 boundary.
</deferred>

---
*Phase: 10-custom-domain-smtp-imap-account-gateway*  
*Context gathered: 2026-10-03*
