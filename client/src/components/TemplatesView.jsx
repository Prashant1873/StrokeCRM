import React from 'react';
import { FileText, Sparkles, ShieldAlert } from 'lucide-react';

export default function TemplatesView({ setActiveTab }) {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Templates & Spam Preflight</h1>
        <p className="text-sm text-slate-400 mt-1">
          Compose personalized email templates with dynamic variables and spam buzzword analysis.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">Template Engine & Spam Checker (Phase 3)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
          Phase 3 delivers real-time variable tags, per-contact rendering previews, and our anti-spam trigger word scoring system.
        </p>
        <button
          onClick={() => setActiveTab('settings')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          Go to Settings
        </button>
      </div>
    </div>
  );
}
