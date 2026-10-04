import React, { useState, useEffect } from 'react';
import { 
  Send, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Download, 
  Users, 
  BarChart2, 
  Database
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
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
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, timelineRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/daily')
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setDailyTimeline(data);
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

  // Custom Recharts Theme-Aware Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-subtle p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-primary">{label}</p>
          <div className="flex items-center gap-2 text-indigo-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            <span>Dispatched: {payload[0].value} emails</span>
          </div>
          {payload[1] && payload[1].value > 0 && (
            <div className="flex items-center gap-2 text-rose-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Failed: {payload[1].value}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const activeGatewayEmail = authStatus?.active_provider === 'custom_domain'
    ? (authStatus?.custom_domain?.sender_email || authStatus?.custom_domain?.user)
    : authStatus?.account?.email;

  const isGatewayConnected = authStatus?.connected;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 text-left">
      {/* Top Banner if not connected */}
      {!isGatewayConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">Outreach Gateway Not Connected</h3>
              <p className="text-xs text-secondary mt-0.5">
                StrokeCRM requires an email gateway connection to dispatch cold emails directly from your Gmail or custom domain SMTP account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab ? setActiveTab('settings') : null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-colors shrink-0 self-start sm:self-auto shadow-xs spring-press cursor-pointer"
          >
            <span>Connect Gateway Now</span>
          </button>
        </div>
      )}

      {/* Hero Welcome & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2.5">
            Outreach Command Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-subtle text-indigo-600 dark:text-indigo-400 border border-subtle font-semibold font-mono">
              Live
            </span>
          </h1>
          <p className="text-sm text-secondary mt-1">
            Real-time cold outreach pacing radar, day-wise volume analytics, and mailbox deliverability health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportAudit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-secondary hover:text-primary bg-surface hover:bg-subtle border border-subtle transition-colors spring-press cursor-pointer"
            title="Download full CSV of all sent and pending prospects"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export Audit CSV</span>
          </button>

          <button
            onClick={() => setActiveTab ? setActiveTab('databases') : null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-secondary hover:text-primary bg-surface hover:bg-subtle border border-subtle transition-colors spring-press cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Lead Audiences</span>
          </button>

          <button
            onClick={() => setActiveTab ? setActiveTab('campaigns') : null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all spring-press cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Campaign Cockpit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dispatched Today */}
        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Dispatched Today</span>
            <Send className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary font-mono">{overview.sentToday}</span>
            <span className="text-xs text-muted font-mono">/ {overview.dailyCap} safe cap</span>
          </div>
          <div className="w-full bg-subtle h-1.5 rounded-full mt-3 overflow-hidden border border-subtle">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted mt-1.5 font-mono">
            <span>{overview.remainingToday} remaining</span>
            <span>{quotaPercent}% cap used</span>
          </div>
        </div>

        {/* Sender Gateway Connection */}
        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Outreach Gateway</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-semibold text-primary truncate font-mono">
            {isGatewayConnected ? activeGatewayEmail : 'Not Connected'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isGatewayConnected ? 'Transport Verified' : 'Awaiting Setup'}</span>
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            Quota: {overview.hardLimit}/day ({overview.quotaType})
          </p>
        </div>

        {/* Lead Audience Contacts */}
        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Audience Contacts</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary font-mono">{overview.totalLeads}</span>
            <span className="text-xs text-muted">in audience</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary mt-2.5">
            <span className="text-amber-500 font-semibold font-mono">{overview.pendingLeads}</span>
            <span>pending queue</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">{overview.lifetimeSent}</span>
            <span>dispatched</span>
          </div>
        </div>

        {/* Delivery Health */}
        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Delivery Success</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-primary font-mono">{overview.deliveryRate}%</div>
          <div className="text-xs text-secondary mt-2">
            {overview.lifetimeFailed === 0 
              ? 'Zero delivery failures reported' 
              : `${overview.lifetimeFailed} failed dispatches flagged`}
          </div>
        </div>
      </div>

      {/* Main Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day-Wise Sends Timeline Chart (8 cols) */}
        <div className="lg:col-span-8 bg-surface border border-subtle rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-subtle pb-4">
            <div>
              <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                Day-Wise Outreach Volume (Last 14 Days)
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Daily cold email dispatch tracking vs mailbox reputation safety thresholds.
              </p>
            </div>

            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-canvas text-secondary border border-subtle">
              Safe Cap: {overview.dailyCap}/day
            </span>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis 
                  dataKey="day" 
                  stroke="currentColor" 
                  className="text-muted"
                  fontSize={11} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="currentColor" 
                  className="text-muted"
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
        <div className="lg:col-span-4 bg-surface border border-subtle rounded-xl p-6 shadow-xs space-y-5">
          <div className="border-b border-subtle pb-3">
            <h2 className="text-base font-semibold text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              Daily Quota Safeguard
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Prevents mail server throttling and preserves domain reputation.
            </p>
          </div>

          {/* Visual Quota Gauge Box */}
          <div className="bg-canvas p-4 rounded-xl border border-subtle text-center space-y-2">
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>Today's Allowance</span>
              <span className="font-mono text-primary font-bold">{overview.sentToday} / {overview.dailyCap}</span>
            </div>

            <div className="w-full bg-subtle h-3 rounded-full overflow-hidden border border-subtle p-0.5">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>

            <div className="text-[11px] text-secondary flex items-center justify-between pt-1">
              <span>Safe Daily Reserve</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{overview.remainingToday} emails available</span>
            </div>
          </div>

          {/* Safeguard Specs */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-subtle text-secondary">
              <span>Account Quota Limit:</span>
              <span className="text-primary font-mono">{overview.hardLimit} emails / day</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-subtle text-secondary">
              <span>Human Jitter Delay:</span>
              <span className="text-primary font-mono">45s – 90s randomized</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-subtle text-secondary">
              <span>Sending Window:</span>
              <span className="text-primary font-mono">09:00 – 18:00 Local</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-secondary">
              <span>A/B Cohort Split:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold font-mono">50% A / 50% B</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab ? setActiveTab('settings') : null}
            className="w-full py-2 rounded-lg text-xs font-semibold text-secondary hover:text-primary bg-subtle hover:bg-surface border border-subtle transition-colors spring-press cursor-pointer"
          >
            Adjust Pacing & Throttle Limits
          </button>
        </div>
      </div>
    </div>
  );
}
