import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Zap, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function DashboardView({ authStatus, setActiveTab }) {
  const [stats, setStats] = useState({
    sentToday: 0,
    dailyLimit: 100,
    totalSent: 0,
    activeCampaigns: 0
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.daily_limit) {
          setStats(prev => ({ ...prev, dailyLimit: Number(data.daily_limit) }));
        }
      })
      .catch(() => {});
  }, []);

  const quotaPercent = Math.min(100, Math.round((stats.sentToday / stats.dailyLimit) * 100));

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 text-left">
      {/* Top Banner if not connected */}
      {!authStatus?.connected && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Gmail Account Not Connected</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                StrokeCRM needs your Gmail connection to dispatch cold emails directly from your account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 transition-colors shrink-0 self-start sm:self-auto"
          >
            <span>Connect Gmail Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Outreach Command Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 font-normal">
              v1.0
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time cold outreach metrics, pacing queue monitor, and Gmail quota tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('leads')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            Import Spreadsheet
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Sent Today</span>
            <Send className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.sentToday}</span>
            <span className="text-xs text-slate-500">/ {stats.dailyLimit} daily cap</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Sender</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {authStatus?.connected ? authStatus.account?.email : 'Not Connected'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{authStatus?.connected ? 'SMTP Handshake Verified' : 'Awaiting Setup'}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Queue Health</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-xs text-slate-500 mt-2">Emails pending in queue</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">A/B Experiments</span>
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white">Ready</div>
          <div className="text-xs text-slate-500 mt-2">50/50 Variant Splitter</div>
        </div>
      </div>

      {/* Quick Launchpad Steps */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Outreach Setup Checklist</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('settings')}
            className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-400">Step 1</span>
              {authStatus?.connected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Connect Gmail</h3>
            <p className="text-xs text-slate-400 mt-1">Configure your Google App Password for instant SMTP dispatch.</p>
          </div>

          <div 
            onClick={() => setActiveTab('leads')}
            className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Step 2</span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Import Leads</h3>
            <p className="text-xs text-slate-400 mt-1">Upload your .xlsx or .csv contacts sheet with custom headers.</p>
          </div>

          <div 
            onClick={() => setActiveTab('templates')}
            className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Step 3</span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Compose Template</h3>
            <p className="text-xs text-slate-400 mt-1">Insert variables like {"{{FirstName}}"} and run spam check.</p>
          </div>

          <div 
            onClick={() => setActiveTab('campaigns')}
            className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Step 4</span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Launch Paced Queue</h3>
            <p className="text-xs text-slate-400 mt-1">Start human-paced randomized delivery with daily cap protection.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
