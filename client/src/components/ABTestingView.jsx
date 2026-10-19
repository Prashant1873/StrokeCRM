import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  FileText,
  Paperclip,
  X,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';

export default function ABTestingView({ setActiveTab, navigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [abStats, setAbStats] = useState(null);
  const [databaseHeaders, setDatabaseHeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isAbTest, setIsAbTest] = useState(true);
  const [templateIdA, setTemplateIdA] = useState(null);
  const [templateIdB, setTemplateIdB] = useState(null);
  const [subjectA, setSubjectA] = useState('');
  const [bodyA, setBodyA] = useState('');
  const [subjectB, setSubjectB] = useState('');
  const [bodyB, setBodyB] = useState('');

  // Live Spam Scores
  const [spamStatsA, setSpamStatsA] = useState({ score: 0, rating: 'clean', flagged: [], recommendations: [] });
  const [spamStatsB, setSpamStatsB] = useState({ score: 0, rating: 'clean', flagged: [], recommendations: [] });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const debounceTimerA = useRef(null);
  const debounceTimerB = useRef(null);

  // Load campaigns & saved templates on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/campaigns').then(res => res.json()),
      fetch('/api/templates').then(res => res.json())
    ])
      .then(([campData, tmplData]) => {
        setCampaigns(campData || []);
        setTemplates(tmplData || []);
        if (campData && campData.length > 0) {
          setSelectedCampaignId(campData[0].id);
        }
      })
      .catch(err => console.error('Failed to load initial data:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch A/B stats when selected campaign changes
  const fetchAbStats = async () => {
    if (!selectedCampaignId) return;
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/ab-stats`);
      if (res.ok) {
        const data = await res.json();
        setAbStats(data);
        setIsAbTest(data.is_ab_test ?? true);
        setDatabaseHeaders(data.databaseHeaders || []);

        setTemplateIdA(data.variantA.templateId || null);
        setSubjectA(data.variantA.subject || 'Quick question regarding {{Company}}');
        setBodyA(data.variantA.body || 'Hi {{FirstName}},\n\nWanted to reach out to see how your team handles cold outreach. Would love to share ideas.\n\nBest,\nFounder');
        setSpamStatsA({
          score: data.variantA.spamScore || 0,
          rating: data.variantA.spamRating || 'clean',
          flagged: [],
          recommendations: []
        });

        setTemplateIdB(data.variantB.templateId || null);
        setSubjectB(data.variantB.subject || 'Idea for {{FirstName}} & {{Company}}');
        setBodyB(data.variantB.body || 'Hey {{FirstName}},\n\nSaw what you are building at {{Company}}. We built a free local CRM for Gmail that founders love.\n\nAre you free for a quick chat next week?');
        setSpamStatsB({
          score: data.variantB.spamScore || 0,
          rating: data.variantB.spamRating || 'clean',
          flagged: [],
          recommendations: []
        });

        // Trigger live spam check for both initial states
        checkSpamLive('A', data.variantA.subject, data.variantA.body);
        checkSpamLive('B', data.variantB.subject, data.variantB.body);
      }
    } catch (err) {
      console.error('Failed to load AB stats:', err);
    }
  };

  useEffect(() => {
    fetchAbStats();
  }, [selectedCampaignId]);

  // Live Spam Check with debouncing
  const checkSpamLive = (variant, subject, body) => {
    fetch('/api/templates/spam-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subject || '', body: body || '' })
    })
      .then(res => res.json())
      .then(analysis => {
        if (variant === 'A') setSpamStatsA(analysis);
        else setSpamStatsB(analysis);
      })
      .catch(err => console.error('Spam check error:', err));
  };

  // Debounce spam check on content changes
  useEffect(() => {
    if (debounceTimerA.current) clearTimeout(debounceTimerA.current);
    debounceTimerA.current = setTimeout(() => {
      checkSpamLive('A', subjectA, bodyA);
    }, 400);
    return () => clearTimeout(debounceTimerA.current);
  }, [subjectA, bodyA]);

  useEffect(() => {
    if (debounceTimerB.current) clearTimeout(debounceTimerB.current);
    debounceTimerB.current = setTimeout(() => {
      checkSpamLive('B', subjectB, bodyB);
    }, 400);
    return () => clearTimeout(debounceTimerB.current);
  }, [subjectB, bodyB]);

  // Template Assignment Handlers
  const handleSelectTemplateA = (tmplId) => {
    if (!tmplId) {
      setTemplateIdA(null);
      return;
    }
    const tmpl = templates.find(t => String(t.id) === String(tmplId));
    if (tmpl) {
      setTemplateIdA(tmpl.id);
      setSubjectA(tmpl.subject_a || '');
      setBodyA(tmpl.body_a || '');
      checkSpamLive('A', tmpl.subject_a || '', tmpl.body_a || '');
      setFeedback({ type: 'success', text: `Assigned template "${tmpl.name}" to Variant A.` });
    }
  };

  const handleSelectTemplateB = (tmplId) => {
    if (!tmplId) {
      setTemplateIdB(null);
      return;
    }
    const tmpl = templates.find(t => String(t.id) === String(tmplId));
    if (tmpl) {
      setTemplateIdB(tmpl.id);
      const s = (tmpl.is_ab_test && tmpl.subject_b) ? tmpl.subject_b : (tmpl.subject_a || '');
      const b = (tmpl.is_ab_test && tmpl.body_b) ? tmpl.body_b : (tmpl.body_a || '');
      setSubjectB(s);
      setBodyB(b);
      checkSpamLive('B', s, b);
      setFeedback({ type: 'success', text: `Assigned template "${tmpl.name}" to Variant B.` });
    }
  };

  // 50/50 Cohort Splitter
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

  // Save A/B Configurations
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
          body_b: bodyB,
          template_id_a: templateIdA,
          template_id_b: templateIdB
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

  // Extract variables helper
  const extractVariables = (text) => {
    const matches = text?.match(/{{\s*([a-zA-Z0-9_\-\s]+?)(?:\s*\|\s*["'].*?["'])?\s*}}/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, '').trim())));
  };

  const varsA = extractVariables(`${subjectA} ${bodyA}`);
  const varsB = extractVariables(`${subjectB} ${bodyB}`);
  const wordsA = (bodyA || '').split(/\s+/).filter(Boolean).length;
  const wordsB = (bodyB || '').split(/\s+/).filter(Boolean).length;

  // Selected template objects
  const boundTmplA = templates.find(t => t.id === templateIdA);
  const boundTmplB = templates.find(t => t.id === templateIdB);
  const attachmentsA = boundTmplA && boundTmplA.attachments ? JSON.parse(boundTmplA.attachments || '[]') : [];
  const attachmentsB = boundTmplB && boundTmplB.attachments ? JSON.parse(boundTmplB.attachments || '[]') : [];

  // Active variable buttons to expose
  const activeHeaders = databaseHeaders.length > 0 
    ? databaseHeaders.slice(0, 6) 
    : ['FirstName', 'Company', 'Email', 'Role', 'City'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-secondary">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
        <p className="text-xs">Loading A/B testing studio...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2.5">
            A/B Testing Studio
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-subtle text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/30 font-mono">
              50/50 Cohort Split
            </span>
          </h1>
          <p className="text-xs text-secondary mt-1">
            Assign saved templates or test custom subject lines and messaging angles across equal lead cohorts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCampaignId || ''}
            onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
            className="px-3 py-2 bg-canvas border border-subtle rounded-lg text-xs font-semibold text-primary focus:outline-none focus:border-indigo-500 transition-colors"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-pink-600 dark:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition-colors disabled:opacity-50 cursor-pointer"
            title="Automatically assigns 50% of contacts to Variant A and 50% to Variant B"
          >
            {isSplitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Split className="w-3.5 h-3.5" />}
            <span>Re-balance 50/50</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAB}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving...' : 'Save Variants'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-muted hover:text-primary text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cohort Comparative Deliverability Scorecards */}
      {abStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Variant A Scorecard */}
          <div className="bg-surface border border-teal-500/30 rounded-xl p-5 relative overflow-hidden shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30 font-mono">
                  A
                </span>
                <div>
                  <h3 className="text-sm font-bold text-primary">Cohort Variant A (Control)</h3>
                  <p className="text-[11px] text-muted">
                    {boundTmplA ? `Template: ${boundTmplA.name}` : 'Custom Copy (Unlinked)'}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-subtle text-secondary border border-subtle font-mono">
                {abStats.variantA.total} Leads (50%)
              </span>
            </div>

            {/* Metrics Trio */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-subtle/60 p-2.5 rounded-lg border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold">Sent</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{abStats.variantA.sent}</div>
              </div>
              <div className="bg-subtle/60 p-2.5 rounded-lg border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold">Spam Score</span>
                <div className={`text-lg font-bold font-mono ${
                  spamStatsA.score <= 20 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : spamStatsA.score <= 45 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {spamStatsA.score}%
                </div>
              </div>
              <div className="bg-subtle/60 p-2.5 rounded-lg border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold">Length</span>
                <div className="text-lg font-bold text-primary font-mono">{wordsA} words</div>
              </div>
            </div>

            {/* Template Binding & Attachments Pill */}
            <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1 border-t border-subtle">
              <span className="text-muted text-[11px]">Deliverability Risk:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border font-mono ${
                spamStatsA.score <= 20 
                  ? 'bg-subtle text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : spamStatsA.score <= 45 
                  ? 'bg-subtle text-amber-600 dark:text-amber-400 border-amber-500/30' 
                  : 'bg-subtle text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}>
                {spamStatsA.score <= 20 ? '✓ Clean Inbox Ready' : spamStatsA.score <= 45 ? '⚠️ Moderate Risk' : '⛔ High Spam Risk'}
              </span>
            </div>

            {/* Detected Variables Pills */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted uppercase tracking-wider block">Personalization Tags:</span>
              <div className="flex flex-wrap gap-1 min-h-[22px]">
                {varsA.length > 0 ? (
                  varsA.map((v, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-indigo-600 dark:text-indigo-400 border border-subtle">
                      {`{{${v}}}`}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">⚠️ No dynamic personalization variables detected</span>
                )}
              </div>
            </div>
          </div>

          {/* Variant B Scorecard */}
          <div className="bg-surface border border-pink-500/30 rounded-xl p-5 relative overflow-hidden shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold text-xs flex items-center justify-center border border-pink-500/30">
                  B
                </span>
                <div>
                  <h3 className="text-sm font-bold text-primary">Cohort Variant B (Challenger)</h3>
                  <p className="text-[11px] text-muted">
                    {boundTmplB ? `Template: ${boundTmplB.name}` : 'Custom Copy (Unlinked)'}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-subtle text-secondary border border-subtle font-mono">
                {abStats.variantB.total} Leads (50%)
              </span>
            </div>

            {/* Metrics Trio */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-subtle/60 p-2.5 rounded-lg border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold">Sent</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{abStats.variantB.sent}</div>
              </div>
              <div className="bg-subtle/60 p-2.5 rounded-lg border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold">Spam Score</span>
                <div className={`text-lg font-bold font-mono ${
                  spamStatsB.score <= 20 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : spamStatsB.score <= 45 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {spamStatsB.score}%
                </div>
              </div>
              <div className="bg-subtle/60 p-2.5 rounded-lg border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold">Length</span>
                <div className="text-lg font-bold text-primary font-mono">{wordsB} words</div>
              </div>
            </div>

            {/* Template Binding & Attachments Pill */}
            <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1 border-t border-subtle">
              <span className="text-muted text-[11px]">Deliverability Risk:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border font-mono ${
                spamStatsB.score <= 20 
                  ? 'bg-subtle text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : spamStatsB.score <= 45 
                  ? 'bg-subtle text-amber-600 dark:text-amber-400 border-amber-500/30' 
                  : 'bg-subtle text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}>
                {spamStatsB.score <= 20 ? '✓ Clean Inbox Ready' : spamStatsB.score <= 45 ? '⚠️ Moderate Risk' : '⛔ High Spam Risk'}
              </span>
            </div>

            {/* Detected Variables Pills */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted uppercase tracking-wider block">Personalization Tags:</span>
              <div className="flex flex-wrap gap-1 min-h-[22px]">
                {varsB.length > 0 ? (
                  varsB.map((v, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-pink-600 dark:text-pink-400 border border-subtle">
                      {`{{${v}}}`}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">⚠️ No dynamic personalization variables detected</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparative Guidance Banner */}
      <div className="bg-subtle/50 border border-subtle rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-semibold text-primary">A/B Testing Deliverability Radar</span>
            <p className="text-[11px] text-secondary">
              {wordsA > wordsB ? (
                <>Variant B is <span className="font-semibold text-pink-600 dark:text-pink-400">{wordsA - wordsB} words shorter</span> than Variant A. Shorter messages often achieve higher response rates on mobile.</>
              ) : wordsB > wordsA ? (
                <>Variant A is <span className="font-semibold text-indigo-600 dark:text-indigo-400">{wordsB - wordsA} words shorter</span> than Variant B. Shorter messages often achieve higher response rates on mobile.</>
              ) : (
                <>Both variants have identical length ({wordsA} words). Ensure subject lines test distinct psychological angles.</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted">
            {spamStatsA.score < spamStatsB.score 
              ? '🎯 Variant A has cleaner spam rating' 
              : spamStatsB.score < spamStatsA.score 
              ? '🎯 Variant B has cleaner spam rating' 
              : '⚖️ Both variants have matched spam ratings'}
          </span>
        </div>
      </div>

      {/* Side-by-Side Dual Variant Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor A */}
        <div className="bg-surface border border-subtle rounded-xl p-5 space-y-4 shadow-xs">
          {/* Header & Template Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-subtle pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span>●</span> Variant A (Control Copy)
            </span>

            {/* Variable Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-muted mr-0.5">Insert:</span>
              {activeHeaders.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBodyA(prev => prev + ` {{${v}}}`)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-canvas border border-subtle text-indigo-600 dark:text-indigo-300 font-mono hover:border-indigo-500/50 cursor-pointer transition-colors"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Template Assignment Picker */}
          <div className="p-2.5 rounded-lg bg-subtle/50 border border-subtle space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Assign Saved Template to Variant A
              </label>
              {templateIdA && (
                <button
                  type="button"
                  onClick={() => handleSelectTemplateA('')}
                  className="text-[10px] text-muted hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Detach template to write custom copy"
                >
                  <X className="w-3 h-3" /> Detach
                </button>
              )}
            </div>
            <select
              value={templateIdA || ''}
              onChange={(e) => handleSelectTemplateA(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">-- Custom Copy (No Template Bound) --</option>
              {templates.map(t => {
                const attCount = t.attachments ? JSON.parse(t.attachments || '[]').length : 0;
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_ab_test ? '(A/B Test)' : ''} {attCount > 0 ? `[📎 ${attCount}]` : ''}
                  </option>
                );
              })}
            </select>
            {boundTmplA && attachmentsA.length > 0 && (
              <p className="text-[10px] text-secondary flex items-center gap-1 mt-1">
                <Paperclip className="w-3 h-3 text-indigo-500" />
                <span>{attachmentsA.length} attachment(s) automatically bound to Variant A</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-primary">Subject Line A</label>
              <span className="text-[10px] text-muted font-mono">{subjectA.length} chars</span>
            </div>
            <input
              type="text"
              value={subjectA}
              onChange={(e) => setSubjectA(e.target.value)}
              placeholder="Subject line for variant A..."
              className="w-full px-3.5 py-2.5 bg-canvas border border-subtle rounded-lg text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-primary">Email Body A</label>
              <span className="text-[10px] text-muted font-mono">{wordsA} words</span>
            </div>
            <textarea
              rows={9}
              value={bodyA}
              onChange={(e) => setBodyA(e.target.value)}
              placeholder="Email body for variant A..."
              className="w-full px-3.5 py-2.5 bg-canvas border border-subtle rounded-lg text-xs text-primary placeholder:text-muted leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans transition-colors"
            />
          </div>
        </div>

        {/* Editor B */}
        <div className="bg-surface border border-subtle rounded-xl p-5 space-y-4 shadow-xs">
          {/* Header & Template Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-subtle pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
              <span>●</span> Variant B (Challenger Copy)
            </span>

            {/* Variable Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-muted mr-0.5">Insert:</span>
              {activeHeaders.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBodyB(prev => prev + ` {{${v}}}`)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-canvas border border-subtle text-pink-600 dark:text-pink-300 font-mono hover:border-pink-500/50 cursor-pointer transition-colors"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Template Assignment Picker */}
          <div className="p-2.5 rounded-lg bg-subtle/50 border border-subtle space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pink-500" />
                Assign Saved Template to Variant B
              </label>
              {templateIdB && (
                <button
                  type="button"
                  onClick={() => handleSelectTemplateB('')}
                  className="text-[10px] text-muted hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Detach template to write custom copy"
                >
                  <X className="w-3 h-3" /> Detach
                </button>
              )}
            </div>
            <select
              value={templateIdB || ''}
              onChange={(e) => handleSelectTemplateB(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-pink-500 transition-colors"
            >
              <option value="">-- Custom Copy (No Template Bound) --</option>
              {templates.map(t => {
                const attCount = t.attachments ? JSON.parse(t.attachments || '[]').length : 0;
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_ab_test ? '(A/B Test)' : ''} {attCount > 0 ? `[📎 ${attCount}]` : ''}
                  </option>
                );
              })}
            </select>
            {boundTmplB && attachmentsB.length > 0 && (
              <p className="text-[10px] text-secondary flex items-center gap-1 mt-1">
                <Paperclip className="w-3 h-3 text-pink-500" />
                <span>{attachmentsB.length} attachment(s) automatically bound to Variant B</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-primary">Subject Line B</label>
              <span className="text-[10px] text-muted font-mono">{subjectB.length} chars</span>
            </div>
            <input
              type="text"
              value={subjectB}
              onChange={(e) => setSubjectB(e.target.value)}
              placeholder="Subject line for variant B..."
              className="w-full px-3.5 py-2.5 bg-canvas border border-subtle rounded-lg text-xs text-primary placeholder:text-muted focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-primary">Email Body B</label>
              <span className="text-[10px] text-muted font-mono">{wordsB} words</span>
            </div>
            <textarea
              rows={9}
              value={bodyB}
              onChange={(e) => setBodyB(e.target.value)}
              placeholder="Email body for variant B..."
              className="w-full px-3.5 py-2.5 bg-canvas border border-subtle rounded-lg text-xs text-primary placeholder:text-muted leading-relaxed focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-sans transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Bottom Launch Button */}
      <div className="flex items-center justify-between pt-2 border-t border-subtle">
        <p className="text-xs text-muted">
          All modifications are saved in SQLite with 1:1 Triad isolation and dynamically applied at dispatch.
        </p>
        <button
          type="button"
          onClick={() => {
            if (navigate) navigate(`#/campaigns/${selectedCampaignId || ''}`);
            else if (setActiveTab) setActiveTab('campaigns');
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <span>Open Campaign Cockpit</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
