import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Save,
  Info,
  Tag,
  Mail,
  Copy,
  Zap,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  X
} from 'lucide-react';

// ── TEMPLATES LIBRARY ────────────────────────────────────────────────────────
function TemplatesLibrary({ navigate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `"${name}" deleted.` });
        await fetchTemplates();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Delete failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (id, name) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `"${name}" duplicated.` });
        await fetchTemplates();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Duplicate failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-400" />
        <p className="text-xs">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-violet-400" />
            Templates
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {templates.length} template{templates.length !== 1 ? 's' : ''} · Reusable email templates shared across campaigns
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate && navigate('#/templates/new')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <Plus className="w-3.5 h-3.5" />
          New Template
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
          : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-4">Dismiss</button>
        </div>
      )}

      {/* Empty State */}
      {templates.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Templates Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create reusable email templates with personalisation tokens. Attach them to campaigns during setup.
          </p>
          <button
            type="button"
            onClick={() => navigate && navigate('#/templates/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(t => (
            <div
              key={t.id}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-xl hover:shadow-black/30"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{t.name}</h3>
                  {t.created_at && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700 shrink-0">
                  {t.is_ab_test ? 'A/B' : 'Single'}
                </span>
              </div>

              {/* Subject preview */}
              {t.subject_a && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-600 shrink-0" />
                  <span className="truncate font-mono text-slate-300">{t.subject_a}</span>
                </div>
              )}

              {/* Body preview */}
              {t.body_a && (
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex-1">
                  <p className="text-[11px] text-slate-400 line-clamp-3 font-sans whitespace-pre-wrap">
                    {t.body_a}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDuplicate(t.id, t.name)}
                    className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-40"
                    title="Duplicate"
                  >
                    <Copy className="w-3 h-3" />
                    Dupe
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(t.id, t.name)}
                    className="text-[11px] text-slate-600 hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-40"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => navigate && navigate(`#/templates/${t.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white text-[11px] font-semibold transition-all border border-violet-500/20 hover:border-transparent"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TEMPLATE COMPOSER ────────────────────────────────────────────────────────
function TemplateComposer({ templateId, navigate }) {
  const isNew = templateId === 'new';

  const [contacts, setContacts] = useState([]);
  const [currentContactIdx, setCurrentContactIdx] = useState(0);
  const [availableVariables, setAvailableVariables] = useState(['FirstName', 'LastName', 'Email', 'Company', 'Role', 'City']);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('');

  // Template Form State
  const [templateName, setTemplateName] = useState(isNew ? 'New Template' : '');
  const [subject, setSubject] = useState(isNew ? 'Quick question regarding {{Company | "your company"}}' : '');
  const [body, setBody] = useState(isNew ? `Hi {{FirstName | "there"}},\n\nSaw your team's recent work at {{Company}} in {{City | "your area"}}. I wanted to reach out because we built a tool specifically designed to help founders and outreach teams streamline cold email without expensive recurring fees.\n\nWould you be open to a 5-minute chat next Tuesday to see if this could save your team time?\n\nBest regards,\nFounder` : '');
  const [loadedTemplate, setLoadedTemplate] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Spam Analysis State
  const [spamAnalysis, setSpamAnalysis] = useState({ score: 0, rating: 'Low', flaggedKeywords: [], recommendations: [] });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [activeInput, setActiveInput] = useState('body');

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  // Load template if editing existing
  useEffect(() => {
    if (isNew) return;
    fetch(`/api/templates/${templateId}`)
      .then(res => {
        if (!res.ok) throw new Error('Template not found');
        return res.json();
      })
      .then(data => {
        setLoadedTemplate(data);
        setTemplateName(data.name || '');
        setSubject(data.subject_a || '');
        setBody(data.body_a || '');
      })
      .catch(err => setLoadError(err.message));
  }, [templateId]);

  // Load databases for preview variables
  useEffect(() => {
    fetch('/api/databases')
      .then(res => res.json())
      .then(dbs => {
        setDatabases(Array.isArray(dbs) ? dbs : []);
        if (dbs && dbs.length > 0) loadDatabaseVariables(dbs[0].id);
      })
      .catch(() => {});
  }, []);

  // Spam check debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/templates/spam-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body })
      })
        .then(res => res.json())
        .then(data => setSpamAnalysis(data))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [subject, body]);

  const loadDatabaseVariables = async (dbId) => {
    if (!dbId) return;
    setSelectedDatabaseId(dbId);
    try {
      const res = await fetch(`/api/databases/${dbId}?limit=20`);
      const data = await res.json();
      if (data?.database) {
        if (Array.isArray(data.database.headers) && data.database.headers.length > 0) {
          setAvailableVariables(data.database.headers);
        }
        if (Array.isArray(data.records) && data.records.length > 0) {
          setContacts(data.records);
          setCurrentContactIdx(0);
        }
      }
    } catch (err) {
      console.error('Failed to load database headers:', err);
    }
  };

  const handleInsertVariable = (varName) => {
    const token = `{{${varName}}}`;
    if (activeInput === 'subject') {
      const el = subjectRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const updated = subject.substring(0, start) + token + subject.substring(end);
        setSubject(updated);
        setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); }, 10);
      } else {
        setSubject(prev => prev + ' ' + token);
      }
    } else {
      const el = bodyRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const updated = body.substring(0, start) + token + body.substring(end);
        setBody(updated);
        setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); }, 10);
      } else {
        setBody(prev => prev + ' ' + token);
      }
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      setSaveStatus({ type: 'error', text: 'Template name is required.' });
      return;
    }
    setIsSaving(true);
    setSaveStatus(null);
    try {
      let res, data;
      if (isNew) {
        res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: templateName.trim(), subject_a: subject, body_a: body, is_ab_test: 0 })
        });
        data = await res.json();
        if (data.success && data.template?.id) {
          setSaveStatus({ type: 'success', text: 'Template created!' });
          setTimeout(() => navigate && navigate(`#/templates/${data.template.id}`), 800);
        } else {
          setSaveStatus({ type: 'error', text: data.error || 'Failed to create.' });
        }
      } else {
        res = await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: templateName.trim(), subject_a: subject, body_a: body, is_ab_test: loadedTemplate?.is_ab_test || 0 })
        });
        data = await res.json();
        if (data.success) {
          setSaveStatus({ type: 'success', text: 'Template saved!' });
        } else {
          setSaveStatus({ type: 'error', text: data.error || 'Failed to save.' });
        }
      }
    } catch (err) {
      setSaveStatus({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Live preview
  const activeLead = contacts[currentContactIdx] || {
    first_name: 'Sarah', company: 'Cyberdyne Systems', email: 'sarah.connor@cyberdyne-ai.io',
    custom_fields: JSON.stringify({ FirstName: 'Sarah', LastName: 'Connor', Email: 'sarah.connor@cyberdyne-ai.io', Company: 'Cyberdyne Systems', Role: 'Head of AI', City: 'San Francisco' })
  };

  let activeLeadFields = {};
  try { activeLeadFields = JSON.parse(activeLead.custom_fields || '{}'); } catch {}
  activeLeadFields.first_name = activeLead.first_name || activeLeadFields.FirstName || 'there';
  activeLeadFields.company = activeLead.company || activeLeadFields.Company || 'your company';
  activeLeadFields.email = activeLead.email || activeLeadFields.Email || 'lead@example.com';

  const renderPreviewText = (text) => {
    if (!text) return '';
    return text.replace(/{{\s*([a-zA-Z0-9_\-\s]+?)(?:\s*\|\s*["'](.*?)["'])?\s*}}/g, (match, key, fallback) => {
      const cleanKey = key.trim();
      const matchKey = Object.keys(activeLeadFields).find(k => k.toLowerCase() === cleanKey.toLowerCase());
      if (matchKey && activeLeadFields[matchKey]) return activeLeadFields[matchKey];
      return fallback !== undefined ? fallback : '';
    });
  };

  const renderedSubject = renderPreviewText(subject);
  const renderedBody = renderPreviewText(body);

  if (loadError) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate && navigate('#/templates')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> All Templates
        </button>
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Template Not Found</h3>
          <p className="text-xs text-slate-400">{loadError}</p>
          <button onClick={() => navigate && navigate('#/templates')} className="text-xs text-indigo-400 hover:text-indigo-300 underline">← Back to Templates</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 space-y-3">
        <button
          type="button"
          onClick={() => navigate && navigate('#/templates')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          All Templates
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-2xl font-bold text-white bg-transparent border-none outline-none w-full placeholder-slate-600 tracking-tight"
              placeholder="Template Name"
            />
            <p className="text-xs text-slate-500 mt-1">
              {isNew ? 'Composing new template' : `Editing template #${templateId}`}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {saveStatus && (
              <span className={`text-xs px-2.5 py-1 rounded-lg ${saveStatus.type === 'success' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'}`}>
                {saveStatus.text}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? 'Saving…' : (isNew ? 'Create Template' : 'Save Changes')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Editor + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Subject */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-violet-400" /> Subject Line
            </label>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setActiveInput('subject')}
              placeholder="e.g., Quick question for {{Company}}"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono transition-colors"
            />
          </div>

          {/* Body */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-400" /> Email Body
            </label>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setActiveInput('body')}
              rows={12}
              placeholder="Hi {{FirstName}},&#10;&#10;..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono resize-none transition-colors"
            />
          </div>

          {/* Variable Palette */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-violet-400" /> Personalisation Tokens
              </span>
              {databases.length > 0 && (
                <select
                  value={selectedDatabaseId}
                  onChange={(e) => loadDatabaseVariables(e.target.value)}
                  className="text-[11px] px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-violet-500"
                >
                  {databases.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableVariables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsertVariable(v)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 hover:text-white transition-all cursor-pointer"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600">
              Click a token to insert it at the active cursor. Fallback syntax: <span className="font-mono text-slate-500">{'{{Name | "fallback"}}'}</span>
            </p>
          </div>
        </div>

        {/* Sidebar: Spam Check + Preview */}
        <div className="space-y-4">
          {/* Spam Check */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              {spamAnalysis.score <= 30
                ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                : <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
              Spam Analysis
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                spamAnalysis.score <= 30
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : spamAnalysis.score <= 60
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {spamAnalysis.rating} · {spamAnalysis.score}/100
              </span>
            </h3>

            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  spamAnalysis.score <= 30 ? 'bg-emerald-500'
                  : spamAnalysis.score <= 60 ? 'bg-amber-500'
                  : 'bg-rose-500'
                }`}
                style={{ width: `${spamAnalysis.score}%` }}
              />
            </div>

            {spamAnalysis.flaggedKeywords?.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Flagged:</span>
                <div className="flex flex-wrap gap-1">
                  {spamAnalysis.flaggedKeywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-500/20 font-mono">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {spamAnalysis.recommendations?.length > 0 && (
              <ul className="space-y-1">
                {spamAnalysis.recommendations.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-violet-400" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Live Preview
              </h3>
              {contacts.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentContactIdx(Math.max(0, currentContactIdx - 1))}
                    disabled={currentContactIdx === 0}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-slate-500">{currentContactIdx + 1}/{contacts.length}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentContactIdx(Math.min(contacts.length - 1, currentContactIdx + 1))}
                    disabled={currentContactIdx === contacts.length - 1}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
              <p className="text-[11px] text-slate-500 font-mono">To: {activeLeadFields.email}</p>
              <p className="text-[11px] font-semibold text-white">{renderedSubject || <span className="text-slate-600">(no subject)</span>}</p>
              <hr className="border-slate-800" />
              <p className="text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {renderedBody || <span className="text-slate-600">(body is empty)</span>}
              </p>
            </div>

            <p className="text-[10px] text-slate-600">
              Preview rendered with {contacts.length > 0 ? 'real database sample' : 'placeholder data'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROOT: Route-aware entry point ─────────────────────────────────────────────
export default function TemplatesView({ setActiveTab, navigate, currentRoute }) {
  const routeName = currentRoute?.name;
  const templateId = currentRoute?.params?.id;

  if (routeName === 'template-detail' && templateId) {
    return <TemplateComposer templateId={templateId} navigate={navigate} />;
  }

  // Default: library view (for 'templates' route)
  return <TemplatesLibrary navigate={navigate} />;
}
