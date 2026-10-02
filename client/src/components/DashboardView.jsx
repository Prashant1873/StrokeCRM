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
  ShieldCheck,
  Download,
  Users,
  Split,
  BarChart2,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function DashboardView({ authStatus, setActiveTab }) {
  const [overview, setOverview] = useState({
    sentToday: 0,
    failedToday: 0,
    dailyCap: 100,
    hardLimit: 500,
    remainingToday: 100,
    lifetimeSent: 0,
    lifetimeFailed: 0,
    deliveryRate: 100,
    totalLeads: 0,
    pendingLeads: 0,
    activeCampaigns: 0,
    quotaType: 'personal'
  });

  const [dailyTimeline, setDailyTimeline] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, timelineRes, logsRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/daily'),
        fetch('/api/campaigns')
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setDailyTimeline(data);
      }
      if (logsRes.ok) {
        const camps = await logsRes.json();
        if (camps.length > 0) {
          const statusRes = await fetch(`/api/campaigns/${camps[0].id}/status`);
          if (statusRes.ok) {
            const status = await statusRes.json();
            setRecentLogs(status.recentLogs || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleExportAudit = () => {
    window.open('/api/analytics/export', '_blank');
  };

  const quotaPercent = Math.min(100, Math.round((overview.sentToday / overview.dailyCap) * 100));

  // Custom Recharts Dark Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-slate-200">{label}</p>
          <div className="flex items-center gap-2 text-indigo-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            <span>Sent: {payload[0].value} emails</span>
          </div>
          {payload[1] && payload[1].value > 0 && (
            <div className="flex items-center gap-2 text-rose-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Failed: {payload[1].value}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

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
                StrokeCRM needs your Gmail connection to dispatch cold emails directly from your personal or Google Workspace account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 transition-colors shrink-0 self-start sm:self-auto shadow-sm"
          >
            <span>Connect Gmail Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Welcome & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Outreach Command Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 font-semibold font-mono">
              Live
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time cold email pacing, day-wise send tracking, and Gmail deliverability monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportAudit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            title="Download full CSV of all sent and pending emails"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Audit CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Leads</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Campaign Cockpit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sent Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dispatched Today</span>
            <Send className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{overview.sentToday}</span>
            <span className="text-xs text-slate-500 font-mono">/ {overview.dailyCap} safe cap</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden border border-slate-800">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
            <span>{overview.remainingToday} remaining</span>
            <span>{quotaPercent}% cap used</span>
          </div>
        </div>

        {/* Sender Connection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gmail Sender</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white truncate font-mono">
            {authStatus?.connected ? authStatus.account?.email : 'Not Connected'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{authStatus?.connected ? 'SMTP Handshake Verified' : 'Awaiting Setup'}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Quota: {overview.hardLimit}/day ({overview.quotaType})
          </p>
        </div>

        {/* Lead Audience */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Contacts</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{overview.totalLeads}</span>
            <span className="text-xs text-slate-500">in database</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-2.5">
            <span className="text-amber-400 font-semibold font-mono">{overview.pendingLeads}</span>
            <span>pending queue</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold font-mono">{overview.lifetimeSent}</span>
            <span>sent</span>
          </div>
        </div>

        {/* Delivery Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivery Success</span>
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{overview.deliveryRate}%</div>
          <div className="text-xs text-slate-400 mt-2">
            {overview.lifetimeFailed === 0 
              ? 'Zero delivery failures reported' 
              : `${overview.lifetimeFailed} failed sends flagged`}
          </div>
        </div>
      </div>

      {/* Main Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day-Wise Sends Timeline Chart (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Day-Wise Outreach Volume (Last 14 Days)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily cold email dispatch tracking vs Gmail reputation safety thresholds.
              </p>
            </div>

            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
              Safe Cap: {overview.dailyCap}/day
            </span>
          </div>

          {/* Recharts Area / Bar Chart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="day" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#sentGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Quota Gauge & Throttle Summary (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Gmail Daily Quota Guard
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Prevents Google sending blocks and preserves domain reputation.
            </p>
          </div>

          {/* Visual Quota Gauge Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Today's Allowance</span>
              <span className="font-mono text-white font-bold">{overview.sentToday} / {overview.dailyCap}</span>
            </div>

            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Safe Daily Reserve</span>
              <span className="text-emerald-400 font-mono font-semibold">{overview.remainingToday} emails available</span>
            </div>
          </div>

          {/* Safeguard Specs */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
              <span>Account Quota Limit:</span>
              <span className="text-white font-mono">{overview.hardLimit} emails / day</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
              <span>Human Jitter Delay:</span>
              <span className="text-white font-mono">45s – 90s randomized</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
              <span>Sending Window:</span>
              <span className="text-white font-mono">09:00 – 18:00 Local</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-slate-400">
              <span>A/B Cohort Split:</span>
              <span className="text-indigo-400 font-semibold font-mono">50% A / 50% B</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className="w-full py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            Adjust Pacing & Throttle Limits
          </button>
        </div>
      </div>
    </div>
  );
}
