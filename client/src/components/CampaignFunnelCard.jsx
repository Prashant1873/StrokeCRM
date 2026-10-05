import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  RefreshCw, 
  Download, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  ChevronDown, 
  ChevronUp,
  Inbox,
  Sparkles,
  HelpCircle,
  Clock,
  XCircle,
  UserX,
  Tag
} from 'lucide-react';
import DeliverabilityBeacon from './common/DeliverabilityBeacon';

const SENTIMENT_CONFIG = {
  INTERESTED: {
    label: 'Interested',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Sparkles
  },
  QUESTION: {
    label: 'Question',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: HelpCircle
  },
  FOLLOW_UP: {
    label: 'Follow Up',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: Clock
  },
  NOT_INTERESTED: {
    label: 'Not Interested',
    badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    icon: XCircle
  },
  UNSUBSCRIBE: {
    label: 'Unsubscribe',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: UserX
  }
};

export default function CampaignFunnelCard({ campaign, queueStatus, onUpdate }) {
  const [funnelData, setFunnelData] = useState(null);
  const [replies, setReplies] = useState([]);
  const [bounces, setBounces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);
  const [showRepliesList, setShowRepliesList] = useState(false);
  const [showBouncesList, setShowBouncesList] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingBounces, setIsExportingBounces] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState('ALL');
  const [updatingReplyId, setUpdatingReplyId] = useState(null);

  const handleOverrideSentiment = async (reply, newSentiment) => {
    if (!campaign?.id || !reply) return;
    const recordId = reply.database_record_id || reply.contact_id;
    if (!recordId) return;

    setUpdatingReplyId(reply.id);
    const isContact = Boolean(reply.contact_id && !reply.database_record_id);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/records/${recordId}/sentiment${isContact ? '?isContact=true' : ''}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentiment: newSentiment })
      });
      const data = await res.json();
      if (data.success) {
        setReplies(prev => prev.map(r => {
          if (r.id === reply.id || (r.database_record_id && r.database_record_id === recordId) || (r.contact_id && r.contact_id === recordId)) {
            return {
              ...r,
              sentiment: newSentiment,
              sentiment_confidence: 1.0,
              sentiment_summary: `Manually set to ${newSentiment} by operator.`,
              sentiment_provider: 'manual'
            };
          }
          return r;
        }));
        if (onUpdate) onUpdate();
      } else {
        alert(data.message || 'Failed to update sentiment.');
      }
    } catch (err) {
      alert('Network error updating sentiment: ' + err.message);
    } finally {
      setUpdatingReplyId(null);
    }
  };

  const fetchFunnelAndReplies = async () => {
    if (!campaign?.id) return;
    try {
      setLoading(true);
      const [funnelRes, repliesRes, bouncesRes] = await Promise.all([
        fetch(`/api/campaigns/${campaign.id}/funnel-stats`),
        fetch(`/api/campaigns/${campaign.id}/replies`),
        fetch(`/api/campaigns/${campaign.id}/bounces`)
      ]);

      if (funnelRes.ok) {
        const fJson = await funnelRes.json();
        setFunnelData(fJson);
      }
      if (repliesRes.ok) {
        const rJson = await repliesRes.json();
        setReplies(Array.isArray(rJson) ? rJson : []);
      }
      if (bouncesRes.ok) {
        const bJson = await bouncesRes.json();
        setBounces(Array.isArray(bJson.records) ? bJson.records : []);
      }
    } catch (err) {
      console.warn('Failed to load funnel stats, replies or bounces:', err.message);
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
        const bCount = data.matchedBounces || 0;
        const bounceMsg = bCount > 0 ? `, ${bCount} delivery failures identified` : '';
        setScanNotice({
          type: 'success',
          text: `Scan complete: ${data.scanned || 0} messages checked. ${data.matchedReplies || 0} replies matched & disarmed${bounceMsg}, ${data.autoRepliesIgnored || 0} auto-replies filtered.`
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

  const handleExportBounces = async () => {
    if (!campaign?.id || isExportingBounces) return;
    setIsExportingBounces(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/export-bounces`);
      if (!response.ok) throw new Error('Export bounces failed.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign.id}-inaccurate-emails-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('CSV export error: ' + err.message);
    } finally {
      setIsExportingBounces(false);
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
    <div className="bg-surface border border-subtle rounded-xl overflow-hidden shadow-xs transition-all duration-200">
      {/* Header bar */}
      <div className="p-5 border-b border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-canvas">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <GitFork className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary tracking-wide">Sequence Conversion Funnel & Reply Radar</h3>
              <DeliverabilityBeacon preset="reply_disarm" />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                IMAP Auto-Disarm
              </span>
              {isScanning && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Live step-by-step conversion drop-offs, automatic IMAP reply halting, and full audit CSV reporting.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {bounces.length > 0 && (
            <button
              type="button"
              onClick={handleExportBounces}
              disabled={isExportingBounces}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/30 transition-all spring-press cursor-pointer"
              title="Export inaccurate and delivery-failed emails as CSV"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Export Inaccurate ({bounces.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleScanReplies}
            disabled={isScanning}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all spring-press disabled:opacity-50 cursor-pointer"
            title="Scan configured IMAP inbox for replies from active leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Inbox...' : 'Scan Inbound Replies'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-subtle hover:bg-surface text-primary text-xs font-semibold border border-subtle transition-all spring-press disabled:opacity-50 cursor-pointer"
            title="Export complete campaign contact audit trail as RFC 4180 CSV"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            {isExporting ? 'Generating...' : 'Export Audit CSV'}
          </button>
        </div>
      </div>

      {/* Scan Feedback Notice */}
      {scanNotice && (
        <div className={`mx-5 mt-4 p-3 rounded-lg border text-xs flex items-center justify-between ${
          scanNotice.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {scanNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{scanNotice.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setScanNotice(null)} 
            className="text-muted hover:text-primary text-xs font-bold px-1.5 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Visual Conversion Funnel Stages */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Stage 1: Audience */}
          <div className="bg-canvas border border-subtle rounded-xl p-3.5 relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[11px] text-secondary uppercase tracking-wider font-semibold mb-1">
              <span>1. Audience</span>
              <span className="text-muted font-mono">100%</span>
            </div>
            <div className="text-xl font-bold font-mono text-primary mb-2">{totalAudience}</div>
            <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="text-[10px] text-muted mt-2 block font-sans">
              Total prospect leads
            </span>
          </div>

          {/* Stage 2: Step 1 Dispatched */}
          <div className="bg-canvas border border-subtle rounded-xl p-3.5 relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold mb-1">
              <span>2. Step 1 Dispatched</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">{step1Rate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-primary mb-2">{step1Sent}</div>
            <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, step1Rate)}%` }} />
            </div>
            <span className="text-[10px] text-secondary mt-2 block font-sans">
              Initial contact dispatched
            </span>
          </div>

          {/* Stage 3: Step 2 Dispatched */}
          <div className="bg-canvas border border-subtle rounded-xl p-3.5 relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[11px] text-indigo-500 uppercase tracking-wider font-semibold mb-1">
              <span>3. Step 2 Dispatched</span>
              <span className="text-indigo-500 font-mono">{step2Rate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-primary mb-2">{step2Sent}</div>
            <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, step2Rate)}%` }} />
            </div>
            <span className="text-[10px] text-secondary mt-2 block font-sans">
              {step2Scheduled > 0 ? (
                <span className="text-amber-500 font-mono font-semibold">+{step2Scheduled} waiting cadence</span>
              ) : (
                'First follow-up sent'
              )}
            </span>
          </div>

          {/* Stage 4: Step 3 Dispatched */}
          <div className="bg-canvas border border-subtle rounded-xl p-3.5 relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold mb-1">
              <span>4. Step 3 Dispatched</span>
              <span className="text-purple-600 dark:text-purple-400 font-mono">{step3Rate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-primary mb-2">{step3Sent}</div>
            <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, step3Rate)}%` }} />
            </div>
            <span className="text-[10px] text-secondary mt-2 block font-sans">
              {step3Scheduled > 0 ? (
                <span className="text-amber-500 font-mono font-semibold">+{step3Scheduled} waiting cadence</span>
              ) : (
                'Final follow-up sent'
              )}
            </span>
          </div>

          {/* Stage 5: Inbound Replies */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold mb-1">
              <span>5. Replied (Disarmed)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{replyRate}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-300 mb-2">{repliedCount}</div>
            <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, replyRate)}%` }} />
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-2 block font-sans">
              Sequences auto-disarmed
            </span>
          </div>
        </div>

        {/* Funnel Drop-off Insights Bar */}
        <div className="p-3 bg-canvas border border-subtle rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-secondary">Total Inbound Replies:</span>
              <strong className="text-primary font-mono">{repliedCount}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-secondary">Net Reply Rate:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{replyRate}%</strong>
            </div>
            {autoReplies.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-secondary">Auto-Replies Filtered:</span>
                <strong className="text-amber-500 font-mono">{autoReplies.length}</strong>
              </div>
            )}
            {bounces.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-secondary">Delivery Failures:</span>
                <strong className="text-rose-600 dark:text-rose-400 font-mono">{bounces.length}</strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {bounces.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBouncesList(!showBouncesList)}
                className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{showBouncesList ? 'Hide Inaccurate Emails' : `Delivery Failures (${bounces.length})`}</span>
                {showBouncesList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowRepliesList(!showRepliesList)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{showRepliesList ? 'Hide Detected Replies' : `View Detected Replies (${humanReplies.length})`}</span>
              {showRepliesList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Delivery Failures / Inaccurate Emails Feed */}
        {showBouncesList && (
          <div className="border border-rose-500/30 rounded-xl overflow-hidden bg-surface divide-y divide-subtle animate-in fade-in duration-150">
            <div className="p-3 bg-rose-500/5 border-b border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-semibold text-primary">Inaccurate & Delivery-Failed Leads</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-mono font-medium">
                  {bounces.length} Bounced • Cadences Halted
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportBounces}
                disabled={isExportingBounces}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition-all spring-press cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                <span>{isExportingBounces ? 'Exporting...' : 'Export Inaccurate (CSV)'}</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-subtle">
              {bounces.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs font-sans">
                  No delivery failures recorded. All emails were accepted by remote mail exchangers.
                </div>
              ) : (
                bounces.map((b) => {
                  const bDate = b.bounced_at ? new Date(b.bounced_at) : null;
                  const dateFormatted = bDate
                    ? `${bDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${bDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Recent';

                  return (
                    <div key={b.id} className="p-3.5 hover:bg-subtle transition-colors flex flex-col gap-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <XCircle className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-primary truncate font-mono">{b.email}</span>
                              {b.first_name && (
                                <span className="text-secondary text-[11px]">({b.first_name} {b.company ? `@ ${b.company}` : ''})</span>
                              )}
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-sans font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                {b.bounce_type || 'HARD'} BOUNCE
                              </span>
                              {b.bounce_code && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-subtle text-secondary border border-subtle">
                                  Code: {b.bounce_code}
                                </span>
                              )}
                            </div>
                            {b.bounce_reason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono truncate mt-0.5" title={b.bounce_reason}>
                                {b.bounce_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono text-[11px] text-muted">
                          {dateFormatted}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Collapsible Detected Inbound Replies Feed */}
        {showRepliesList && (
          <div className="border border-subtle rounded-xl overflow-hidden bg-surface divide-y divide-subtle animate-in fade-in duration-150">
            <div className="p-3 bg-canvas border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Inbox className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-primary">Inbound Replies & AI Sentiment Radar</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-subtle text-secondary border border-subtle">
                  {humanReplies.length} Disarmed
                </span>
              </div>

              {/* 1-Click Sentiment Quick-Filter Tabs (SENT-06) */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {[
                  { id: 'ALL', label: 'All', count: humanReplies.length },
                  { id: 'INTERESTED', label: 'Interested', count: humanReplies.filter(r => (r.sentiment || '').toUpperCase() === 'INTERESTED').length },
                  { id: 'QUESTION', label: 'Questions', count: humanReplies.filter(r => (r.sentiment || 'QUESTION').toUpperCase() === 'QUESTION').length },
                  { id: 'FOLLOW_UP', label: 'Follow Up', count: humanReplies.filter(r => (r.sentiment || '').toUpperCase() === 'FOLLOW_UP').length },
                  { id: 'NOT_INTERESTED', label: 'Not Interested', count: humanReplies.filter(r => (r.sentiment || '').toUpperCase() === 'NOT_INTERESTED').length },
                  { id: 'UNSUBSCRIBE', label: 'Unsubscribe', count: humanReplies.filter(r => (r.sentiment || '').toUpperCase() === 'UNSUBSCRIBE').length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSentimentFilter(tab.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer whitespace-nowrap border ${
                      sentimentFilter === tab.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-canvas text-secondary hover:text-primary border-subtle'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="ml-1 opacity-70 font-mono">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-subtle">
              {humanReplies.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs font-sans">
                  No human replies recorded yet. Once a prospect replies to an email, their sequence will automatically halt here.
                </div>
              ) : humanReplies
                  .filter(r => {
                    if (sentimentFilter === 'ALL') return true;
                    return (r.sentiment || 'QUESTION').toUpperCase() === sentimentFilter;
                  })
                  .length === 0 ? (
                <div className="p-8 text-center text-muted text-xs font-sans">
                  No replies matching the "{sentimentFilter.toLowerCase().replace('_', ' ')}" sentiment filter.
                </div>
              ) : (
                humanReplies
                  .filter(r => {
                    if (sentimentFilter === 'ALL') return true;
                    return (r.sentiment || 'QUESTION').toUpperCase() === sentimentFilter;
                  })
                  .map((reply) => {
                    const replyDate = reply.received_at ? new Date(reply.received_at) : null;
                    const dateFormatted = replyDate 
                      ? `${replyDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${replyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Just now';

                    const rawSent = (reply.sentiment || 'QUESTION').toUpperCase();
                    const config = SENTIMENT_CONFIG[rawSent] || SENTIMENT_CONFIG.QUESTION;
                    const IconComp = config.icon;
                    const isUpdating = updatingReplyId === reply.id;

                    return (
                      <div key={reply.id} className="p-3.5 hover:bg-subtle transition-colors flex flex-col gap-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-primary truncate">{reply.sender_email}</span>
                                {reply.first_name && (
                                  <span className="text-secondary text-[11px]">({reply.first_name} {reply.company ? `@ ${reply.company}` : ''})</span>
                                )}
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-sans font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  Disarmed
                                </span>
                              </div>
                              <p className="text-[11px] text-secondary truncate mt-0.5 font-mono">
                                {reply.subject || 'Re: Outreach message'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono text-[11px] text-muted">
                            {dateFormatted}
                          </div>
                        </div>

                        {/* Sentiment Badge, Confidence & 1-Click Override Dropdown (SENT-05, SENT-07) */}
                        <div className="flex items-center justify-between gap-2 pl-9 pt-1 border-t border-subtle/40">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative group/sent inline-flex items-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${config.badgeClass}`}>
                                <IconComp className="w-3 h-3" />
                                <span>{config.label}</span>
                                {reply.sentiment_confidence && (
                                  <span className="text-[9px] opacity-75 font-mono">
                                    {Math.round(reply.sentiment_confidence * 100)}%
                                  </span>
                                )}
                              </span>

                              {/* Interactive Select for Manual Reclassification */}
                              <select
                                value={rawSent}
                                disabled={isUpdating}
                                onChange={(e) => handleOverrideSentiment(reply, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                title="Click to manually override or correct sentiment"
                              >
                                {Object.entries(SENTIMENT_CONFIG).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                            </div>

                            <span className="text-[10px] text-muted">
                              (Click to override)
                            </span>

                            {reply.sentiment_provider && (
                              <span className="text-[9px] text-muted font-mono">
                                • {reply.sentiment_provider === 'gemini_1.5_flash' ? 'Google Gemini 1.5' : reply.sentiment_provider === 'manual' ? 'Manual Override' : 'Offline Heuristic'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sentiment Summary Snippet */}
                        {reply.sentiment_summary && (
                          <div className="pl-9">
                            <p className="text-[11px] text-secondary italic font-sans bg-canvas/70 px-2.5 py-1 rounded border border-subtle/50">
                              "{reply.sentiment_summary}"
                            </p>
                          </div>
                        )}
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
