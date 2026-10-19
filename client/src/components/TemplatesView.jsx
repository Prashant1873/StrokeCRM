import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  Info,
  Tag,
  Mail,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  RemoveFormatting,
  Paperclip,
  ArrowLeft,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { STARTER_PRESETS } from '../data/starterPresets';

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

// Legacy plain-text bodies → HTML so line breaks survive in the rich editor
const toHtml = (text = '') => /<[a-z][\s\S]*>/i.test(text)
  ? text
  : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

const RICH_TEXT_CLASSES = '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-indigo-400 [&_a]:underline';

const FORMAT_BUTTONS = [
  { cmd: 'bold', icon: Bold, title: 'Bold (Ctrl+B)' },
  { cmd: 'italic', icon: Italic, title: 'Italic (Ctrl+I)' },
  { cmd: 'underline', icon: Underline, title: 'Underline (Ctrl+U)' },
  { cmd: 'insertUnorderedList', icon: List, title: 'Bullet list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Numbered list' },
  { cmd: 'createLink', icon: Link, title: 'Insert link' },
  { cmd: 'removeFormat', icon: RemoveFormatting, title: 'Clear formatting' }
];

// Helper to highlight variable tokens in previews
function renderSubjectWithChips(text = '') {
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <span key={i} className="inline-block px-1.5 py-0.2 mx-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-semibold border border-indigo-500/25">
          {part}
        </span>
      );
    }
    return part;
  });
}

