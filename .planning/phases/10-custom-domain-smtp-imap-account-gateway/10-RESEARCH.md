# Phase 10: Custom Domain SMTP & IMAP Account Gateway - Research

**Researched:** 2026-10-03  
**Domain:** Custom Domain SMTP Outbound & IMAP Inbound Integration  
**Confidence:** HIGH  

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Dual Configuration Storage)**: System must preserve existing Gmail credentials while storing Custom Domain credentials in SQLite. A global `active_provider` setting (`'gmail_app_password'`, `'gmail_oauth2'`, or `'custom_domain'`) determines default dispatch.
- **D-02 (Per-Campaign Sender Override)**: The Campaign Preflight Cockpit must allow selecting an explicit sender identity for that specific campaign (Default, Gmail, or Custom Domain).
- **D-03 (Smart Presets + Manual Custom)**: Settings UI must include 1-click presets for popular hosts (Zoho, Fastmail, Outlook 365, Namecheap PrivateEmail) plus Custom Host with auto-port detection (Port 465 -> SSL/TLS; Port 587 -> STARTTLS).
- **D-04 (IMAP Credentials Auto-Sync)**: 1-click button to copy host, username, and password from SMTP to IMAP inputs.
- **D-05 (Dual-Layer Verification)**: Provide server handshake verification (`transporter.verify()` for SMTP, `client.connect()` for IMAP) plus a real live test-email trigger to verify end-to-end deliverability.

### the agent's Discretion
- Visual aesthetics matching Linear/Raycast dark cockpit standards and WCAG 2.2 AA visible focus rings.
- Internal error formatting and diagnostic tips on failed server connections.

### Deferred Ideas (OUT OF SCOPE)
- Multi-Account Burner Inbox Rotation (explicitly dropped).
- AI Personalized Icebreaker Generation (explicitly dropped).
</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Settings Form & Presets UI | Browser/Client | — | Instant responsive input handling, preset population, password masking |
| SMTP & IMAP Credential Storage | Database/Storage | API/Backend | Local SQLite persistence in `settings` table |
| SMTP Connection Handshake | API/Backend | — | Server-side TCP/TLS socket verification via Nodemailer `verify()` |
| IMAP Connection Handshake | API/Backend | — | Server-side IMAP socket authentication via ImapFlow |
| Live Test-Send Verification | API/Backend | Browser/Client | Outbound RFC dispatch to user's test address |
| Active Account Transport Resolution | API/Backend | — | Resolver in `queueService.js` choosing credentials based on campaign settings |

</architectural_responsibility_map>

<research_summary>
## Summary

Phase 10 upgrades StrokeCRM from a Gmail-only tool into a universal cold email gateway supporting custom domain emails (e.g. `user@mycompany.com`) hosted on business providers (Zoho, Fastmail, Namecheap, Outlook 365, cPanel, or private VPS).

The implementation relies on two core Node.js protocols:
1. **SMTP Outbound**: Using the existing `nodemailer` library with custom options `{ host, port, secure, auth: { user, pass } }`. Auto-detecting `secure: true` for port 465 and `secure: false` for port 587/25 avoids the single most common connection hang.
2. **IMAP Inbound**: Using `imapflow`, a modern async/await Promise-based IMAP client by the Nodemailer author, to establish secure TLS connections to `imap_host:imap_port` and verify mailbox authentication.

The UI integrates seamlessly into `SettingsView.jsx` as a third tab alongside Google App Passwords and OAuth2, and into `CampaignsView.jsx` as a sender account selector in the launch cockpit.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nodemailer` | ^10.0.13 | Outbound SMTP transport & test-send | Built-in connection verification, standard MIME construction, universal relay support. |
| `imapflow` | ^1.0.160 | Inbound IMAP authentication test | Native async/await, clean Promise lifecycle, built-in TLS and SNI support. |
| `better-sqlite3` | ^13.0.3 | Credentials and settings persistence | Synchronous ACID writes, zero background lockups. |

### Installation
```bash
npm install imapflow
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Preset Configurations Table

```javascript
export const EMAIL_PRESETS = {
  zoho: {
    name: 'Zoho Mail',
    smtpHost: 'smtp.zoho.com',
    smtpPort: 465,
    smtpSecure: true,
    imapHost: 'imap.zoho.com',
    imapPort: 993,
    imapSecure: true
  },
  fastmail: {
    name: 'Fastmail',
    smtpHost: 'smtp.fastmail.com',
    smtpPort: 465,
    smtpSecure: true,
    imapHost: 'imap.fastmail.com',
    imapPort: 993,
    imapSecure: true
  },
  outlook: {
    name: 'Microsoft 365 / Outlook',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapSecure: true
  },
  privateemail: {
    name: 'Namecheap PrivateEmail',
    smtpHost: 'mail.privateemail.com',
    smtpPort: 465,
    smtpSecure: true,
    imapHost: 'mail.privateemail.com',
    imapPort: 993,
    imapSecure: true
  },
  custom: {
    name: 'Custom / Self-Hosted SMTP',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: '',
    imapPort: 993,
    imapSecure: true
  }
};
```

### Transport Resolver Pattern (`server/queueService.js`)

```javascript
function resolveTransporter(campaignSenderOverride = null) {
  const settings = db.getSettings();
  const provider = campaignSenderOverride || settings.active_provider || 'gmail_app_password';

  if (provider === 'custom_domain') {
    return nodemailer.createTransport({
      host: settings.custom_smtp_host,
      port: Number(settings.custom_smtp_port) || 587,
      secure: settings.custom_smtp_secure === '1' || settings.custom_smtp_secure === true || settings.custom_smtp_secure === 1,
      auth: {
        user: settings.custom_smtp_user,
        pass: settings.custom_smtp_pass
      }
    });
  }
  // Fall back to existing Gmail App Password or OAuth2 transports
  return createGmailTransport(settings);
}
```
</architecture_patterns>

<validation_architecture>
## Validation Architecture

1. **SMTP Handshake**: Calling `POST /api/auth/test-custom-smtp` with valid credentials returns `{ success: true, message: "SMTP server handshake verified successfully." }`. Calling with bad password returns `{ success: false, message: "Invalid login: 535 Authentication credentials invalid." }`.
2. **IMAP Handshake**: Calling `POST /api/auth/test-custom-imap` with valid credentials returns `{ success: true, message: "IMAP connection verified successfully." }`.
3. **Live Test-Send**: Calling `POST /api/auth/send-test-email` with `{ recipientEmail }` sends an actual test email using the configured custom SMTP settings and confirms delivery.
4. **Preflight Selection**: When creating or launching a campaign, selecting Custom Domain displays the sender address and dispatches emails via that identity.
</validation_architecture>

---
*Phase: 10-custom-domain-smtp-imap-account-gateway*  
*Researched: 2026-10-03*
