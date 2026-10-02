import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  ShieldCheck, 
  Sliders, 
  Zap, 
  FileText,
  AlertTriangle
} from 'lucide-react';

export default function CampaignsView({ setActiveTab }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Test email modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setCampaigns(data || []);
      if (data && data.length > 0 && !selectedCampaignId) {
        const campaignWithLeads = data.find(c => c.total_contacts > 0) || data[0];
        setSelectedCampaignId(campaignWithLeads.id);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch queue status for selected campaign
  const fetchQueueStatus = async () => {
    if (!selectedCampaignId) return;
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/status`);
      if (res.ok) {
        const data = await res.json();
        setQueueStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Poll status every 2 seconds when campaign is active
  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(() => {
      fetchQueueStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedCampaignId]);

  const handleStart = async (bypassHours = false) => {
    if (!selectedCampaignId) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/start`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassHours })
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: 'error', message: data.message });
      } else {
        setFeedback({ type: 'success', message: data.message || 'Campaign dispatch started.' });
      }
      fetchQueueStatus();
      fetchCampaigns();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to start campaign: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!selectedCampaignId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/pause`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'info', message: 'Campaign queue paused.' });
      }
      fetchQueueStatus();
      fetchCampaigns();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to pause: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!selectedCampaignId) return;
    if (confirm('Are you sure you want to stop this campaign? Any in-flight sends will be safely paused.')) {
      setActionLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${selectedCampaignId}/stop`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setFeedback({ type: 'info', message: 'Campaign stopped and reset to Draft.' });
        }
        fetchQueueStatus();
        fetchCampaigns();
      } catch (err) {
        setFeedback({ type: 'error', message: 'Failed to stop: ' + err.message });
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient || !selectedCampaignId) return;
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRecipient })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: 'Error: ' + err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
        <p className="text-xs">Loading campaigns...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-white">No Campaigns Created Yet</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Upload your lead spreadsheet first to automatically generate your first campaign.
          </p>
          <button
            onClick={() => setActiveTab('leads')}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
          >
            Upload Leads Spreadsheet Now
          </button>
        </div>
      </div>
    );
  }

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];
  const progressPercent = selectedCampaign.total_contacts > 0 
    ? Math.min(100, Math.round((selectedCampaign.sent_count / selectedCampaign.total_contacts) * 100))
    : 0;

  const onStartClick = () => {
    if (selectedCampaign.total_contacts === 0 || (queueStatus && queueStatus.pendingCount === 0)) {
      setFeedback({
        type: 'error',
        message: 'Cannot start campaign: There are 0 pending leads in this campaign. Upload leads in Leads tab first.'
      });
      return;
    }
    handleStart(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header and Campaign Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Campaign Dispatch Cockpit
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
              queueStatus?.isRunning
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                : queueStatus?.isPaused
                ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                : queueStatus?.isWaitingSchedule
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {queueStatus?.isRunning ? 'Live Pacing Active' : queueStatus?.isWaitingSchedule ? 'Waiting Schedule Window' : queueStatus?.status || 'Idle'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time human-paced cold dispatch engine with randomized jitter and pause/resume control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Campaign Dropdown */}
          <select
            value={selectedCampaignId || ''}
            onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.total_contacts} leads)
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span>Send Test to Myself</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : feedback.type === 'info'
            ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : feedback.type === 'info' ? (
              <Sliders className="w-4 h-4 shrink-0 text-indigo-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-slate-400 hover:text-white text-xs underline ml-4 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Schedule Window Waiting Banner */}
      {queueStatus?.isWaitingSchedule && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Sending Window Active: </span>
              <span>The queue is waiting for your configured schedule window to open.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleStart(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold whitespace-nowrap shadow-sm transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Send Now (Bypass Hours)</span>
          </button>
        </div>
      )}

      {/* Zero Leads Warning */}
      {selectedCampaign.total_contacts === 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>This campaign currently has no contacts. Import leads to enable cold dispatch.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shrink-0"
          >
            Upload Leads Spreadsheet
          </button>
        </div>
      )}

      {/* Main Dispatch Cockpit Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        {/* Controls Bar & Progress Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          {/* Left Stats */}
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">{selectedCampaign.name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{selectedCampaign.total_contacts} Total Leads</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{selectedCampaign.sent_count} Sent</span>
              <span>•</span>
              <span className="text-rose-400">{selectedCampaign.failed_count} Failed</span>
              <span>•</span>
              <span className="text-amber-400">{queueStatus?.pendingCount ?? selectedCampaign.total_contacts - selectedCampaign.sent_count} Pending</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {!queueStatus?.isRunning ? (
              <button
                type="button"
                onClick={onStartClick}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{queueStatus?.isPaused ? 'Resume Dispatch' : 'Start Campaign'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Queue</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop / Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Campaign Delivery Progress</span>
            <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live Pacing Radar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${
              queueStatus?.isRunning 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Next Email Pacing</span>
              {queueStatus?.isRunning ? (
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-mono font-bold text-white">
                    {queueStatus.secondsRemaining}s
                  </span>
                  <span className="text-[11px] text-slate-500">
                    (Random {queueStatus.delayDurationSec}s jitter)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 mt-1 block">Queue Idle</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Active Worker Status</span>
              <span className="text-xs font-semibold text-slate-200 mt-0.5 block truncate max-w-[200px]">
                {queueStatus?.lastLog || 'Ready to dispatch'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Gmail Sender Safeguard</span>
              <span className="text-xs text-emerald-400 font-semibold mt-0.5 block">
                Google Throttling Guard Active
              </span>
            </div>
          </div>
        </div>

        {/* Live Activity Log Stream */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Real-Time Send Audit Log</span>
            <span className="text-[11px] text-slate-500 font-mono">Last 10 Dispatches</span>
          </div>

          <div className="p-2 divide-y divide-slate-800/40 max-h-64 overflow-y-auto font-mono text-xs">
            {!queueStatus?.recentLogs || queueStatus.recentLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-sans">
                No emails dispatched yet for this campaign. Click "Start Campaign" to begin.
              </div>
            ) : (
              queueStatus.recentLogs.map((log) => (
                <div key={log.id} className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center gap-3">
                    {log.status === 'SENT' ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                    )}
                    <span className="text-slate-200 font-medium">{log.recipient_email}</span>
                    <span className="text-[10px] text-slate-500 truncate max-w-xs font-sans">
                      {log.subject}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      Variant {log.variant || 'A'}
                    </span>
                    <span>{new Date(log.sent_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Test Send Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                Send Instant Test Preview
              </h3>
              <button
                onClick={() => { setShowTestModal(false); setTestResult(null); }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Send 1 personalized preview email directly to your inbox through your connected Gmail account to inspect rendering.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Send Test Email To:
              </label>
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
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
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowTestModal(false); setTestResult(null); }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !testRecipient}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
