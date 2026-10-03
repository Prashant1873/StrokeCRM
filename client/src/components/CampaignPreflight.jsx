import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  Send, 
  Zap, 
  Mail, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Play, 
  Users, 
  Database,
  FileCheck,
  RefreshCw,
  Globe
} from 'lucide-react';
import Switch from './common/Switch';

export default function CampaignPreflight({ campaignId, navigate, goBack }) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState(null);
  const [dailyQuota, setDailyQuota] = useState(null);

  // Sender Account Gateway
  const [senderProvider, setSenderProvider] = useState('default'); // 'default' | 'gmail_app_password' | 'custom_domain'

  // Preflight Option States
  const [enforceWorkingHours, setEnforceWorkingHours] = useState(true);
  const [pacingPreset, setPacingPreset] = useState('standard'); // 'conservative' | 'standard' | 'fast'
  const [autoStopOnQuota, setAutoStopOnQuota] = useState(true);

  // Test Email Preflight
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchPreflightData = async () => {
    try {
      setLoading(true);
      // 1. Fetch campaign details
      const campRes = await fetch(`/api/campaigns/${campaignId}`);
      if (campRes.ok) {
        const campData = await campRes.json();
        const activeCamp = campData.campaign || campData;
        setCampaign(activeCamp);
        if (activeCamp.sender_provider) {
          setSenderProvider(activeCamp.sender_provider);
        }
      } else {
        // Fallback: fetch all campaigns and match
        const allRes = await fetch('/api/campaigns');
        const allData = await allRes.json();
        const found = allData.find(c => String(c.id) === String(campaignId));
        setCampaign(found || null);
        if (found?.sender_provider) {
          setSenderProvider(found.sender_provider);
        }
      }

      // 2. Fetch auth status
      const authRes = await fetch('/api/auth/status');
      const authData = await authRes.json();
      setAuthStatus(authData);
      const defaultEmail = authData?.custom_domain?.sender_email || authData?.account?.email || '';
      if (defaultEmail && !testEmail) {
        setTestEmail(defaultEmail);
      }

      // 3. Fetch daily quota
      const quotaRes = await fetch('/api/analytics/daily');
      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        setDailyQuota(quotaData);
      }
    } catch (err) {
      console.error('Failed to load preflight data:', err);
      setErrorMessage('Failed to load preflight checks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreflightData();
  }, [campaignId]);

  const handleSendTestEmail = async () => {
    if (!testEmail || !campaignId) return;
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testRecipient: testEmail,
          sender_provider: senderProvider 
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: 'Test send failed: ' + err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaignId) return;
    setIsLaunching(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bypassHours: !enforceWorkingHours,
          sender_provider: senderProvider 
        })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || 'Failed to start campaign dispatch.');
      } else {
        // Navigate back to live campaign cockpit
        navigate(`#/campaigns/${campaignId}`);
      }
    } catch (err) {
      setErrorMessage('Dispatch error: ' + err.message);
    } finally {
      setIsLaunching(false);
    }
  };

  // Estimate completion time based on lead count and pacing
  const pendingLeads = campaign ? (campaign.total_contacts - (campaign.sent_count || 0)) : 0;
  const avgDelaySec = pacingPreset === 'conservative' ? 75 : pacingPreset === 'standard' ? 45 : 25;
  const estimatedMinutes = Math.max(1, Math.round((pendingLeads * avgDelaySec) / 60));

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
        <p className="text-sm font-medium">Running preflight diagnostics...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Campaign Not Found</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            The requested campaign does not exist or was removed.
          </p>
          <button
            onClick={() => navigate('#/campaigns')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            Return to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 text-left">
      {/* Top Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={goBack}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Return to Campaign"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Launch Preflight Cockpit
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Review delivery safeguards, configure timing rules, and verify credentials before unleashing outbound dispatch.
          </p>
        </div>

        {/* Campaign Identification Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <Send className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-white">{campaign.name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-mono font-medium">{pendingLeads} Pending Leads</span>
        </div>
      </div>

      {/* Error Feedback Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Preflight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Columns: Configurable Options & Switches */}
        <div className="md:col-span-2 space-y-6">
          {/* Sender Account Gateway Selection */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Outbound Sender Identity
                </h2>
              </div>
              <span className="text-[10px] text-slate-500">Sender for this campaign</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSenderProvider('default')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  senderProvider === 'default'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-inner'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-white">Default Gateway</div>
                <div className="text-[11px] text-indigo-400 mt-0.5 truncate">
                  {authStatus?.active_provider === 'custom_domain' ? 'Custom Domain' : 'Gmail App Password'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">From Global Settings</div>
              </button>

              <button
                type="button"
                onClick={() => setSenderProvider('gmail_app_password')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  senderProvider === 'gmail_app_password'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-inner'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-white">Gmail Account</div>
                <div className="text-[11px] text-indigo-400 mt-0.5 truncate">
                  {authStatus?.account?.email || 'Gmail SMTP'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">App Password Direct</div>
              </button>

              <button
                type="button"
                onClick={() => setSenderProvider('custom_domain')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  senderProvider === 'custom_domain'
                    ? 'bg-sky-600/15 border-sky-500/50 text-white shadow-inner'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-white">Custom Domain</div>
                <div className="text-[11px] text-sky-400 mt-0.5 truncate">
                  {authStatus?.custom_domain?.sender_email || authStatus?.custom_domain?.user || 'Custom SMTP'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Domain SMTP Relay</div>
              </button>
            </div>
          </div>

          {/* Working Hours Enforcement Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Timing & Schedule Control
              </h2>
            </div>

            {/* The Working Hours Toggle Switch */}
            <Switch
              id="enforce-working-hours"
              checked={enforceWorkingHours}
              onChange={setEnforceWorkingHours}
              label="Enforce Working Hours (9:00 AM - 6:00 PM)"
              description="Sends emails strictly within local daytime business hours to maximize reply rates and protect sender reputation."
              badge={enforceWorkingHours ? 'Safe Mode' : '24/7 Active'}
            />

            {!enforceWorkingHours && (
              <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Immediate 24/7 Dispatch Mode: </span>
                  <span>The queue will send continuously around the clock without pausing for nighttime or off-hours.</span>
                </div>
              </div>
            )}

            <div className="border-t border-slate-800/80 mt-4 pt-4">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Pacing Jitter Profile
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'conservative', label: 'Stealth', range: '60s - 120s', desc: 'Safest warmup' },
                  { id: 'standard', label: 'Standard', range: '30s - 75s', desc: 'Balanced human' },
                  { id: 'fast', label: 'Turbo', range: '15s - 35s', desc: 'High throughput' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPacingPreset(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      pacingPreset === preset.id
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-inner'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{preset.label}</div>
                    <div className="text-[11px] font-mono text-indigo-400 mt-0.5">{preset.range}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{preset.desc}</div>
                  </button>
                ))}
              </div>

              <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Estimated dispatch duration for {pendingLeads} leads:</span>
                <span className="font-mono text-slate-200 font-semibold">~{estimatedMinutes} minutes</span>
              </div>
            </div>
          </div>

          {/* Test Email Preflight Gate Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
              <Mail className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Preflight Test Email Gate
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Verify how your template merges live spreadsheet variables by sending a live test to your own inbox before dispatching to prospects.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !testEmail}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <Mail className="w-3.5 h-3.5" />}
                <span>Send Verification Test</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Health Checklist & Launch CTA */}
        <div className="space-y-6">
          {/* Preflight Health Checklist */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Preflight Health Checks
            </h3>

            <div className="space-y-3 text-xs">
              {/* Check 1: Outbound Sending Gateway */}
              {((senderProvider === 'custom_domain') || (senderProvider === 'default' && authStatus?.active_provider === 'custom_domain')) ? (
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  {authStatus?.custom_domain?.configured ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200">Custom Domain Gateway</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {authStatus?.custom_domain?.configured
                        ? `${authStatus.custom_domain.host}:${authStatus.custom_domain.port} (${authStatus.custom_domain.sender_email || authStatus.custom_domain.user})`
                        : 'Unconfigured — Configure in Settings'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  {authStatus?.account?.email ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200">Gmail Gateway</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {authStatus?.account?.email || 'Not connected — Configure in Settings'}
                    </div>
                  </div>
                </div>
              )}

              {/* Check 2: Daily Quota Headroom */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200">Daily Quota Headroom</div>
                  <div className="text-[11px] text-slate-400">
                    Safe limit (max 500 emails/day)
                  </div>
                </div>
              </div>

              {/* Check 3: Lead List Readiness */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                {pendingLeads > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200">Audience Queue</div>
                  <div className="text-[11px] text-slate-400">
                    {pendingLeads} contacts awaiting dispatch
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Launch Ignition Button Box */}
          <div className="bg-gradient-to-b from-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-lg space-y-4">
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Ready to Dispatch
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Queue state machine will process records atomically with zero duplicate sends.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLaunchCampaign}
              disabled={isLaunching || pendingLeads === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isLaunching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Igniting Engine...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Ignite Campaign Dispatch</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`#/campaigns/${campaignId}`)}
              className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel & Return to Cockpit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
