import React, { useState, useEffect } from 'react';
import { 
  Split, 
  TrendingUp, 
  BarChart2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Sparkles, 
  Tag, 
  Sliders, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Send,
  ArrowRight
} from 'lucide-react';

export default function ABTestingView({ setActiveTab }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [abStats, setAbStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isAbTest, setIsAbTest] = useState(true);
  const [subjectA, setSubjectA] = useState('');
  const [bodyA, setBodyA] = useState('');
  const [subjectB, setSubjectB] = useState('');
  const [bodyB, setBodyB] = useState('');

  // UI state
  const [activeTabVariant, setActiveTabVariant] = useState('split'); // 'split' | 'A' | 'B'
  const [isSaving, setIsSaving] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const availableVariables = ['FirstName', 'LastName', 'Email', 'Company', 'Role', 'City'];

  // Fetch campaigns
  useEffect(() => {
    fetch('/api/campaigns')
      .then(res => res.json())
      .then(data => {
        setCampaigns(data || []);
        if (data && data.length > 0) {
          setSelectedCampaignId(data[0].id);
        }
      })
      .catch(err => console.error('Failed to load campaigns:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch A/B stats when campaign changes
  const fetchAbStats = async () => {
    if (!selectedCampaignId) return;
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/ab-stats`);
      if (res.ok) {
        const data = await res.json();
        setAbStats(data);
        setIsAbTest(data.is_ab_test ?? true);
        setSubjectA(data.variantA.subject || 'Quick question regarding {{Company}}');
        setBodyA(data.variantA.body || 'Hi {{FirstName}},\n\nWanted to reach out to see how your team handles cold outreach. Would love to share ideas.\n\nBest,\nFounder');
        setSubjectB(data.variantB.subject || 'Idea for {{FirstName}} & {{Company}}');
        setBodyB(data.variantB.body || 'Hey {{FirstName}},\n\nSaw what you are building at {{Company}}. We built a free local CRM for Gmail that founders love.\n\nAre you free for a quick chat next week?');
      }
    } catch (err) {
      console.error('Failed to load AB stats:', err);
    }
  };

  useEffect(() => {
    fetchAbStats();
  }, [selectedCampaignId]);

  const handleSplitCohorts = async () => {
    if (!selectedCampaignId) return;
    setIsSplitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/ab-split`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', text: data.message });
        fetchAbStats();
      } else {
        setFeedback({ type: 'error', text: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSplitting(false);
    }
  };

  const handleSaveAB = async () => {
    if (!selectedCampaignId) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/ab-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_ab_test: isAbTest ? 1 : 0,
          subject_a: subjectA,
          body_a: bodyA,
          subject_b: subjectB,
          body_b: bodyB
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', text: data.message });
        fetchAbStats();
      } else {
        setFeedback({ type: 'error', text: data.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
        <p className="text-xs">Loading A/B testing studio...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            A/B Testing Experiments
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-pink-400 font-semibold border border-pink-500/20">
              50/50 Split
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Test different subject lines and message angles across equal cohorts to optimize cold reply rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            type="button"
            onClick={handleSplitCohorts}
            disabled={isSplitting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-pink-300 bg-pink-950/40 hover:bg-pink-900/40 border border-pink-500/30 transition-colors disabled:opacity-50"
            title="Automatically assigns 50% of contacts to Variant A and 50% to Variant B"
          >
            {isSplitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Split className="w-3.5 h-3.5" />}
            <span>Re-balance 50/50</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAB}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Variants'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Cohort Comparative Performance Scorecards */}
      {abStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Variant A Scorecard */}
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                  A
                </span>
                <h3 className="text-sm font-bold text-white">Cohort Variant A</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                {abStats.variantA.total} Leads Assigned (50%)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Sent</span>
                <div className="text-lg font-bold text-emerald-400 font-mono">{abStats.variantA.sent}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Spam Score</span>
                <div className="text-lg font-bold text-indigo-400 font-mono">{abStats.variantA.spamScore}%</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Words</span>
                <div className="text-lg font-bold text-white font-mono">{abStats.variantA.wordCount}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">Subject Angle A:</span>
              <p className="text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80 truncate font-sans">
                {subjectA || '(No subject)'}
              </p>
            </div>
          </div>

          {/* Variant B Scorecard */}
          <div className="bg-slate-900 border border-pink-500/30 rounded-xl p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-pink-500/20 text-pink-400 font-bold text-xs flex items-center justify-center border border-pink-500/30">
                  B
                </span>
                <h3 className="text-sm font-bold text-white">Cohort Variant B</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                {abStats.variantB.total} Leads Assigned (50%)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Sent</span>
                <div className="text-lg font-bold text-emerald-400 font-mono">{abStats.variantB.sent}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Spam Score</span>
                <div className="text-lg font-bold text-pink-400 font-mono">{abStats.variantB.spamScore}%</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Words</span>
                <div className="text-lg font-bold text-white font-mono">{abStats.variantB.wordCount}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 font-semibold block text-[11px]">Subject Angle B:</span>
              <p className="text-slate-200 bg-slate-950 p-2 rounded border border-slate-800/80 truncate font-sans">
                {subjectB || '(No subject)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Dual Variant Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor A */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span>●</span> Variant A (Control Copy)
            </span>
            <div className="flex gap-1">
              {['FirstName', 'Company'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBodyA(prev => prev + ` {{${v}}}`)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-indigo-300 font-mono hover:border-indigo-500/50"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Line A</label>
            <input
              type="text"
              value={subjectA}
              onChange={(e) => setSubjectA(e.target.value)}
              placeholder="Subject line for variant A..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Body A</label>
            <textarea
              rows={9}
              value={bodyA}
              onChange={(e) => setBodyA(e.target.value)}
              placeholder="Email body for variant A..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        </div>

        {/* Editor B */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <span>●</span> Variant B (Challenger Copy)
            </span>
            <div className="flex gap-1">
              {['FirstName', 'Company'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBodyB(prev => prev + ` {{${v}}}`)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-pink-300 font-mono hover:border-pink-500/50"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Line B</label>
            <input
              type="text"
              value={subjectB}
              onChange={(e) => setSubjectB(e.target.value)}
              placeholder="Subject line for variant B..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Body B</label>
            <textarea
              rows={9}
              value={bodyB}
              onChange={(e) => setBodyB(e.target.value)}
              placeholder="Email body for variant B..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white leading-relaxed focus:outline-none focus:border-pink-500 font-sans"
            />
          </div>
        </div>
      </div>

      {/* Bottom Launch Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setActiveTab('campaigns')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
        >
          <span>Launch Campaign with A/B Testing</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
