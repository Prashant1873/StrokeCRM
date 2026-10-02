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
  ArrowRight
} from 'lucide-react';

export default function TemplatesView({ setActiveTab, navigate, currentRoute }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [currentContactIdx, setCurrentContactIdx] = useState(0);
  const [availableVariables, setAvailableVariables] = useState(['FirstName', 'LastName', 'Email', 'Company', 'Role', 'City']);

  // Template Form State
  const [subject, setSubject] = useState('Quick question regarding {{Company | "your company"}}');
  const [body, setBody] = useState(`Hi {{FirstName | "there"}},

Saw your team's recent work at {{Company}} in {{City | "your area"}}. I wanted to reach out because we built a tool specifically designed to help founders and outreach teams streamline cold email without expensive recurring fees.

Would you be open to a 5-minute chat next Tuesday to see if this could save your team time?

Best regards,
Founder`);

  // Spam Analysis State
  const [spamAnalysis, setSpamAnalysis] = useState({
    score: 0,
    rating: 'Low',
    flaggedKeywords: [],
    recommendations: []
  });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [activeInput, setActiveInput] = useState('body'); // 'subject' | 'body'

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  // Load campaigns and contacts
  useEffect(() => {
    fetch('/api/campaigns')
      .then(res => res.json())
      .then(data => {
        setCampaigns(data || []);
        if (data && data.length > 0) {
          const firstCamp = data[0];
          setSelectedCampaignId(firstCamp.id);
          if (firstCamp.subject_a) setSubject(firstCamp.subject_a);
          if (firstCamp.body_a) setBody(firstCamp.body_a);
        }
      })
      .catch(err => console.error('Failed to load campaigns:', err));

    fetch('/api/leads?limit=20')
      .then(res => res.json())
      .then(data => {
        const leadList = data.contacts || [];
        setContacts(leadList);
        if (leadList.length > 0) {
          try {
            const firstRow = JSON.parse(leadList[0].custom_fields || '{}');
            const keys = Object.keys(firstRow);
            if (keys.length > 0) {
              setAvailableVariables(keys);
            }
          } catch {}
        }
      })
      .catch(err => console.error('Failed to load contacts for preview:', err));
  }, []);

  // Update spam check whenever subject or body changes
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

  // Insert variable pill at active cursor position
  const handleInsertVariable = (varName) => {
    const token = `{{${varName}}}`;
    if (activeInput === 'subject') {
      const el = subjectRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const updated = subject.substring(0, start) + token + subject.substring(end);
        setSubject(updated);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        }, 10);
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
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        }, 10);
      } else {
        setBody(prev => prev + ' ' + token);
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedCampaignId) {
      alert('Please select or create a campaign first.');
      return;
    }
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_a: subject,
          body_a: body,
          is_ab_test: 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus({ type: 'success', text: 'Template saved to campaign successfully!' });
      } else {
        setSaveStatus({ type: 'error', text: data.message });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Compute live rendered preview values based on current contact
  const activeLead = contacts[currentContactIdx] || {
    first_name: 'Sarah',
    company: 'Cyberdyne Systems',
    email: 'sarah.connor@cyberdyne-ai.io',
    custom_fields: JSON.stringify({
      FirstName: 'Sarah',
      LastName: 'Connor',
      Email: 'sarah.connor@cyberdyne-ai.io',
      Company: 'Cyberdyne Systems',
      Role: 'Head of AI',
      City: 'San Francisco'
    })
  };

  let activeLeadFields = {};
  try {
    activeLeadFields = JSON.parse(activeLead.custom_fields || '{}');
  } catch {}
  activeLeadFields.first_name = activeLead.first_name || activeLeadFields.FirstName || 'there';
  activeLeadFields.company = activeLead.company || activeLeadFields.Company || 'your company';
  activeLeadFields.email = activeLead.email || activeLeadFields.Email || 'lead@example.com';

  // Local helper for interpolation in UI preview
  const renderPreviewText = (text) => {
    if (!text) return '';
    return text.replace(/{{\s*([a-zA-Z0-9_\-\s]+?)(?:\s*\|\s*["'](.*?)["'])?\s*}}/g, (match, key, fallback) => {
      const cleanKey = key.trim();
      const matchKey = Object.keys(activeLeadFields).find(k => k.toLowerCase() === cleanKey.toLowerCase());
      if (matchKey && activeLeadFields[matchKey]) {
        return activeLeadFields[matchKey];
      }
      return fallback !== undefined ? fallback : '';
    });
  };

  const renderedSubject = renderPreviewText(subject);
  const renderedBody = renderPreviewText(body);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Template Composer & Spam Preflight
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-normal">
              Variable Engine
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Personalize your emails with spreadsheet variables and check spam deliverability before sending.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
          </button>

          <button
            onClick={() => {
              if (navigate && selectedCampaignId) {
                navigate(`#/campaigns/${selectedCampaignId}/preflight`);
              } else if (navigate) {
                navigate('#/campaigns');
              } else {
                setActiveTab('campaigns');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <span>Proceed to Preflight & Dispatch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
          saveStatus.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          {saveStatus.text}
        </div>
      )}

      {/* Main Split Layout: Editor on Left, Live Rendered Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Dynamic Variable Pills Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Click to Insert Variable into {activeInput === 'subject' ? 'Subject' : 'Body'}:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Syntax: {"{{Variable | 'fallback'}}"}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {availableVariables.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsertVariable(v)}
                  className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-indigo-300 text-xs font-mono font-medium transition-all group hover:scale-[1.02]"
                >
                  <span className="text-indigo-500 group-hover:text-indigo-400 font-bold">{`{{`}</span>
                  {v}
                  <span className="text-indigo-500 group-hover:text-indigo-400 font-bold">{`}}`}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Line Field */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Email Subject Line
              </label>
              <span className={`text-[11px] font-mono ${subject.length > 70 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                {subject.length} / 70 chars {subject.length > 70 && '(Too long)'}
              </span>
            </div>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onFocus={() => setActiveInput('subject')}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question for {{FirstName}} regarding {{Company}}"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans transition-colors"
            />
          </div>

          {/* Email Body Field */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Email Body (Plain Text / Markdown)
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {body.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              ref={bodyRef}
              rows={11}
              value={body}
              onFocus={() => setActiveInput('body')}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email pitch here..."
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed transition-colors resize-y"
            />
          </div>

          {/* Real-Time Spam Risk Meter & Deliverability Preflight */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                {spamAnalysis.rating === 'Low' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-white">Spam Filter Preflight Score</h3>
                  <p className="text-[11px] text-slate-400">Heuristic deliverability scan for cold email buzzwords.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  spamAnalysis.rating === 'Low'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : spamAnalysis.rating === 'Medium'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                }`}>
                  {spamAnalysis.rating} Risk ({spamAnalysis.score}%)
                </span>
              </div>
            </div>

            {/* Score Bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mb-4">
              <div
                className={`h-full transition-all duration-300 ${
                  spamAnalysis.score <= 20
                    ? 'bg-emerald-500'
                    : spamAnalysis.score <= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(5, spamAnalysis.score)}%` }}
              />
            </div>

            {/* Flagged Keywords List */}
            {spamAnalysis.flaggedKeywords.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-semibold text-rose-400 block mb-1.5">Flagged Trigger Words:</span>
                <div className="flex flex-wrap gap-1.5">
                  {spamAnalysis.flaggedKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 text-xs font-mono">
                      "{kw}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="space-y-1 text-xs text-slate-400">
              {spamAnalysis.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-indigo-400">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Rendered Email Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm sticky top-24">
            {/* Header & Contact Cycler */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Live Recipient Preview</h3>
              </div>

              {contacts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentContactIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentContactIdx === 0}
                    className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    title="Previous lead"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono px-1">
                    {currentContactIdx + 1} / {contacts.length}
                  </span>
                  <button
                    onClick={() => setCurrentContactIdx(prev => Math.min(contacts.length - 1, prev + 1))}
                    disabled={currentContactIdx === contacts.length - 1}
                    className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    title="Next lead"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Mock Gmail Email Window */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-4 font-sans space-y-3 shadow-inner">
              <div className="space-y-1.5 border-b border-slate-800/70 pb-3 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="font-semibold text-slate-500 w-12 text-right">To:</span>
                  <span className="text-slate-200 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate">
                    {activeLeadFields.first_name} &lt;{activeLeadFields.email}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="font-semibold text-slate-500 w-12 text-right">Subject:</span>
                  <span className="text-white font-medium truncate">
                    {renderedSubject || '(No subject)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="font-semibold text-slate-500 w-12 text-right">Company:</span>
                  <span className="text-slate-400 truncate">
                    {activeLeadFields.company || '—'}
                  </span>
                </div>
              </div>

              {/* Rendered Email Body */}
              <div className="py-2 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed min-h-[220px]">
                {renderedBody || 'Email body will render here...'}
              </div>

              {/* Mock Unsubscribe Footer */}
              <div className="pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Direct Gmail Send • Opt-out link enabled</span>
                <span className="text-indigo-400">StrokeCRM</span>
              </div>
            </div>

            {/* Active Contact Information Card */}
            <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">Lead Attributes Interpolated:</span>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-300 pt-1">
                <div>Name: <span className="text-indigo-300">{activeLeadFields.first_name}</span></div>
                <div>Company: <span className="text-indigo-300">{activeLeadFields.company}</span></div>
                {activeLeadFields.Role && <div>Role: <span className="text-indigo-300">{activeLeadFields.Role}</span></div>}
                {activeLeadFields.City && <div>City: <span className="text-indigo-300">{activeLeadFields.City}</span></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
