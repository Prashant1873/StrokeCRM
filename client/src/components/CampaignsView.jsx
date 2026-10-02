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
  AlertTriangle,
  Database,
  Lock,
  Unlock,
  Plus,
  Trash2,
  FileSpreadsheet,
  X,
  ArrowRight,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import CampaignPreflight from './CampaignPreflight';

function formatLogTime(dateStr) {
  if (!dateStr) return { formatted: 'Just now', relative: '', full: '' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { formatted: dateStr, relative: '', full: dateStr };
    
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStrFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    // Relative time
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    let relStr = '';
    if (diffSec < 5) relStr = 'just now';
    else if (diffSec < 60) relStr = `${diffSec}s ago`;
    else if (diffSec < 3600) relStr = `${Math.floor(diffSec / 60)}m ago`;
    else if (diffSec < 86400) relStr = `${Math.floor(diffSec / 3600)}h ago`;
    else relStr = `${Math.floor(diffSec / 86400)}d ago`;

    return {
      formatted: `${dateStrFormatted}, ${timeStr}`,
      relative: relStr,
      full: d.toLocaleString()
    };
  } catch (e) {
    return { formatted: dateStr, relative: '', full: dateStr };
  }
}

export default function CampaignsView({ setActiveTab, navigate, currentRoute, onCampaignSelected }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Available databases & templates for attachment
  const [databases, setDatabases] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Create Campaign Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDbId, setNewCampaignDbId] = useState('');
  const [newCampaignTmplId, setNewCampaignTmplId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Attach database dropdown state
  const [selectedAttachDbId, setSelectedAttachDbId] = useState('');
  const [isAttachingDb, setIsAttachingDb] = useState(false);

  // Attach template dropdown state
  const [selectedAttachTmplId, setSelectedAttachTmplId] = useState('');
  const [isAttachingTmpl, setIsAttachingTmpl] = useState(false);

  // Test email modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // CC / BCC per-campaign settings
  const [ccAddresses, setCcAddresses] = useState('');
  const [bccAddresses, setBccAddresses] = useState('');
  const [ccBccSaving, setCcBccSaving] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setCampaigns(data || []);
      if (data && data.length > 0 && !selectedCampaignId) {
        const campaignWithDb = data.find(c => c.database_id) || data[0];
        setSelectedCampaignId(campaignWithDb.id);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch databases & templates
  const fetchMetadata = async () => {
    try {
      const [dbRes, tmplRes] = await Promise.all([
        fetch('/api/databases'),
        fetch('/api/templates')
      ]);
      const dbData = await dbRes.json();
      const tmplData = await tmplRes.json();
      setDatabases(Array.isArray(dbData) ? dbData : []);
      setTemplates(Array.isArray(tmplData) ? tmplData : []);
    } catch (err) {
      console.error('Failed to load metadata:', err);
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
    fetchMetadata();
  }, []);

  // Poll status every 2 seconds when campaign is active
  useEffect(() => {
    setQueueStatus(null);
    fetchQueueStatus();
    let tick = 0;
    const interval = setInterval(() => {
      fetchQueueStatus();
      tick++;
      // Every 3rd cycle (6s), re-fetch campaigns to keep sidebar and list synced
      if (tick % 3 === 0) {
        fetchCampaigns();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedCampaignId]);

  // Sync selected campaign with route params
  useEffect(() => {
    if (currentRoute?.params?.id) {
      setSelectedCampaignId(Number(currentRoute.params.id));
    }
  }, [currentRoute?.params?.id]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0] || null;

  // Sync CC / BCC inputs when selected campaign changes
  useEffect(() => {
    setCcAddresses(selectedCampaign?.cc_addresses || '');
    setBccAddresses(selectedCampaign?.bcc_addresses || '');
  }, [selectedCampaign?.id]);

  useEffect(() => {
    if (selectedCampaign && onCampaignSelected) {
      onCampaignSelected(selectedCampaign);
    }
  }, [selectedCampaign?.id, selectedCampaign?.name, onCampaignSelected]);

  const handleStart = async (bypassHours = false) => {
    const targetId = selectedCampaignId || selectedCampaign?.id;
    if (!targetId) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${targetId}/start`, { 
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
    const targetId = selectedCampaignId || selectedCampaign?.id;
    if (!targetId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${targetId}/pause`, { method: 'POST' });
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

  const handleResume = async () => {
    const targetId = selectedCampaignId || selectedCampaign?.id;
    if (!targetId) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${targetId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassHours: true })
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: 'error', message: data.message });
      } else {
        setFeedback({ type: 'success', message: data.message || 'Campaign dispatch resumed.' });
      }
      fetchQueueStatus();
      fetchCampaigns();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to resume: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    const targetId = selectedCampaignId || selectedCampaign?.id;
    if (!targetId) return;
    if (confirm('Are you sure you want to stop this campaign? Any in-flight sends will be safely paused.')) {
      setActionLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${targetId}/stop`, { method: 'POST' });
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

  const handleAttachTemplate = async () => {
    if (!selectedAttachTmplId || !selectedCampaignId) return;
    setIsAttachingTmpl(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/attach-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: Number(selectedAttachTmplId) })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setSelectedAttachTmplId('');
        await fetchCampaigns();
        await fetchMetadata();
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Attach error: ' + err.message });
    } finally {
      setIsAttachingTmpl(false);
    }
  };

  const handleAttachDatabase = async () => {
    if (!selectedAttachDbId || !selectedCampaignId) return;
    setIsAttachingDb(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/attach-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId: Number(selectedAttachDbId) })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        fetchCampaigns();
        fetchMetadata();
        setSelectedAttachDbId('');
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Attach error: ' + err.message });
    } finally {
      setIsAttachingDb(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaignName.trim(),
          database_id: newCampaignDbId ? Number(newCampaignDbId) : null,
          template_id: newCampaignTmplId ? Number(newCampaignTmplId) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewCampaignName('');
        setNewCampaignDbId('');
        setNewCampaignTmplId('');
        await fetchCampaigns();
        await fetchMetadata();
        if (data.campaignId) {
          setSelectedCampaignId(data.campaignId);
          setShowCreateModal(false);
          if (navigate) navigate(`#/campaigns/${data.campaignId}`);
        }
        setFeedback({ type: 'success', message: 'Campaign created successfully with Triad binding!' });
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to create campaign: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaignId) return;
    if (!confirm(`Are you sure you want to delete campaign "${selectedCampaign.name}"? Any attached database will be released and made available for future campaigns.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'info', message: 'Campaign deleted and database released.' });
        setSelectedCampaignId(null);
        await fetchCampaigns();
        await fetchMetadata();
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Delete error: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete by explicit id (used by directory cards)
  const handleDeleteCampaignById = async (id, name) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'info', message: `"${name}" deleted. Database released.` });
        if (selectedCampaignId === id) setSelectedCampaignId(null);
        await fetchCampaigns();
        await fetchMetadata();
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Delete error: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCcBcc = async () => {
    const id = selectedCampaign?.id;
    if (!id) return;
    setCcBccSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/cc-bcc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc_addresses: ccAddresses, bcc_addresses: bccAddresses })
      });
      const data = await res.json();
      if (data.success) {
        setCcAddresses(data.cc_addresses || '');
        setBccAddresses(data.bcc_addresses || '');
        setFeedback({ type: 'success', message: data.message || 'CC/BCC saved.' });
        await fetchCampaigns();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Could not save CC/BCC.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setCcBccSaving(false);
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

  const onStartClick = () => {
    if (!selectedCampaign || (selectedCampaign.total_contacts === 0 && (!queueStatus || queueStatus.totalContacts === 0))) {
      setFeedback({
        type: 'error',
        message: 'Cannot start campaign: Please attach an active database with contacts.'
      });
      return;
    }
    if (queueStatus && queueStatus.pendingCount === 0 && queueStatus.totalContacts > 0) {
      setFeedback({
        type: 'info',
        message: 'All contacts in this campaign have already been processed.'
      });
      return;
    }
    if (queueStatus?.isPaused || activeStatus === 'PAUSED' || (!queueStatus?.isRunning && activeStatus === 'RUNNING')) {
      handleResume();
    } else {
      if (navigate) {
        navigate(`#/campaigns/${selectedCampaign.id}/preflight`);
      } else {
        handleStart(false);
      }
    }
  };

  // Safe early returns AFTER all hooks are evaluated
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
        <p className="text-xs">Loading campaigns...</p>
      </div>
    );
  }

  // ── CAMPAIGNS DIRECTORY (hub page at #/campaigns) ──────────────────────
  if (currentRoute?.name === 'campaigns') {
    const statusColor = (s) => {
      if (s === 'RUNNING') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      if (s === 'COMPLETED') return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      if (s === 'PAUSED') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      return 'bg-slate-800 text-slate-400 border-slate-700';
    };

    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Send className="w-6 h-6 text-indigo-400" />
              Campaigns
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
              &nbsp;·&nbsp;1&nbsp;Campaign = 1&nbsp;Database = 1&nbsp;Template
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Plus className="w-3.5 h-3.5" />
            New Campaign
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : feedback.type === 'info' ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}>
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-4">Dismiss</button>
          </div>
        )}

        {/* Campaign Grid / Empty State */}
        {campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Campaigns Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              StrokeCRM organises cold outreach through a clean 1:1:1 Triad — 1 Campaign binds exactly 1 Database and 1 Template.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map(c => {
              const sent = c.sent_count || 0;
              const total = c.total_contacts || 0;
              const failed = c.failed_count || 0;
              const pending = Math.max(0, total - sent - failed);
              const progress = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
              const status = c.status || 'DRAFT';
              return (
                <div
                  key={c.id}
                  className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/30"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                      {c.created_at && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Created {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${statusColor(status)}`}>
                      {status}
                    </span>
                  </div>

                  {/* Triad Binding */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.database_id ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                      <span className="text-slate-500">DB:</span>
                      <span className={`truncate font-medium ${c.database_id ? 'text-slate-200' : 'text-amber-400'}`}>
                        {c.database_name || 'Not attached'}
                      </span>
                      {c.database_id && <Lock className="w-2.5 h-2.5 text-indigo-400 ml-auto shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.template_id ? 'bg-violet-400' : 'bg-slate-600'}`} />
                      <span className="text-slate-500">Template:</span>
                      <span className={`truncate font-medium ${c.template_id ? 'text-slate-200' : 'text-amber-400'}`}>
                        {c.template_name || 'Not attached'}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{sent} sent · {failed} failed · {pending} pending</span>
                      <span className="text-indigo-400 font-mono font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600">{total} contacts bound</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        if (confirm(`Delete "${c.name}"? The attached database will be released.`)) {
                          handleDeleteCampaignById(c.id, c.name);
                        }
                      }}
                      className="text-[11px] text-slate-600 hover:text-rose-400 flex items-center gap-1 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate && navigate(`#/campaigns/${c.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition-all border border-indigo-500/20 hover:border-transparent"
                    >
                      Open Cockpit
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Create Campaign (1:1 Triad)</h3>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">1. Campaign Name *</label>
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
                    placeholder="e.g., Q4 Enterprise Founders"
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">2. Attach Database (1:1 Exclusive)</label>
                  <select
                    value={newCampaignDbId}
                    onChange={(e) => setNewCampaignDbId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Attach Later / Pick Available Database --</option>
                    {databases.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.row_count} contacts){d.is_attached && d.campaign_name ? ` — used in ${d.campaign_name}` : ''}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">A list can be used again. This campaign starts from the first row, not from the last send.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">3. Attach Template</label>
                  <select
                    value={newCampaignTmplId}
                    onChange={(e) => setNewCampaignTmplId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Default Introduction Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
                <button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={isCreating || !newCampaignName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isCreating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Creating...</> : <><CheckCircle2 className="w-3.5 h-3.5" />Create & Open Cockpit</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Preflight route check
  if (currentRoute?.name === 'campaign-preflight') {
    return (
      <CampaignPreflight 
        campaignId={currentRoute.params?.id || selectedCampaignId}
        navigate={navigate}
        goBack={() => navigate ? navigate(`#/campaigns/${selectedCampaignId || ''}`) : null}
      />
    );
  }

  const activeStatus = queueStatus?.status || selectedCampaign?.status || 'DRAFT';
  const totalContacts = queueStatus?.totalContacts ?? selectedCampaign?.total_contacts ?? 0;
  const sentCount = queueStatus?.sentCount ?? selectedCampaign?.sent_count ?? 0;
  const failedCount = queueStatus?.failedCount ?? selectedCampaign?.failed_count ?? 0;
  const pendingCount = queueStatus?.pendingCount ?? Math.max(0, totalContacts - sentCount - failedCount);
  const progressPercent = totalContacts > 0 
    ? Math.min(100, Math.round((sentCount / totalContacts) * 100))
    : 0;

  // Unattached databases available for 1:1 binding
  const availableDatabases = databases.filter(d => !d.campaign_id || Number(d.campaign_id) !== Number(selectedCampaignId));

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Cockpit Header with back navigation */}
      <div className="border-b border-slate-800 pb-5 space-y-3">
        <button
          type="button"
          onClick={() => navigate && navigate('#/campaigns')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          All Campaigns
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              {selectedCampaign?.name || 'Campaign Cockpit'}
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                queueStatus?.isRunning
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                  : activeStatus === 'COMPLETED'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : queueStatus?.isPaused || activeStatus === 'PAUSED'
                  ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                  : queueStatus?.isWaitingSchedule
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {queueStatus?.isRunning ? 'Live' : activeStatus === 'COMPLETED' ? '✓ Complete' : queueStatus?.isWaitingSchedule ? 'Scheduled' : activeStatus}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">1:1:1 Triad — 1 Campaign · 1 Database · 1 Template</p>
          </div>
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            disabled={!selectedCampaign}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            Send Test Email
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

      {/* Empty State if no campaigns */}
      {(!selectedCampaign || campaigns.length === 0) ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Send className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Campaigns Created Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            StrokeCRM organizes cold outreach through a clean 1:1:1 Triad: 1 Campaign binds exactly 1 isolated Database and 1 Template.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <>
          {/* THE 1:1:1 TRIAD ARCHITECTURE COCKPIT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PILLAR 1: ATTACHED DATABASE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">1. Attached Database</span>
                  </div>
                  {selectedCampaign.database_id ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      <Lock className="w-2.5 h-2.5" />
                      1:1 Dedicated
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Unattached
                    </span>
                  )}
                </div>

                {selectedCampaign.database_id ? (
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{selectedCampaign.database_name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{selectedCampaign.database_filename} ({selectedCampaign.total_contacts} contacts)</p>
                    </div>

                    {/* Header schema pills */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                        Isolated Dynamic Headers:
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {Array.isArray(selectedCampaign.database_headers) && selectedCampaign.database_headers.slice(0, 5).map((h, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-950 text-indigo-300 border border-slate-800">
                            {`{{${h}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-amber-300/80">
                      This campaign requires an isolated database file to dispatch emails.
                    </p>
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedAttachDbId}
                        onChange={(e) => setSelectedAttachDbId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Select Available Database --</option>
                        {availableDatabases.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.row_count} contacts){d.is_attached && d.campaign_name ? ` — used in ${d.campaign_name}` : ''}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAttachDatabase}
                          disabled={!selectedAttachDbId || isAttachingDb}
                          className="flex-1 py-1 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          {isAttachingDb ? 'Attaching...' : 'Attach Database'}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate ? navigate('#/databases') : null}
                          className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                          title="Upload a new database"
                        >
                          + Upload
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedCampaign.database_id && (
                <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Exclusively bound</span>
                  <button
                    type="button"
                    onClick={() => navigate ? navigate(`#/databases/${selectedCampaign.database_id}`) : null}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Inspect Records <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* PILLAR 2: ATTACHED TEMPLATE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">2. Attached Template</span>
                  </div>
                  {selectedCampaign.template_id ? (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {selectedCampaign.is_ab_test ? 'A/B Split' : 'Single'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Unattached
                    </span>
                  )}
                </div>

                {selectedCampaign.template_id ? (
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white truncate">
                        {selectedCampaign.template_name || 'Campaign Template'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        Subject: "{selectedCampaign.subject_a || '(No subject set)'}"
                      </p>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 max-h-20 overflow-y-auto">
                      <p className="text-[11px] text-slate-300 whitespace-pre-wrap line-clamp-3 font-sans">
                        {selectedCampaign.body_a || 'No email body text configured yet.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-amber-300/80">
                      Attach an email template to define the message sent to contacts.
                    </p>
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedAttachTmplId}
                        onChange={(e) => setSelectedAttachTmplId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        <option value="">-- Select Template --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAttachTemplate}
                          disabled={!selectedAttachTmplId || isAttachingTmpl}
                          className="flex-1 py-1 px-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          {isAttachingTmpl ? 'Attaching...' : 'Attach Template'}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate && navigate('#/templates/new')}
                          className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                          title="Create a new template"
                        >
                          + New
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {selectedCampaign.template_id ? 'Spam Check Ready' : 'Template required to dispatch'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate && navigate(
                    selectedCampaign.template_id ? `#/templates/${selectedCampaign.template_id}` : '#/templates'
                  )}
                  className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  {selectedCampaign.template_id ? 'Edit Template' : 'Browse Templates'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* PILLAR 3: DISPATCH ENGINE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">3. Dispatch Status</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    activeStatus === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                    activeStatus === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    activeStatus === 'PAUSED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {activeStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sent / Total</span>
                    <span className="font-semibold text-white">{sentCount} / {totalContacts}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Next Pacing</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {queueStatus?.isRunning ? `${queueStatus.secondsRemaining}s` : 'Idle'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 truncate">
                  Log: <span className="text-slate-300 font-mono">{queueStatus?.lastLog || 'Awaiting launch command'}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDeleteCampaign}
                  className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  title="Delete campaign and release attached database"
                >
                  <Trash2 className="w-3 h-3" /> Delete Campaign
                </button>

                <button
                  type="button"
                  onClick={() => navigate ? navigate(`#/campaigns/${selectedCampaign.id}/preflight`) : null}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  Preflight Gates <Sliders className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* CC / BCC SETTINGS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex items-center gap-2 shrink-0 w-32">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">CC / BCC</span>
              </div>
              <div className="flex flex-1 flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">CC (comma-separated)</label>
                  <input
                    type="text"
                    value={ccAddresses}
                    onChange={(e) => setCcAddresses(e.target.value)}
                    placeholder="cc@example.com, another@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">BCC (comma-separated)</label>
                  <input
                    type="text"
                    value={bccAddresses}
                    onChange={(e) => setBccAddresses(e.target.value)}
                    placeholder="bcc@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  />
                </div>
                <button
                  type="button"
                  disabled={ccBccSaving}
                  onClick={handleSaveCcBcc}
                  className="self-end flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  {ccBccSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-2.5 ml-0 sm:ml-36">
              Every email in this campaign will CC/BCC the addresses above. Leave blank to send to recipient only.
            </p>
          </div>

          {/* MAIN EXECUTION COCKPIT CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            {/* Controls Bar & Progress Summary */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">{selectedCampaign.name}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{totalContacts} Contacts Bound</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{sentCount} Sent</span>
                  <span>•</span>
                  <span className="text-rose-400">{failedCount} Failed</span>
                  <span>•</span>
                  <span className="text-amber-400">{pendingCount} Pending</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate ? navigate(`#/campaigns/${selectedCampaign.id}/preflight`) : null}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Preflight Controls</span>
                </button>

                {!queueStatus?.isRunning ? (
                  <button
                    type="button"
                    onClick={onStartClick}
                    disabled={actionLoading || (activeStatus === 'COMPLETED' && pendingCount === 0)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{activeStatus === 'COMPLETED' ? 'Campaign Complete' : ((queueStatus?.isPaused || activeStatus === 'PAUSED') ? 'Resume Dispatch' : 'Start Campaign')}</span>
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
                <span className="font-semibold text-slate-300">Audience Delivery Progress</span>
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
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    {queueStatus?.isRunning && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${queueStatus?.isRunning ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  </span>
                  <span className="font-semibold text-slate-200">Real-Time Send Audit Log</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                    {queueStatus?.recentLogs ? queueStatus.recentLogs.length : 0} Recorded
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">Live Stream</span>
                  <button 
                    type="button"
                    onClick={() => { fetchQueueStatus(); fetchCampaigns(); }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Force Refresh Logs"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-2 divide-y divide-slate-800/40 max-h-72 overflow-y-auto font-mono text-xs">
                {!queueStatus?.recentLogs || queueStatus.recentLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-sans">
                    No emails dispatched yet for this campaign. Click "Start Campaign" to begin.
                  </div>
                ) : (
                  queueStatus.recentLogs.map((log) => {
                    const timeInfo = formatLogTime(log.sent_at);
                    return (
                      <div key={log.id} className="py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/50 transition-colors rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          {log.status === 'SENT' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0" title="Delivered via Gmail SMTP">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0" title={log.error_message || 'Dispatch Failed'}>
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-100 font-semibold truncate text-xs">{log.recipient_email}</span>
                              <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-sans font-bold border ${
                                log.status === 'SENT' 
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                              }`}>
                                {log.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 truncate block font-sans">
                              {log.subject || '(No Subject)'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 shrink-0 self-end sm:self-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800">
                            Variant {log.variant || 'A'}
                          </span>
                          <div className="text-right flex flex-col items-end" title={timeInfo.full}>
                            <span className="text-slate-300 font-mono text-[11px]">{timeInfo.formatted}</span>
                            {timeInfo.relative && (
                              <span className="text-[10px] text-slate-500 font-sans">({timeInfo.relative})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3-STEP CAMPAIGN CREATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Create Campaign (1:1 Triad Setup)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  1. Campaign Name *
                </label>
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g., Q4 Enterprise Founders"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  2. Attach Database (1:1 Exclusivity)
                </label>
                <select
                  value={newCampaignDbId}
                  onChange={(e) => setNewCampaignDbId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Attach Later / Pick Available Database --</option>
                  {databases.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.row_count} contacts){d.is_attached && d.campaign_name ? ` — used in ${d.campaign_name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  A list can be used again. This campaign starts from the first row, not from the last send.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  3. Attach Template
                </label>
                <select
                  value={newCampaignTmplId}
                  onChange={(e) => setNewCampaignTmplId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Default Introduction Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={isCreating || !newCampaignName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Creating Triad...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Create Campaign & Bind
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {(selectedCampaign?.cc_addresses?.trim() || selectedCampaign?.bcc_addresses?.trim()) && (
              <p className="text-[11px] text-amber-300/90">
                Saved CC/BCC on this campaign is included on this preview.
              </p>
            )}

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
