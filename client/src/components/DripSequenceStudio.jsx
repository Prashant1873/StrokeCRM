import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Mail, 
  Layers, 
  RefreshCw,
  FileText,
  Sliders,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  RemoveFormatting
} from 'lucide-react';
import Switch from './common/Switch';
import DeliverabilityBeacon from './common/DeliverabilityBeacon';

const toHtml = (text = '') => /<[a-z][\s\S]*>/i.test(text)
  ? text
  : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

const RICH_TEXT_CLASSES = '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline';

const FORMAT_BUTTONS = [
  { cmd: 'bold', icon: Bold, title: 'Bold (Ctrl+B)' },
  { cmd: 'italic', icon: Italic, title: 'Italic (Ctrl+I)' },
  { cmd: 'underline', icon: Underline, title: 'Underline (Ctrl+U)' },
  { cmd: 'insertUnorderedList', icon: List, title: 'Bullet list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Numbered list' },
  { cmd: 'createLink', icon: Link, title: 'Insert link' },
  { cmd: 'removeFormat', icon: RemoveFormatting, title: 'Clear formatting' }
];

const PRESET_DELAYS = [
  { label: '1 Day', days: 1, hours: 0 },
  { label: '2 Days', days: 2, hours: 0 },
  { label: '3 Days', days: 3, hours: 0 },
  { label: '5 Days', days: 5, hours: 0 },
  { label: '1 Week', days: 7, hours: 0 }
];

