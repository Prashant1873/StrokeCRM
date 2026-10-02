import React from 'react';
import { Send, Plus, Clock, Play } from 'lucide-react';

export default function CampaignsView({ setActiveTab }) {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Outreach Campaigns</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create and run automated, human-paced email campaigns.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No Active Campaigns Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
          Phase 1 is establishing your Gmail connection. Next in Phase 2 & 3, we'll import your lead spreadsheet and configure email templates.
        </p>
        <button
          onClick={() => setActiveTab('settings')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
        >
          Check Gmail Connection First
        </button>
      </div>
    </div>
  );
}
