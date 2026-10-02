import React from 'react';
import { Split, TrendingUp, BarChart2 } from 'lucide-react';

export default function ABTestingView({ setActiveTab }) {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">A/B Testing Experiments</h1>
        <p className="text-sm text-slate-400 mt-1">
          Compare Variant A vs Variant B subject lines and body copy with automated 50/50 cohort splitting.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center mx-auto mb-4">
          <Split className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">A/B Split-Testing Studio (Phase 5)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
          Phase 5 introduces our side-by-side A/B variant creator and comparative statistical conversion dashboard.
        </p>
        <button
          onClick={() => setActiveTab('settings')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          Check Gmail Connection First
        </button>
      </div>
    </div>
  );
}
