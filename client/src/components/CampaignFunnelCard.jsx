import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  RefreshCw, 
  Download, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Inbox,
  ArrowRight,
  UserCheck,
  Ban,
  Mail
} from 'lucide-react';

export default function CampaignFunnelCard({ campaign, queueStatus, onUpdate }) {
  const [funnelData, setFunnelData] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);
  const [showRepliesList, setShowRepliesList] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchFunnelAndReplies = async () => {
    if (!campaign?.id) return;
    try {
      setLoading(true);
      const [funnelRes, repliesRes] = await Promise.all([
        fetch(`/api/campaigns/${campaign.id}/funnel-stats`),
        fetch(`/api/campaigns/${campaign.id}/replies`)
      ]);

      if (funnelRes.ok) {
        const fJson = await funnelRes.json();
        setFunnelData(fJson);
      }
      if (repliesRes.ok) {
        const rJson = await repliesRes.json();
        setReplies(Array.isArray(rJson) ? rJson : []);
      }
    } catch (err) {
      console.warn('Failed to load funnel stats or replies:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunnelAndReplies();
  }, [campaign?.id, queueStatus?.isRunning]);

  const handleScanReplies = async () => {
    if (!campaign?.id || isScanning) return;
    setIsScanning(true);
    setScanNotice(null);

    try {
      const res = await fetch('/api/replies/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, lookbackDays: 14 })
      });

      const data = await res.json();
      if (data.success) {
        setScanNotice({
          type: 'success',
          text: `Scan complete: ${data.scanned || 0} messages checked. ${data.matchedReplies || 0} replies matched & disarmed, ${data.autoRepliesIgnored || 0} auto-replies filtered.`
        });
        await fetchFunnelAndReplies();
        if (onUpdate) onUpdate();
      } else {
        setScanNotice({
          type: 'error',
          text: data.message || 'Scan failed. Check IMAP settings.'
        });
      }
    } catch (err) {
      setScanNotice({
        type: 'error',
        text: 'Failed to connect to IMAP server: ' + err.message
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportCsv = async () => {
    if (!campaign?.id || isExporting) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/export-audit`);
      if (!response.ok) throw new Error('Export request failed.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign.id}-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('CSV export error: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!campaign) return null;

  const totalAudience = funnelData?.totalAudience || campaign.total_contacts || 0;
  const step1Sent = funnelData?.step1Sent || campaign.sent_count || 0;
  const step2Sent = funnelData?.step2Sent || 0;
  const step3Sent = funnelData?.step3Sent || 0;
  const step2Scheduled = funnelData?.step2Scheduled || 0;
  const step3Scheduled = funnelData?.step3Scheduled || 0;
  const repliedCount = funnelData?.repliedCount || 0;

  const step1Rate = funnelData?.rates?.step1 || (totalAudience > 0 ? ((step1Sent / totalAudience) * 100).toFixed(1) : 0);
  const step2Rate = funnelData?.rates?.step2 || (step1Sent > 0 ? ((step2Sent / step1Sent) * 100).toFixed(1) : 0);
  const step3Rate = funnelData?.rates?.step3 || (step2Sent > 0 ? ((step3Sent / step2Sent) * 100).toFixed(1) : 0);
  const replyRate = funnelData?.rates?.reply || (step1Sent > 0 ? ((repliedCount / step1Sent) * 100).toFixed(1) : 0);

  const humanReplies = replies.filter(r => !r.is_auto_reply);
  const autoReplies = replies.filter(r => r.is_auto_reply);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <GitFork className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Sequence Conversion Funnel & Reply Radar</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                IMAP Auto-Disarm
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live step-by-step conversion drop-offs, automatic IMAP reply halting, and full audit CSV reporting.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleScanReplies}
            disabled={isScanning}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            title="Scan configured IMAP inbox for replies from active leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Inbox...' : 'Scan Inbound Replies'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
            title="Export complete campaign contact audit trail as RFC 4180 CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            {isExporting ? 'Generating...' : 'Export Audit CSV'}
          </button>
        </div>
      </div>

      {/* Scan Feedback Notice */}
      {scanNotice && (
        <div className={`mx-5 mt-4 p-3 rounded-lg border text-xs flex items-center justify-between ${
          scanNotice.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {scanNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{scanNotice.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setScanNotice(null)} 
            className="text-slate-400 hover:text-white text-xs font-bold px-1.5"
          >
            ×
          </button>
        </div>
      )}

      {/* Visual Conversion Funnel Stages */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Stage 1: Audience */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
              <span>1. Audience</span>
              <span className="text-slate-500 font-mono">100%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mb-2">{totalAudience}</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-full rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="text-[10px] text-slate-500 mt-2 block font-sans">
              Total audience leads
            </span>
          </div>

          {/* Stage 2: Step 1 Sent */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-1">
              <span>2. Step 1 Sent</span>
              <span className="text-indigo-400 font-mono">{step1Rate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mb-2">{step1Sent}</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, step1Rate)}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block font-sans">
              Initial contact delivered
            </span>
          </div>

          {/* Stage 3: Step 2 Follow-up */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-violet-400 uppercase tracking-wider font-semibold mb-1">
              <span>3. Step 2 Sent</span>
              <span className="text-violet-400 font-mono">{step2Rate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mb-2">{step2Sent}</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-violet-500 h-full rounded-full" style={{ width: `${Math.min(100, step2Rate)}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block font-sans">
              {step2Scheduled > 0 ? (
                <span className="text-amber-400 font-mono font-semibold">+{step2Scheduled} waiting delay</span>
              ) : (
                'First follow-up sent'
              )}
            </span>
          </div>

          {/* Stage 4: Step 3 Follow-up */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-purple-400 uppercase tracking-wider font-semibold mb-1">
              <span>4. Step 3 Sent</span>
              <span className="text-purple-400 font-mono">{step3Rate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mb-2">{step3Sent}</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, step3Rate)}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block font-sans">
              {step3Scheduled > 0 ? (
                <span className="text-amber-400 font-mono font-semibold">+{step3Scheduled} waiting delay</span>
              ) : (
                'Final follow-up sent'
              )}
            </span>
          </div>

          {/* Stage 5: Inbound Replies */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-emerald-400 uppercase tracking-wider font-semibold mb-1">
              <span>5. Replied</span>
              <span className="text-emerald-400 font-mono font-bold">{replyRate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mb-2">{repliedCount}</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, replyRate)}%` }} />
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-2 block font-sans">
              Sequences auto-disarmed
            </span>
          </div>
        </div>

        {/* Funnel Drop-off Insights Bar */}
        <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Total Replies:</span>
              <strong className="text-white font-mono">{repliedCount}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-slate-400">Net Reply Rate:</span>
              <strong className="text-emerald-400 font-mono">{replyRate}%</strong>
            </div>
            {autoReplies.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400">Auto-Replies Filtered:</span>
                <strong className="text-amber-400 font-mono">{autoReplies.length}</strong>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowRepliesList(!showRepliesList)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{showRepliesList ? 'Hide Detected Replies' : `View Detected Replies (${humanReplies.length})`}</span>
            {showRepliesList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Detected Inbound Replies Feed */}
        {showRepliesList && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800/40 animate-in fade-in duration-150">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Inbox className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-200">Inbound Replies & Disarm Log</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                  {humanReplies.length} Disarmed
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Recent IMAP Matches
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/40">
              {humanReplies.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-sans">
                  No human replies recorded yet. Once a lead replies to an email, their sequence will automatically halt here.
                </div>
              ) : (
                humanReplies.map((reply) => {
                  const replyDate = reply.received_at ? new Date(reply.received_at) : null;
                  const dateFormatted = replyDate 
                    ? `${replyDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${replyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Just now';

                  return (
                    <div key={reply.id} className="p-3 hover:bg-slate-900/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate">{reply.sender_email}</span>
                            {reply.first_name && (
                              <span className="text-slate-400 text-[11px]">({reply.first_name} {reply.company ? `@ ${reply.company}` : ''})</span>
                            )}
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-sans font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                              Disarmed
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                            {reply.subject || 'Re: Outreach message'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono text-[11px] text-slate-500">
                        {dateFormatted}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
