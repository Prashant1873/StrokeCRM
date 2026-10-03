import React, { useState, useEffect } from 'react';
import { 
  GitCommit, 
  Clock, 
  MessageSquare, 
  CornerDownRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  Mail, 
  Layers, 
  RefreshCw,
  FileText,
  Sliders
} from 'lucide-react';
import Switch from './common/Switch';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

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

  // Remove Step 2 or 3
  const handleRemoveStep = async (stepNum) => {
    if (stepNum <= 1) return;
    const filtered = steps.filter(s => s.step_number !== stepNum);
    // Renumber if needed
    const renumbered = filtered.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    setSteps(renumbered);
    setActiveStepTab(1);

    try {
      await fetch(`/api/campaigns/${campaign.id}/drip-steps/${stepNum}`, { method: 'DELETE' });
      setFeedback({ type: 'info', message: `Step ${stepNum} removed.` });
      handleSaveSteps(renumbered);
    } catch (err) {
      console.error('Failed to delete step on server:', err);
    }
  };

  // Update a field on active step
  const updateActiveStep = (field, value) => {
    setSteps(prev => prev.map(s => {
      if (s.step_number === activeStepTab) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // Template chosen for active step
  const handleSelectTemplate = (templateIdStr) => {
    const tmplId = templateIdStr ? Number(templateIdStr) : null;
    if (!tmplId) {
      updateActiveStep('template_id', null);
      return;
    }
    const chosen = templates.find(t => t.id === tmplId);
    if (chosen) {
      setSteps(prev => prev.map(s => {
        if (s.step_number === activeStepTab) {
          return {
            ...s,
            template_id: tmplId,
            subject_a: chosen.subject_a || s.subject_a,
            body_a: chosen.body_a || s.body_a,
            subject_b: chosen.subject_b || s.subject_b,
            body_b: chosen.body_b || s.body_b
          };
        }
        return s;
      }));
    }
  };

  // Save all sequence steps
  const handleSaveSteps = async (customSteps = null) => {
    const payloadSteps = customSteps || steps;
    if (!campaign?.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/drip-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: payloadSteps })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Drip sequence configuration saved successfully.' });
        if (data.steps) setSteps(data.steps);
        if (onUpdate) onUpdate();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to save drip sequence.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error saving sequence: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Isolated test send for active step
  const handleSendTestStep = async () => {
    if (!testRecipient || !testRecipient.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a test recipient email address.' });
      return;
    }
    setTestSending(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/send-step-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: activeStepTab,
          recipientEmail: testRecipient.trim()
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

  // Insert variable into active field
  const handleInsertVariable = (varName) => {
    const pill = `{{${varName}}}`;
    const currentBody = activeStep?.body_a || '';
    updateActiveStep('body_a', currentBody + (currentBody ? ' ' : '') + pill);
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        Loading sequence studio...
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 text-left">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Multi-Step Drip Cadence Studio</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automate multi-step follow-ups with customizable day delays and organic conversation threading.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {steps.length < 3 && (
            <button
              type="button"
              onClick={handleAddStep}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold border border-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              Add Follow-up Step
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveSteps()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
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
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : feedback.type === 'info'
            ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
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
            className="text-slate-400 hover:text-white text-xs underline ml-4 shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VISUAL STEP PIPELINE FLOW */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-x-auto">
          {steps.map((s, idx) => {
            const isSelected = activeStepTab === s.step_number;
            const isStep1 = s.step_number === 1;

            return (
              <React.Fragment key={s.step_number}>
                {/* Delay indicator between steps */}
                {!isStep1 && (
                  <div className="flex items-center justify-center gap-1.5 py-1 sm:py-0 px-2 text-slate-500 text-xs shrink-0 font-mono">
                    <Clock className="w-3 h-3 text-amber-400/80" />
                    <span>+{s.delay_days}d{s.delay_hours ? ` ${s.delay_hours}h` : ''}</span>
                    <span className="hidden sm:inline text-slate-700">───▶</span>
                  </div>
                )}

                {/* Step Card Node */}
                <button
                  type="button"
                  onClick={() => setActiveStepTab(s.step_number)}
                  className={`flex-1 min-w-[200px] flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-900 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-sm' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {s.step_number}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {isStep1 ? 'Step 1: Initial Pitch' : `Step ${s.step_number}: Follow-up ${s.step_number - 1}`}
                        </span>
                        {s.thread_reply === 1 && !isStep1 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                            Threaded
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                        {isStep1 ? 'Immediate dispatch' : `Wait ${s.delay_days}d delay`}
                      </p>
                    </div>
                  </div>

                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    s.is_active ? 'bg-emerald-400' : 'bg-slate-600'
                  }`} />
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ACTIVE STEP CONFIGURATION PANEL */}
      {activeStep && (
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-5 space-y-5">
          {/* Top Bar of Active Step */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Editing Step {activeStep.step_number}: {activeStep.step_number === 1 ? 'Initial Send' : `Follow-up ${activeStep.step_number - 1}`}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeStep.step_number === 1 ? '(Triggered upon campaign start)' : `(Delivered after Step ${activeStep.step_number - 1})`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {activeStep.step_number > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveStep(activeStep.step_number)}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Step {activeStep.step_number}
                </button>
              )}
            </div>
          </div>

          {/* DELAY INTERVAL TIMING (Step 2 & 3 only) */}
          {activeStep.step_number > 1 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Delay Cadence</span>
                </div>
                <span className="text-xs text-slate-400">
                  Sends <strong className="text-white font-mono">{activeStep.delay_days} days {activeStep.delay_hours ? `${activeStep.delay_hours} hrs` : ''}</strong> after Step {activeStep.step_number - 1}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Delay Days</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={activeStep.delay_days}
                    onChange={(e) => updateActiveStep('delay_days', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Delay Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={activeStep.delay_hours || 0}
                    onChange={(e) => updateActiveStep('delay_hours', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Quick Presets */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Quick Presets</label>
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
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
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
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <Switch
                checked={activeStep.thread_reply === 1 || activeStep.thread_reply === true}
                onChange={(val) => updateActiveStep('thread_reply', val ? 1 : 0)}
                label="Organic In-Thread Reply (In-Reply-To & References)"
                badge="Recommended"
                description="Preserves the initial email's Message-ID. Follow-ups automatically appear nested inside the same conversation thread in Gmail, Outlook, and Apple Mail."
              />
            </div>
          )}

          {/* TEMPLATE BINDING OR CUSTOM COPY */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Step {activeStep.step_number} Email Content
              </label>

              {/* Template selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Load template:</span>
                <select
                  value={activeStep.template_id || ''}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
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
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Click to insert dynamic variable from attached database:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {databaseHeaders.map((header, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertVariable(header)}
                      className="text-[11px] px-2 py-0.5 rounded font-mono bg-slate-950 text-indigo-300 hover:text-white hover:bg-indigo-600 border border-slate-800 transition-colors cursor-pointer"
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
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Subject Line</label>
              <input
                type="text"
                value={activeStep.subject_a || ''}
                onChange={(e) => updateActiveStep('subject_a', e.target.value)}
                placeholder={activeStep.step_number > 1 ? `Re: ${steps[0]?.subject_a || campaign.subject_a || 'Initial Pitch'}` : 'Enter subject line...'}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Body Editor */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Body Text (Plain text or HTML)</label>
              <textarea
                rows={6}
                value={activeStep.body_a || ''}
                onChange={(e) => updateActiveStep('body_a', e.target.value)}
                placeholder={activeStep.step_number > 1 
                  ? "Hi {{FirstName | \"there\"}},\n\nWanted to quickly follow up on my previous note. Did you have a chance to look over the details?\n\nBest,"
                  : "Hi {{FirstName | \"there\"}},\n\nSaw what your team is building at {{Company}}..."
                }
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed transition-colors"
              />
            </div>
          </div>

          {/* STEP TEST SEND PREVIEW CARD */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Test Preview Step {activeStep.step_number}
              </div>
              <p className="text-[11px] text-slate-400">
                Send an actual test preview of this step with sample merged data to your personal inbox.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="your.email@company.com"
                className="w-52 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendTestStep}
                disabled={testSending || !testRecipient}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                {testSending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-indigo-400" />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