// ── TEMPLATES LIBRARY ────────────────────────────────────────────────────────
function TemplatesLibrary({ navigate }) {
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'presets'
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

  const handleClonePreset = async (preset) => {
    setBusy(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preset.name,
          subject_a: preset.subject,
          body_a: preset.body,
          is_ab_test: 0,
          attachments: []
        })
      });
      const data = await res.json();
      if (data.success && data.template?.id) {
        setFeedback({ type: 'success', message: `Preset "${preset.name}" cloned into active templates!` });
        await fetchTemplates();
        if (navigate) {
          navigate(`#/templates/${data.template.id}`);
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to clone preset.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-secondary">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
        <p className="text-xs">Loading templates & preset library...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-teal-500" />
            Templates & Presets
          </h1>
          <p className="text-xs text-secondary mt-1">
            Reusable high-converting cold email sequences, personalisation tokens, and battle-tested outreach templates.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'presets' ? 'mine' : 'presets')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
              activeTab === 'presets'
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400'
                : 'bg-surface border-subtle text-secondary hover:text-primary hover:bg-subtle'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            {activeTab === 'presets' ? 'View My Templates' : 'Explore Presets Gallery'}
          </button>
          <button
            type="button"
            onClick={() => navigate && navigate('#/templates/new')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-all spring-press focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Plus className="w-3.5 h-3.5" />
            New Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle">
        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'mine'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          My Templates
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono bg-subtle text-muted">
            {templates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'presets'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-500" />
          Starter Presets Gallery
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-subtle text-teal-600 dark:text-teal-400 font-mono font-bold border border-subtle">
            {STARTER_PRESETS.length} Presets
          </span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-muted hover:text-primary ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* PRESETS TAB CONTENT */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                Curated High-Converting Cold Outreach Sequences
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Pre-written cold acquisition and drip follow-up frameworks. 1-click clone into active templates with tokens ready.
              </p>
            </div>
            <span className="text-[11px] text-muted shrink-0">
              Battle-tested structures · Ready to personalize
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STARTER_PRESETS.map(preset => (
              <div
                key={preset.id}
                className="bg-surface border border-subtle hover:border-default rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-subtle text-teal-600 dark:text-teal-400 border border-subtle">
                        {preset.category}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-subtle text-secondary border border-subtle">
                        {preset.stepRecommendation}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {preset.badge}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-sm font-bold text-primary">{preset.name}</h3>
                    <p className="text-xs text-secondary mt-0.5">{preset.description}</p>
                  </div>

                  {/* Subject Preview */}
                  <div className="bg-canvas border border-subtle rounded-lg p-2.5">
                    <div className="text-[10px] text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-500" />
                      Subject Line Preview
                    </div>
                    <p className="text-xs text-primary font-medium">
                      {renderSubjectWithChips(preset.subject)}
                    </p>
                  </div>

                  {/* Body Preview */}
                  <div className="bg-canvas border border-subtle rounded-lg p-3">
                    <div className="text-[10px] text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-indigo-500" />
                      Body Content Preview
                    </div>
                    <div
                      className={`text-xs text-secondary line-clamp-4 leading-relaxed font-sans ${RICH_TEXT_CLASSES}`}
                      dangerouslySetInnerHTML={{ __html: preset.body }}
                    />
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-subtle flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted">
                    Tokens: <code className="text-indigo-500">{'{{firstName}}'}</code>, <code className="text-indigo-500">{'{{company}}'}</code>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleClonePreset(preset)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs shadow-indigo-600/20 transition-all spring-press disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Use This Preset
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY TEMPLATES TAB CONTENT */}
      {activeTab === 'mine' && (
        <>
          {templates.length === 0 ? (
            <div className="bg-surface border border-subtle rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-500 border border-teal-500/20 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-primary">No Active Templates Yet</h3>
              <p className="text-xs text-secondary max-w-md mx-auto">
                Create custom email templates with personalisation tokens, or start immediately with one of our high-converting presets.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-xs font-semibold transition-all spring-press cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  Browse Starter Presets
                </button>
                <button
                  type="button"
                  onClick={() => navigate && navigate('#/templates/new')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all spring-press cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Blank Template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map(t => (
                <div
                  key={t.id}
                  className="group bg-surface border border-subtle hover:border-default rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-primary truncate">{t.name}</h3>
                      {t.created_at && (
                        <p className="text-[10px] text-muted mt-0.5">
                          {new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-subtle text-secondary border-subtle shrink-0">
                      {t.is_ab_test ? 'A/B Split' : 'Single Variant'}
                    </span>
                  </div>

                  {/* Subject preview */}
                  {t.subject_a && (
                    <div className="text-[11px] text-secondary flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-muted shrink-0" />
                      <span className="truncate font-mono text-primary">{t.subject_a}</span>
                    </div>
                  )}

                  {/* Body preview */}
                  {t.body_a && (
                    <div className="bg-canvas border border-subtle rounded-lg p-2.5 flex-1">
                      <div
                        className={`text-[11px] text-secondary line-clamp-3 font-sans ${RICH_TEXT_CLASSES}`}
                        dangerouslySetInnerHTML={{ __html: toHtml(t.body_a) }}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-subtle">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDuplicate(t.id, t.name)}
                        className="text-[11px] text-secondary hover:text-primary flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-subtle disabled:opacity-40"
                        title="Duplicate Template"
                      >
                        <Copy className="w-3 h-3" />
                        Dupe
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(t.id, t.name)}
                        className="text-[11px] text-muted hover:text-rose-500 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-subtle disabled:opacity-40"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate && navigate(`#/templates/${t.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white text-[11px] font-semibold transition-all border border-indigo-500/20 hover:border-transparent spring-press cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
  const [body, setBody] = useState(isNew ? toHtml(`Hi {{FirstName | "there"}},\n\nSaw your team's recent work at {{Company}} in {{City | "your area"}}. I wanted to reach out because we built a tool specifically designed to help founders and outreach teams streamline cold email without expensive recurring fees.\n\nWould you be open to a 5-minute chat next Tuesday to see if this could save your team time?\n\nBest regards,\nFounder`) : '');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
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
        setBody(toHtml(data.body_a || ''));
        setAttachments(JSON.parse(data.attachments || '[]'));
      })
      .catch(err => setLoadError(err.message));
  }, [templateId]);

  // Push external body changes (load, defaults) into the editor; typing already matches, so caret is untouched
  useEffect(() => {
    if (bodyRef.current && bodyRef.current.innerHTML !== body) bodyRef.current.innerHTML = body;
  }, [body]);

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
      if (!el) return;
      const sel = window.getSelection();
      const caret = sel.rangeCount && el.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
      el.focus();
      const range = caret || document.createRange();
      if (!caret) {
        range.selectNodeContents(el);
        range.collapse(false);
      }
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('insertText', false, token);
    }
  };

  const handleFormat = (cmd) => {
    let arg;
    if (cmd === 'createLink') {
      const sel = window.getSelection();
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      arg = prompt('Link URL', 'https://');
      if (!arg || !range) return;
      bodyRef.current.focus();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand(cmd, false, arg);
    setBody(bodyRef.current.innerHTML);
  };

  const handleAttach = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    const total = [...attachments, ...files].reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_ATTACHMENT_BYTES) {
      setSaveStatus({ type: 'error', text: 'Attachments exceed 20 MB total.' });
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      const res = await fetch('/api/attachments', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Attachment upload failed.');
      const added = await res.json();
      setAttachments(prev => [...prev, ...added]);
    } catch (err) {
      setSaveStatus({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
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
          body: JSON.stringify({ name: templateName.trim(), subject_a: subject, body_a: body, is_ab_test: 0, attachments })
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
          body: JSON.stringify({ name: templateName.trim(), subject_a: subject, body_a: body, is_ab_test: loadedTemplate?.is_ab_test || 0, attachments })
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
        <button onClick={() => navigate && navigate('#/templates')} className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary mb-6 group cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> All Templates
        </button>
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-primary">Template Not Found</h3>
          <p className="text-xs text-secondary">{loadError}</p>
          <button onClick={() => navigate && navigate('#/templates')} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">← Back to Templates</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-subtle pb-5 space-y-3">
        <button
          type="button"
          onClick={() => navigate && navigate('#/templates')}
          className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors group cursor-pointer"
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
              className="text-2xl font-bold text-primary bg-transparent border-none outline-none w-full placeholder-muted tracking-tight"
              placeholder="Template Name"
            />
            <p className="text-xs text-muted mt-1">
              {isNew ? 'Composing new template' : `Editing template #${templateId}`}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {saveStatus && (
              <span className={`text-xs px-2.5 py-1 rounded-lg ${saveStatus.type === 'success' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'}`}>
                {saveStatus.text}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all spring-press disabled:opacity-50 cursor-pointer"
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
          <div className="bg-surface border border-subtle rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" /> Subject Line
            </label>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setActiveInput('subject')}
              placeholder="e.g., Quick question for {{Company}}"
              className="w-full px-3.5 py-2.5 bg-canvas border border-subtle rounded-lg text-sm text-primary placeholder-muted focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          </div>

          {/* Body */}
          <div className="bg-surface border border-subtle rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" /> Email Body
            </label>
            <div className="flex items-center gap-0.5 p-1 bg-canvas border border-subtle rounded-lg w-fit">
              {FORMAT_BUTTONS.map(({ cmd, icon: Icon, title }) => (
                <button
                  key={cmd}
                  type="button"
                  title={title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat(cmd)}
                  className="p-1.5 rounded text-secondary hover:text-primary hover:bg-subtle transition-colors cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setBody(e.currentTarget.innerHTML)}
              onFocus={() => setActiveInput('body')}
              data-placeholder="Hi {{FirstName}}, ..."
              className={`w-full min-h-[18rem] px-3.5 py-2.5 bg-canvas border border-subtle rounded-lg text-sm text-primary focus:outline-none focus:border-indigo-500 font-sans transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-muted ${RICH_TEXT_CLASSES}`}
            />
          </div>

          {/* Attachments */}
          <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" /> Attachments
              </span>
              <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white text-[11px] font-semibold border border-indigo-500/20 transition-all cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {isUploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {isUploading ? 'Uploading…' : 'Add Files'}
                <input type="file" multiple className="hidden" onChange={handleAttach} />
              </label>
            </div>
            {attachments.length > 0 && (
              <ul className="space-y-1.5">
                {attachments.map((a, i) => (
                  <li key={a.file} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-canvas border border-subtle rounded-lg text-[11px]">
                    <span className="truncate text-primary">{a.name}</span>
                    <span className="flex items-center gap-2 shrink-0 text-muted">
                      {(a.size / 1024 / 1024).toFixed(2)} MB
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="text-muted hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-muted">
              Sent with every outbound email of campaigns using this template. Max 20 MB total. Changes apply after saving.
            </p>
          </div>

          {/* Variable Palette */}
          <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" /> Lead Audience Tokens
              </span>
              {databases.length > 0 && (
                <select
                  value={selectedDatabaseId}
                  onChange={(e) => loadDatabaseVariables(e.target.value)}
                  className="text-[11px] px-2 py-1 bg-canvas border border-subtle rounded text-primary focus:outline-none focus:border-indigo-500"
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertVariable(v)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-subtle text-teal-600 dark:text-teal-400 border border-subtle hover:bg-subtle/80 active:scale-95 transition-all cursor-pointer"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted">
              Click a token to insert it at the active cursor position. Fallback syntax: <span className="font-mono text-secondary">{'{{Name | "fallback"}}'}</span>
            </p>
          </div>
        </div>

        {/* Sidebar: Spam Check + Preview */}
        <div className="space-y-4">
          {/* Spam Check */}
          <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              {spamAnalysis.score <= 30
                ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                : <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
              Deliverability Spam Radar
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                spamAnalysis.score <= 30
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : spamAnalysis.score <= 60
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}>
                {spamAnalysis.rating} · {spamAnalysis.score}/100
              </span>
            </h3>

            <div className="w-full bg-canvas h-2 rounded-full overflow-hidden border border-subtle">
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
                <span className="text-[10px] text-muted uppercase tracking-wider">Flagged Words:</span>
                <div className="flex flex-wrap gap-1">
                  {spamAnalysis.flaggedKeywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {spamAnalysis.recommendations?.length > 0 && (
              <ul className="space-y-1">
                {spamAnalysis.recommendations.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-[11px] text-secondary flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-indigo-500" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live Preview */}
          <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                Live Dynamic Preview
              </h3>
              {contacts.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentContactIdx(Math.max(0, currentContactIdx - 1))}
                    disabled={currentContactIdx === 0}
                    className="p-1 text-muted hover:text-primary disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-muted">{currentContactIdx + 1}/{contacts.length}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentContactIdx(Math.min(contacts.length - 1, currentContactIdx + 1))}
                    disabled={currentContactIdx === contacts.length - 1}
                    className="p-1 text-muted hover:text-primary disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-canvas border border-subtle rounded-lg p-3 space-y-2">
              <p className="text-[11px] text-muted font-mono">To: {activeLeadFields.email}</p>
              <p className="text-[11px] font-semibold text-primary">{renderedSubject || <span className="text-muted">(no subject)</span>}</p>
              <hr className="border-subtle" />
              {renderedBody ? (
                <div
                  className={`text-[11px] text-secondary font-sans leading-relaxed ${RICH_TEXT_CLASSES}`}
                  dangerouslySetInnerHTML={{ __html: renderedBody }}
                />
              ) : (
                <p className="text-[11px] text-muted">(body is empty)</p>
              )}
              {attachments.length > 0 && (
                <p className="text-[10px] text-muted flex items-center gap-1 pt-1 border-t border-subtle">
                  <Paperclip className="w-3 h-3" /> {attachments.map(a => a.name).join(', ')}
                </p>
              )}
            </div>

            <p className="text-[10px] text-muted">
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
