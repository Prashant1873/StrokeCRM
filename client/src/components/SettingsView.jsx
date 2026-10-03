import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Sliders, 
  ExternalLink, 
  Info, 
  Lock,
  Trash2,
  Globe,
  Server,
  Send,
  Copy,
  Mail,
  Check
} from 'lucide-react';

const PROVIDER_PRESETS = {
  zoho: {
    name: 'Zoho Mail',
    smtpHost: 'smtp.zoho.com',
    smtpPort: 465,
    smtpSecure: true,
    imapHost: 'imap.zoho.com',
    imapPort: 993,
    imapSecure: true
  },
  office365: {
    name: 'Microsoft 365 / Outlook',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: 'outlook.office365.com',
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
  namecheap: {
    name: 'Namecheap PrivateEmail',
    smtpHost: 'mail.privateemail.com',
    smtpPort: 465,
    smtpSecure: true,
    imapHost: 'mail.privateemail.com',
    imapPort: 993,
    imapSecure: true
  },
  custom: {
    name: 'Custom / Self-Hosted',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: '',
    imapPort: 993,
    imapSecure: true
  }
};

export default function SettingsView({ authStatus, refreshAuthStatus }) {
  // Global active sending gateway
  const [activeProvider, setActiveProvider] = useState('gmail_app_password'); // 'gmail_app_password' | 'oauth2' | 'custom_domain'
  const [authType, setAuthType] = useState('app_password'); // 'app_password' | 'oauth2' | 'custom_domain'

  // Gmail fields
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  
  // OAuth2 fields
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  // Custom Domain fields
  const [customPreset, setCustomPreset] = useState('custom');
  const [customSenderName, setCustomSenderName] = useState('');
  const [customSenderEmail, setCustomSenderEmail] = useState('');
  const [customSmtpHost, setCustomSmtpHost] = useState('');
  const [customSmtpPort, setCustomSmtpPort] = useState(587);
  const [customSmtpSecure, setCustomSmtpSecure] = useState(false);
  const [customSmtpUser, setCustomSmtpUser] = useState('');
  const [customSmtpPass, setCustomSmtpPass] = useState('');
  const [customImapHost, setCustomImapHost] = useState('');
  const [customImapPort, setCustomImapPort] = useState(993);
  const [customImapSecure, setCustomImapSecure] = useState(true);
  const [customImapUser, setCustomImapUser] = useState('');
  const [customImapPass, setCustomImapPass] = useState('');
  const [copiedSmtpToImap, setCopiedSmtpToImap] = useState(false);

  // Sending schedule & throttle settings
  const [dailyLimit, setDailyLimit] = useState(100);
  const [minDelay, setMinDelay] = useState(45);
  const [maxDelay, setMaxDelay] = useState(90);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('18:00');
  const [enforceSchedule, setEnforceSchedule] = useState(false);
  const [quotaType, setQuotaType] = useState('personal');

  // UI testing & feedback state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Custom Domain testing states
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);
  const [isTestingImap, setIsTestingImap] = useState(false);
  const [imapTestResult, setImapTestResult] = useState(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  useEffect(() => {
    // Populate existing account info if available
    if (authStatus?.connected && authStatus.account) {
      setEmail(authStatus.account.email || '');
      setAuthType(authStatus.account.type || 'app_password');
    }

    if (authStatus?.active_provider) {
      setActiveProvider(authStatus.active_provider);
      if (authStatus.active_provider === 'custom_domain') {
        setAuthType('custom_domain');
      }
    }

    // Load global settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.active_provider) {
          setActiveProvider(data.active_provider);
          if (data.active_provider === 'custom_domain') {
            setAuthType('custom_domain');
          }
        }
        if (data.custom_sender_name) setCustomSenderName(data.custom_sender_name);
        if (data.custom_sender_email) {
          setCustomSenderEmail(data.custom_sender_email);
          setTestRecipientEmail(prev => prev || data.custom_sender_email);
        }
        if (data.custom_smtp_host) setCustomSmtpHost(data.custom_smtp_host);
        if (data.custom_smtp_port) setCustomSmtpPort(Number(data.custom_smtp_port));
        if (data.custom_smtp_secure !== undefined) {
          setCustomSmtpSecure(data.custom_smtp_secure === '1' || data.custom_smtp_secure === 'true' || data.custom_smtp_secure === true);
        }
        if (data.custom_smtp_user) {
          setCustomSmtpUser(data.custom_smtp_user);
          if (!data.custom_sender_email) {
            setTestRecipientEmail(prev => prev || data.custom_smtp_user);
          }
        }
        if (data.custom_imap_host) setCustomImapHost(data.custom_imap_host);
        if (data.custom_imap_port) setCustomImapPort(Number(data.custom_imap_port));
        if (data.custom_imap_secure !== undefined) {
          setCustomImapSecure(data.custom_imap_secure === '1' || data.custom_imap_secure === 'true' || data.custom_imap_secure === true);
        }
        if (data.custom_imap_user) setCustomImapUser(data.custom_imap_user);

        if (data.daily_limit) setDailyLimit(Number(data.daily_limit));
        if (data.min_delay_sec) setMinDelay(Number(data.min_delay_sec));
        if (data.max_delay_sec) setMaxDelay(Number(data.max_delay_sec));
        if (data.start_hour) setStartHour(data.start_hour);
        if (data.end_hour) setEndHour(data.end_hour);
        if (data.enforce_schedule !== undefined) {
          setEnforceSchedule(data.enforce_schedule === '1' || data.enforce_schedule === 'true' || data.enforce_schedule === true);
        }
        if (data.gmail_quota_type) setQuotaType(data.gmail_quota_type);
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, [authStatus]);

  // Preset selection handler
  const handlePresetSelect = (presetKey) => {
    setCustomPreset(presetKey);
    const p = PROVIDER_PRESETS[presetKey];
    if (p && presetKey !== 'custom') {
      setCustomSmtpHost(p.smtpHost);
      setCustomSmtpPort(p.smtpPort);
      setCustomSmtpSecure(p.smtpSecure);
      setCustomImapHost(p.imapHost);
      setCustomImapPort(p.imapPort);
      setCustomImapSecure(p.imapSecure);
    }
  };

  // Copy SMTP credentials to IMAP
  const handleCopySmtpToImap = () => {
    if (customSmtpUser) setCustomImapUser(customSmtpUser);
    if (customSmtpPass) setCustomImapPass(customSmtpPass);
    if (customSmtpHost && !customImapHost) {
      if (customSmtpHost.startsWith('smtp.')) {
        setCustomImapHost(customSmtpHost.replace('smtp.', 'imap.'));
      } else {
        setCustomImapHost(customSmtpHost);
      }
    }
    setCopiedSmtpToImap(true);
    setTimeout(() => setCopiedSmtpToImap(false), 2000);
  };

  // Switch Active Sending Gateway
  const handleSwitchActiveProvider = async (provider) => {
    setActiveProvider(provider);
    try {
      await fetch('/api/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_provider: provider })
      });
      if (refreshAuthStatus) refreshAuthStatus();
    } catch (err) {
      console.error('Failed to update active provider:', err);
    }
  };

  // Gmail handshake test
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      if (authType === 'app_password') {
        const res = await fetch('/api/auth/test-smtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, app_password: appPassword })
        });
        const data = await res.json();
        setTestResult(data);
      } else {
        const res = await fetch('/api/auth/test-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken
          })
        });
        const data = await res.json();
        setTestResult(data);
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Network error connecting to backend: ' + err.message });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Gmail Account
  const handleSaveAccount = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload = {
        type: authType,
        email,
        app_password: appPassword,
        oauth_client_id: clientId,
        oauth_client_secret: clientSecret,
        oauth_refresh_token: refreshToken
      };

      const res = await fetch('/api/auth/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSaveMessage({ type: 'success', text: data.message });
        setAppPassword(''); // clear password from input state for security
        setActiveProvider(authType);
        await handleSwitchActiveProvider(authType);
        if (refreshAuthStatus) refreshAuthStatus();
      } else {
        setSaveMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Custom Domain SMTP Handshake Test
  const handleTestCustomSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/auth/test-custom-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: customSmtpHost,
          port: customSmtpPort,
          secure: customSmtpSecure,
          user: customSmtpUser,
          pass: customSmtpPass
        })
      });
      const data = await res.json();
      setSmtpTestResult(data);
    } catch (err) {
      setSmtpTestResult({ success: false, message: 'Network error: ' + err.message });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Custom Domain IMAP Connection Test
  const handleTestCustomImap = async () => {
    setIsTestingImap(true);
    setImapTestResult(null);
    try {
      const res = await fetch('/api/auth/test-custom-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: customImapHost,
          port: customImapPort,
          secure: customImapSecure,
          user: customImapUser,
          pass: customImapPass
        })
      });
      const data = await res.json();
      setImapTestResult(data);
    } catch (err) {
      setImapTestResult({ success: false, message: 'Network error: ' + err.message });
    } finally {
      setIsTestingImap(false);
    }
  };

  // Custom Domain Live Test Email Send
  const handleSendCustomTestEmail = async () => {
    if (!testRecipientEmail) {
      setTestEmailResult({ success: false, message: 'Please enter a recipient email address.' });
      return;
    }
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/auth/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: customSmtpHost,
          port: customSmtpPort,
          secure: customSmtpSecure,
          user: customSmtpUser,
          pass: customSmtpPass,
          sender_name: customSenderName,
          sender_email: customSenderEmail,
          recipient_email: testRecipientEmail
        })
      });
      const data = await res.json();
      setTestEmailResult(data);
    } catch (err) {
      setTestEmailResult({ success: false, message: 'Test send error: ' + err.message });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Save Custom Domain Credentials
  const handleSaveCustomDomain = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload = {
        active_provider: 'custom_domain',
        custom_sender_name: customSenderName,
        custom_sender_email: customSenderEmail,
        custom_smtp_host: customSmtpHost,
        custom_smtp_port: customSmtpPort,
        custom_smtp_secure: customSmtpSecure ? '1' : '0',
        custom_smtp_user: customSmtpUser,
        custom_smtp_pass: customSmtpPass,
        custom_imap_host: customImapHost,
        custom_imap_port: customImapPort,
        custom_imap_secure: customImapSecure ? '1' : '0',
        custom_imap_user: customImapUser,
        custom_imap_pass: customImapPass
      };

      const res = await fetch('/api/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSaveMessage({ type: 'success', text: 'Custom domain SMTP/IMAP credentials saved and set as active dispatch gateway!' });
        setActiveProvider('custom_domain');
        if (refreshAuthStatus) refreshAuthStatus();
      } else {
        setSaveMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveScheduleSettings = async () => {
    try {
      const payload = {
        daily_limit: dailyLimit,
        min_delay_sec: minDelay,
        max_delay_sec: maxDelay,
        start_hour: startHour,
        end_hour: endHour,
        enforce_schedule: enforceSchedule ? '1' : '0',
        gmail_quota_type: quotaType
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Throttle and pacing settings updated successfully!');
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect this Gmail account?')) {
      await fetch('/api/auth/disconnect', { method: 'POST' });
      setEmail('');
      setAppPassword('');
      if (refreshAuthStatus) refreshAuthStatus();
      setTestResult(null);
      setSaveMessage({ type: 'success', text: 'Gmail account disconnected successfully.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 text-left">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Dispatch Control</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure your outbound sender credentials, custom business domains, and throttle safeguards.
        </p>
      </div>

      {/* Account Connection Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Outbound Dispatch Accounts</h2>
              <p className="text-xs text-slate-400">Connect Gmail or custom domain mailboxes (Zoho, Fastmail, 365, private mail).</p>
            </div>
          </div>
          {authStatus?.connected && authType !== 'custom_domain' && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Disconnect
            </button>
          )}
        </div>

        {/* Global Active Provider Radio Group */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Active Outbound Dispatch Gateway
              </span>
              <p className="text-[11px] text-slate-400">
                Determines which authenticated identity sends campaign emails by default.
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto ${
              activeProvider === 'custom_domain'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : activeProvider === 'oauth2'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
            }`}>
              {activeProvider === 'custom_domain' ? 'Custom Domain Active' : activeProvider === 'oauth2' ? 'OAuth2 Active' : 'Gmail App Password Active'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSwitchActiveProvider('gmail_app_password')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                activeProvider === 'gmail_app_password'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gmail App Password</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchActiveProvider('oauth2')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                activeProvider === 'oauth2'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Google OAuth2</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchActiveProvider('custom_domain')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                activeProvider === 'custom_domain'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Custom Domain (SMTP)</span>
            </button>
          </div>
        </div>

        {/* 3-Tab Provider Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setAuthType('app_password'); setTestResult(null); }}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              authType === 'app_password'
                ? 'border-indigo-500 bg-indigo-950/20 text-white'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-400" />
                Google App Password
              </span>
              <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                1-Min
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect via Gmail SMTP. Zero Google Cloud Console setup required.
            </p>
          </button>

          <button
            type="button"
            onClick={() => { setAuthType('oauth2'); setTestResult(null); }}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              authType === 'oauth2'
                ? 'border-indigo-500 bg-indigo-950/20 text-white'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Official OAuth2 API
              </span>
              <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                Advanced
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect via Google Cloud OAuth2 Client ID, Secret, and Refresh Token.
            </p>
          </button>

          <button
            type="button"
            onClick={() => { setAuthType('custom_domain'); setTestResult(null); }}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              authType === 'custom_domain'
                ? 'border-indigo-500 bg-indigo-950/20 text-white'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-400" />
                Custom Domain (SMTP/IMAP)
              </span>
              <span className="text-[10px] font-medium bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/30">
                New v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Send directly through Zoho, Fastmail, Outlook 365, or your business domain.
            </p>
          </button>
        </div>

        {/* Tab 1: Google App Password */}
        {authType === 'app_password' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Your Gmail Address
              </label>
              <input
                type="email"
                placeholder="founder@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  16-Character Google App Password
                </label>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Generate App Password <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder={authStatus?.connected && authStatus.account?.has_password ? "•••••••••••••••• (Saved)" : "abcd efgh ijkl mnop"}
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
              <div className="flex items-start gap-2 mt-2 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> Requires Google 2-Step Verification turned ON. Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 underline">myaccount.google.com/apppasswords</a>, name it "StrokeCRM", and paste the generated 16-character code here.
                </span>
              </div>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
                testResult.success 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">{testResult.success ? 'Handshake Successful' : 'Connection Failed'}: </span>
                  {testResult.message}
                </div>
              </div>
            )}

            {/* Save Message */}
            {saveMessage && (
              <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                <Info className="w-4 h-4 shrink-0" />
                {saveMessage.text}
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !email}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 transition-colors"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
                {isTesting ? 'Verifying...' : 'Test Handshake'}
              </button>

              <button
                type="button"
                onClick={handleSaveAccount}
                disabled={isSaving || !email}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Save & Activate Gmail
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: OAuth2 API */}
        {authType === 'oauth2' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Gmail Address</label>
              <input
                type="email"
                placeholder="founder@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">OAuth Client ID</label>
                <input
                  type="text"
                  placeholder="apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">OAuth Client Secret</label>
                <input
                  type="password"
                  placeholder="Client secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Refresh Token</label>
              <input
                type="password"
                placeholder="1//..."
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
                testResult.success 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">{testResult.success ? 'Handshake Successful' : 'Connection Failed'}: </span>
                  {testResult.message}
                </div>
              </div>
            )}

            {saveMessage && (
              <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                <Info className="w-4 h-4 shrink-0" />
                {saveMessage.text}
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !email}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 transition-colors"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
                {isTesting ? 'Verifying...' : 'Test Handshake'}
              </button>

              <button
                type="button"
                onClick={handleSaveAccount}
                disabled={isSaving || !email}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Save & Activate OAuth2
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Custom Domain (SMTP/IMAP) */}
        {authType === 'custom_domain' && (
          <div className="space-y-6">
            {/* Provider Presets Bar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                  1-Click Email Provider Preset
                </label>
                <span className="text-[11px] text-slate-500">Auto-fills hosts, ports, & encryption</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePresetSelect(key)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                      customPreset === key
                        ? 'bg-sky-500/20 border-sky-500 text-sky-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Identity Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Sender Outbound Identity
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Rivera"
                    value={customSenderName}
                    onChange={(e) => setCustomSenderName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="alex@company.com"
                    value={customSenderEmail}
                    onChange={(e) => setCustomSenderEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Outbound SMTP Section */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Outbound SMTP Dispatch</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Port 465 (SSL) / Port 587 (STARTTLS)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.example.com"
                    value={customSmtpHost}
                    onChange={(e) => setCustomSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Port & Security</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="587"
                      value={customSmtpPort}
                      onChange={(e) => {
                        const p = Number(e.target.value);
                        setCustomSmtpPort(p);
                        if (p === 465) setCustomSmtpSecure(true);
                        else if (p === 587) setCustomSmtpSecure(false);
                      }}
                      className="w-20 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={customSmtpSecure}
                        onChange={(e) => setCustomSmtpSecure(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0"
                      />
                      <span>SSL (Direct)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    placeholder="user@example.com"
                    value={customSmtpUser}
                    onChange={(e) => setCustomSmtpUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={customSmtpPass}
                    onChange={(e) => setCustomSmtpPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* SMTP Test Button and Feedback */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestCustomSmtp}
                  disabled={isTestingSmtp || !customSmtpHost || !customSmtpUser || !customSmtpPass}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 transition-colors self-start sm:self-auto"
                >
                  {isTestingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{isTestingSmtp ? 'Verifying SMTP...' : 'Test SMTP Handshake'}</span>
                </button>
              </div>

              {smtpTestResult && (
                <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  smtpTestResult.success 
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}>
                  {smtpTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{smtpTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Inbound IMAP Section */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Inbound IMAP Gateway</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopySmtpToImap}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors"
                  title="Copy credentials from SMTP"
                >
                  {copiedSmtpToImap ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedSmtpToImap ? 'Credentials Copied!' : 'Copy from SMTP'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">IMAP Host</label>
                  <input
                    type="text"
                    placeholder="imap.example.com"
                    value={customImapHost}
                    onChange={(e) => setCustomImapHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Port & Security</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="993"
                      value={customImapPort}
                      onChange={(e) => setCustomImapPort(Number(e.target.value))}
                      className="w-20 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={customImapSecure}
                        onChange={(e) => setCustomImapSecure(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <span>SSL (Port 993)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">IMAP Username</label>
                  <input
                    type="text"
                    placeholder="user@example.com"
                    value={customImapUser}
                    onChange={(e) => setCustomImapUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">IMAP Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={customImapPass}
                    onChange={(e) => setCustomImapPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* IMAP Test Button and Feedback */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestCustomImap}
                  disabled={isTestingImap || !customImapHost || !customImapUser || !customImapPass}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 transition-colors self-start sm:self-auto"
                >
                  {isTestingImap ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
                  <span>{isTestingImap ? 'Verifying IMAP...' : 'Test IMAP Connection'}</span>
                </button>
              </div>

              {imapTestResult && (
                <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  imapTestResult.success 
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}>
                  {imapTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{imapTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Live Test-Send Verification Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/20 via-slate-950/40 to-indigo-950/20 border border-sky-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Live Deliverability Test</span>
              </div>
              <p className="text-xs text-slate-400">
                Send an actual verification email to your personal inbox right now using these SMTP credentials before launching campaigns.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  placeholder="recipient@yourpersonalmail.com"
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSendCustomTestEmail}
                  disabled={isSendingTestEmail || !testRecipientEmail || !customSmtpHost || !customSmtpUser || !customSmtpPass}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
                >
                  {isSendingTestEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isSendingTestEmail ? 'Sending...' : 'Send Live Test Email'}</span>
                </button>
              </div>

              {testEmailResult && (
                <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  testEmailResult.success 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {testEmailResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testEmailResult.message}</span>
                </div>
              )}
            </div>

            {/* Save Custom Domain Actions */}
            {saveMessage && (
              <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                <Info className="w-4 h-4 shrink-0" />
                {saveMessage.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveCustomDomain}
                disabled={isSaving || !customSmtpHost || !customSmtpUser || !customSmtpPass}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Save & Activate Custom Domain</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sending Pacing & Safeguards Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Pacing & Throttle Safeguards</h2>
            <p className="text-xs text-slate-400">Protects your sender domain reputation by ensuring randomized, human-like delivery intervals.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Limit & Quota Type */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Gmail / Domain Account Type
            </label>
            <select
              value={quotaType}
              onChange={(e) => setQuotaType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="personal">Personal Gmail (@gmail.com) — Limit 500/day</option>
              <option value="workspace">Google Workspace / Custom Domain — Limit 2,000/day</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Daily Safe Send Cap (Per Day)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="10"
                max={quotaType === 'personal' ? 450 : 1800}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">emails/day</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Recommended for cold outreach: 50-100/day during initial warmup.</p>
          </div>

          {/* Random Jitter Delays */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Minimum Delay Between Emails
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="5"
                max="600"
                value={minDelay}
                onChange={(e) => setMinDelay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">seconds</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Maximum Delay Between Emails
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={minDelay}
                max="1200"
                value={maxDelay}
                onChange={(e) => setMaxDelay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">seconds</span>
            </div>
          </div>

          {/* Schedule Window */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Sending Window Start Time
            </label>
            <input
              type="time"
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Sending Window End Time
            </label>
            <input
              type="time"
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
            />
          </div>

          {/* Working Hours Enforcement Toggle */}
          <div className="md:col-span-2 pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Restrict Dispatch to Sending Window</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {enforceSchedule 
                  ? `Active: Campaigns will pause outside ${startHour} - ${endHour}.` 
                  : 'Disabled (Default): Campaigns dispatch immediately 24/7 on demand.'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={enforceSchedule} 
                onChange={(e) => setEnforceSchedule(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleSaveScheduleSettings}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            Save Safeguards
          </button>
        </div>
      </div>
    </div>
  );
}
