import React from 'react';
import { Users, UploadCloud, FileSpreadsheet } from 'lucide-react';

export default function LeadsView({ setActiveTab }) {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Leads & Contact Lists</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload spreadsheets (.xlsx, .xls, .csv) and map column headers to template variables.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">Lead Ingestion Engine (Phase 2)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
          This module unlocks in Phase 2. You will be able to upload any custom Excel or CSV file, preview rows, and map headers like {"{{FirstName}}"} and {"{{Company}}"}.
        </p>
        <button
          onClick={() => setActiveTab('settings')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          Verify Gmail Setup First
        </button>
      </div>
    </div>
  );
}
