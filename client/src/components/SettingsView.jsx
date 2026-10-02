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
  Trash2
} from 'lucide-react';

export default function SettingsView({ authStatus, refreshAuthStatus }) {
  const [authType, setAuthType] = useState('app_password'); // 'app_password' | 'oauth2'
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  
  // OAuth2 fields
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  // Sending schedule & throttle settings
  const [dailyLimit, setDailyLimit] = useState(100);
  const [minDelay, setMinDelay] = useState(45);
  const [maxDelay, setMaxDelay] = useState(90);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('18:00');
  const [quotaType, setQuotaType] = useState('personal');

  // UI state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    // Populate existing account info if available
    if (authStatus?.connected && authStatus.account) {
      setEmail(authStatus.account.email || '');
      setAuthType(authStatus.account.type || 'app_password');
    }

    // Load global settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.daily_limit) setDailyLimit(Number(data.daily_limit));
        if (data.min_delay_sec) setMinDelay(Number(data.min_delay_sec));
        if (data.max_delay_sec) setMaxDelay(Number(data.max_delay_sec));
        if (data.start_hour) setStartHour(data.start_hour);
        if (data.end_hour) setEndHour(data.end_hour);
        if (data.gmail_quota_type) setQuotaType(data.gmail_quota_type);
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, [authStatus]);

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
        refreshAuthStatus();
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
      refreshAuthStatus();
      setTestResult(null);
      setSaveMessage({ type: 'success', text: 'Gmail account disconnected successfully.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 text-left">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Gmail Control</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure your sender credentials, throttle intervals, and daily delivery safeguards.
        </p>
      </div>

      {/* Gmail Account Connection Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Gmail Sender Connection</h2>
              <p className="text-xs text-slate-400">StrokeCRM connects directly to your Gmail account to dispatch cold outreach.</p>
            </div>
          </div>
          {authStatus?.connected && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Disconnect
            </button>
          )}
        </div>

        {/* Auth Method Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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
              <span className="text-sm font-semibold text-slate-200">Google App Password</span>
              <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Fastest (1 Min)
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
              <span className="text-sm font-semibold text-slate-200">Official OAuth2 API</span>
              <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                Advanced
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect via Google Cloud OAuth2 Client ID, Secret, and Refresh Token.
            </p>
          </button>
        </div>

        {/* Form Inputs */}
        {authType === 'app_password' ? (
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
          </div>
        ) : (
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
          </div>
        )}

        {/* Test Result Feedback Banner */}
        {testResult && (
          <div className={`mt-5 p-3.5 rounded-lg border flex items-start gap-2.5 ${
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

        {/* Save Result Feedback Banner */}
        {saveMessage && (
          <div className={`mt-4 p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            saveMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            {saveMessage.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
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
            Save & Activate
          </button>
        </div>
      </div>

      {/* Sending Pacing & Safeguards Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Pacing & Throttle Safeguards</h2>
            <p className="text-xs text-slate-400">Protects your Gmail sender domain reputation by ensuring randomized, human-like delivery.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Limit & Quota Type */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Gmail Account Type
            </label>
            <select
              value={quotaType}
              onChange={(e) => setQuotaType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="personal">Personal Gmail (@gmail.com) — Limit 500/day</option>
              <option value="workspace">Google Workspace (Custom Domain) — Limit 2,000/day</option>
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
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleSaveScheduleSettings}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all"
          >
            Save Safeguards
          </button>
        </div>
      </div>
    </div>
  );
}