export default function DripSequenceStudio({ 
  campaign, 
  databaseHeaders = [], 
  templates = [], 
  onUpdate 
}) {
  const [steps, setSteps] = useState([]);
  const [activeStepTab, setActiveStepTab] = useState(1);
  const [activeInput, setActiveInput] = useState('body'); // 'subject' | 'body'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  // Fetch configured steps for campaign
  const fetchSteps = async () => {
    if (!campaign?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/drip-steps`);
      const data = await res.json();
      if (data.success && Array.isArray(data.steps) && data.steps.length > 0) {
        setSteps(data.steps);
      } else {
        // Fallback default step 1
        setSteps([{
          step_number: 1,
          delay_days: 0,
          delay_hours: 0,
          template_id: campaign.template_id || null,
          subject_a: campaign.subject_a || '',
          body_a: campaign.body_a || '',
          thread_reply: 1,
          is_active: 1
        }]);
      }
    } catch (err) {
      console.error('Failed to load drip steps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSteps();
  }, [campaign?.id]);

  const activeStep = steps.find(s => Number(s.step_number) === Number(activeStepTab)) || steps[0] || null;

  // Sync contentEditable innerHTML on tab switch or step load
  useEffect(() => {
    if (bodyRef.current && activeStep) {
      bodyRef.current.innerHTML = toHtml(activeStep.body_a || '');
    }
  }, [activeStepTab, activeStep?.step_number]);

  // Add Step 2 or Step 3
  const handleAddStep = () => {
    if (steps.length >= 3) return;
    const newStepNum = steps.length + 1;
    const defaultDelayDays = newStepNum === 2 ? 3 : 4;
    const initialSubject = steps[0]?.subject_a || campaign.subject_a || '';
    
    const newStep = {
      step_number: newStepNum,
      delay_days: defaultDelayDays,
      delay_hours: 0,
      template_id: null,
      subject_a: initialSubject ? `Re: ${initialSubject}` : '',
      body_a: '',
      subject_b: '',
      body_b: '',
      thread_reply: 1,
      is_active: 1
    };

    setSteps(prev => [...prev, newStep]);
    setActiveStepTab(newStepNum);
  };

  // Remove active step
  const handleRemoveStep = async (stepNum) => {
    if (stepNum === 1) {
      alert('Step 1 cannot be removed as it is the initial outreach message.');
      return;
    }
    if (!confirm(`Delete Step ${stepNum} from this sequence?`)) return;

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/drip-steps/${stepNum}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'info', message: `Step ${stepNum} removed.` });
        await fetchSteps();
        setActiveStepTab(1);
        if (onUpdate) onUpdate();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to remove step.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error deleting step: ' + err.message });
    }
  };

  // Update fields of active step in local state
  const updateActiveStep = (field, value) => {
    setSteps(prev => prev.map(s => {
      if (Number(s.step_number) === Number(activeStepTab)) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // Apply selected template into active step
  const handleSelectTemplate = (templateId) => {
    const selected = templates.find(t => String(t.id) === String(templateId));
    if (!selected) {
      updateActiveStep('template_id', null);
      return;
    }
    updateActiveStep('template_id', selected.id);
    if (!activeStep?.subject_a) {
      updateActiveStep('subject_a', selected.subject_a || '');
    }
    updateActiveStep('body_a', selected.body_a || '');
    if (bodyRef.current) {
      bodyRef.current.innerHTML = toHtml(selected.body_a || '');
    }
  };

  // Save all configured steps
  const handleSaveSteps = async () => {
    if (!campaign?.id) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/drip-steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps })
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Drip cadence sequence saved successfully!' });
        await fetchSteps();
        if (onUpdate) onUpdate();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to save steps.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Save error: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Send single test preview email for active step
  const handleSendTestStep = async () => {
    if (!testRecipient || !campaign?.id || !activeStep) return;
    setTestSending(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testRecipient,
          stepNumber: activeStep.step_number,
          customSubject: activeStep.subject_a,
          customBody: activeStep.body_a
        })
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || `Test preview sent for Step ${activeStepTab}.` });
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to send step test email.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error sending test: ' + err.message });
    } finally {
      setTestSending(false);
    }
  };

  // Insert variable at cursor position into active field (subject or rich body)
  const handleInsertVariable = (varName) => {
    const token = `{{${varName}}}`;
    if (activeInput === 'subject') {
      const el = subjectRef.current;
      if (el) {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const val = el.value || '';
        const updated = val.slice(0, start) + token + val.slice(end);
        updateActiveStep('subject_a', updated);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        }, 10);
      } else {
        updateActiveStep('subject_a', (activeStep?.subject_a || '') + ' ' + token);
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
      updateActiveStep('body_a', el.innerHTML);
    }
  };

  // Rich text formatting execution
  const handleFormat = (cmd) => {
    let arg;
    if (cmd === 'createLink') {
      const sel = window.getSelection();
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      arg = prompt('Link URL', 'https://');
      if (!arg || !range) return;
      if (bodyRef.current) {
        bodyRef.current.focus();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    document.execCommand(cmd, false, arg);
    if (bodyRef.current) {
      updateActiveStep('body_a', bodyRef.current.innerHTML);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-subtle rounded-xl p-8 text-center text-secondary text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
        Loading sequence studio...
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs space-y-5 text-left">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary tracking-tight">Multi-Step Drip Cadence Studio</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-subtle text-teal-600 dark:text-teal-400 border border-teal-500/30 font-mono">
                {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Automate multi-step follow-ups with customizable day delays and organic conversation threading.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {steps.length < 3 && (
            <button
              type="button"
              onClick={handleAddStep}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-subtle hover:bg-surface text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-subtle transition-all spring-press cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Follow-up Step
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveSteps()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all spring-press disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save Sequence
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
            : feedback.type === 'info'
            ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : feedback.type === 'info' ? (
              <Sliders className="w-4 h-4 shrink-0 text-indigo-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-secondary hover:text-primary text-xs underline ml-4 shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VISUAL STEP PIPELINE FLOW */}
      <div className="bg-canvas border border-subtle rounded-xl p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-x-auto">
          {steps.map((s) => {
            const isSelected = activeStepTab === s.step_number;
            const isStep1 = s.step_number === 1;

            return (
              <React.Fragment key={s.step_number}>
                {/* Delay indicator between steps */}
                {!isStep1 && (
                  <div className="flex items-center justify-center gap-1.5 py-1 sm:py-0 px-2 text-secondary text-xs shrink-0 font-mono">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>+{s.delay_days}d{s.delay_hours ? ` ${s.delay_hours}h` : ''}</span>
                    <span className="hidden sm:inline text-muted">───▶</span>
                  </div>
                )}

                {/* Step Card Node */}
                <button
                  type="button"
                  onClick={() => setActiveStepTab(s.step_number)}
                  className={`flex-1 min-w-[200px] flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-surface border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-xs' 
                      : 'bg-surface/60 border-subtle hover:border-default hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                        : 'bg-subtle text-muted'
                    }`}>
                      {s.step_number}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-primary truncate">
                          {isStep1 ? 'Step 1: Initial Pitch' : `Step ${s.step_number}: Follow-up ${s.step_number - 1}`}
                        </span>
                        {s.thread_reply === 1 && !isStep1 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                            Threaded
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate mt-0.5 font-mono">
                        {isStep1 ? 'Immediate dispatch' : `Wait ${s.delay_days}d cadence`}
                      </p>
                    </div>
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ACTIVE STEP CONFIGURATION PANEL */}
      {activeStep && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-subtle">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              Configuring Step {activeStep.step_number}
              <span className="text-[10px] text-muted font-normal lowercase font-sans">
                ({activeStep.step_number === 1 ? 'initial touch' : 'automated follow-up drip'})
              </span>
            </h4>

            <div className="flex items-center gap-3">
              {activeStep.step_number > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveStep(activeStep.step_number)}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Step {activeStep.step_number}
                </button>
              )}
            </div>
          </div>

          {/* DELAY INTERVAL TIMING (Step 2 & 3 only) */}
          {activeStep.step_number > 1 && (
            <div className="p-4 rounded-xl bg-canvas border border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Delay Cadence</span>
                </div>
                <span className="text-xs text-secondary">
                  Sends <strong className="text-primary font-mono">{activeStep.delay_days} days {activeStep.delay_hours ? `${activeStep.delay_hours} hrs` : ''}</strong> after Step {activeStep.step_number - 1}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">Delay Days</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={activeStep.delay_days}
                    onChange={(e) => updateActiveStep('delay_days', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-surface border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">Delay Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={activeStep.delay_hours || 0}
                    onChange={(e) => updateActiveStep('delay_hours', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-surface border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Quick Presets */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">Quick Presets</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_DELAYS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          updateActiveStep('delay_days', preset.days);
                          updateActiveStep('delay_hours', preset.hours);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                          activeStep.delay_days === preset.days && activeStep.delay_hours === preset.hours
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-surface text-secondary border-subtle hover:border-default'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORGANIC THREADING TOGGLE (Step 2 & 3 only) */}
          {activeStep.step_number > 1 && (
            <div className="p-4 rounded-xl bg-canvas border border-subtle flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <Switch
                  checked={activeStep.thread_reply === 1 || activeStep.thread_reply === true}
                  onChange={(val) => updateActiveStep('thread_reply', val ? 1 : 0)}
                  label="Organic In-Thread Reply (RFC 2822 In-Reply-To & References)"
                  badge="Recommended"
                  description="Preserves the initial message thread ID. Follow-ups automatically appear nested inside the same conversation in Gmail, Outlook, and Apple Mail."
                />
              </div>
              <DeliverabilityBeacon preset="threading" />
            </div>
          )}

          {/* TEMPLATE BINDING OR CUSTOM COPY */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Step {activeStep.step_number} Content
              </label>

              {/* Template selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">Load template:</span>
                <select
                  value={activeStep.template_id || ''}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="px-2.5 py-1 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Custom Inline Copy --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Header Variable Badges */}
            {databaseHeaders && databaseHeaders.length > 0 && (
              <div className="bg-canvas border border-subtle rounded-lg p-2.5 space-y-1.5">
                <span className="text-[10px] text-muted uppercase tracking-wider block font-semibold">
                  Click to insert variable from audience:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {databaseHeaders.map((header, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertVariable(header)}
                      className="text-[11px] px-2 py-0.5 rounded font-mono bg-surface text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 border border-subtle transition-colors cursor-pointer spring-press"
                      title={`Insert {{${header}}}`}
                    >
                      {`{{${header}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Input */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted uppercase tracking-wider block font-semibold">Subject Line</label>
              <input
                ref={subjectRef}
                type="text"
                value={activeStep.subject_a || ''}
                onChange={(e) => updateActiveStep('subject_a', e.target.value)}
                onFocus={() => setActiveInput('subject')}
                placeholder={activeStep.step_number > 1 ? `Re: ${steps[0]?.subject_a || campaign.subject_a || 'Initial Pitch'}` : 'Enter subject line...'}
                className="w-full px-3 py-2 bg-canvas border border-subtle rounded-lg text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Rich Body Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-muted uppercase tracking-wider block font-semibold">
                  Email Body (Rich HTML)
                </label>
                <div className="flex items-center gap-0.5 p-0.5 bg-canvas border border-subtle rounded-lg w-fit">
                  {FORMAT_BUTTONS.map(({ cmd, icon: Icon, title }) => (
                    <button
                      key={cmd}
                      type="button"
                      title={title}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleFormat(cmd)}
                      className="p-1 rounded text-secondary hover:text-primary hover:bg-subtle transition-colors cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={bodyRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => updateActiveStep('body_a', e.currentTarget.innerHTML)}
                onFocus={() => setActiveInput('body')}
                data-placeholder={activeStep.step_number > 1 
                  ? "Hi {{FirstName | \"there\"}},\n\nWanted to quickly follow up on my previous note. Did you have a chance to look over the details?\n\nBest,"
                  : "Hi {{FirstName | \"there\"}},\n\nSaw what your team is building at {{Company}}..."
                }
                className={`w-full min-h-[10rem] p-3 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500 font-sans leading-relaxed transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-muted ${RICH_TEXT_CLASSES}`}
              />
            </div>
          </div>

          {/* STEP TEST SEND PREVIEW CARD */}
          <div className="p-4 rounded-xl bg-canvas border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                Test Preview Step {activeStep.step_number}
              </div>
              <p className="text-[11px] text-secondary">
                Send an actual test preview of this step with sample merged data to your personal inbox.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="your.email@company.com"
                className="w-52 px-3 py-1.5 bg-surface border border-subtle rounded-lg text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendTestStep}
                disabled={testSending || !testRecipient}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors spring-press disabled:opacity-50 cursor-pointer shrink-0"
              >
                {testSending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
