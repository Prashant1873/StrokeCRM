import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Download, 
  ArrowRight, 
  Search, 
  FileCheck, 
  RefreshCw,
  SlidersHorizontal,
  Mail,
  Building,
  User
} from 'lucide-react';

export default function LeadsView({ setActiveTab }) {
  // Tab within Leads: 'import' | 'contacts'
  const [activeSubTab, setActiveSubTab] = useState('import');

  // File upload & parsing state
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedData, setParsedData] = useState(null); // { filename, headers, detectedFields, sampleRows, allRows, totalRows, validEmailCount, invalidEmailCount }

  // Column mapping state
  const [campaignName, setCampaignName] = useState(`Outreach - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
  const [emailCol, setEmailCol] = useState('');
  const [firstNameCol, setFirstNameCol] = useState('');
  const [companyCol, setCompanyCol] = useState('');

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Existing contacts list state
  const [contacts, setContacts] = useState([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef(null);

  // Fetch existing contacts
  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      const res = await fetch('/api/leads?limit=100');
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotalContacts(data.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setParsedData(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/leads/parse', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (json.success) {
        setParsedData(json.data);
        setEmailCol(json.data.detectedFields.email || (json.data.headers[0] || ''));
        setFirstNameCol(json.data.detectedFields.firstName || '');
        setCompanyCol(json.data.detectedFields.company || '');
      } else {
        setParseError(json.message);
      }
    } catch (err) {
      setParseError('Failed to upload and parse file: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || !emailCol) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const payload = {
        campaignName,
        rows: parsedData.allRows,
        fieldMapping: {
          email: emailCol,
          firstName: firstNameCol,
          company: companyCol
        }
      };

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setImportResult(data);
        fetchContacts();
        // Switch to contacts view after 1.5s
        setTimeout(() => {
          setActiveSubTab('contacts');
        }, 1200);
      } else {
        alert('Import failed: ' + data.message);
      }
    } catch (err) {
      alert('Import error: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearContacts = async () => {
    if (confirm('Are you sure you want to clear all imported contacts?')) {
      await fetch('/api/leads/clear', { method: 'POST' });
      fetchContacts();
      setParsedData(null);
      setFile(null);
    }
  };

  const handleDownloadSample = () => {
    window.open('/api/leads/sample-csv', '_blank');
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.first_name && c.first_name.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      {/* Header and Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Leads & Contact Lists
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {totalContacts} saved contacts
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ingest customer spreadsheets (.xlsx, .xls, .csv), auto-detect variables, and prepare outreach cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSubTab('import')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'import'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upload Spreadsheet
          </button>
          <button
            onClick={() => setActiveSubTab('contacts')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Contact Database ({totalContacts})
          </button>
        </div>
      </div>

      {activeSubTab === 'import' ? (
        <div className="space-y-6">
          {/* Dropzone & Quick Test Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Import Excel or CSV Spreadsheet</h2>
              <button
                onClick={handleDownloadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 transition-colors"
                title="Download 5 ready-to-test sample leads with rich headers"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-950/50 hover:bg-indigo-950/10 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                {isParsing ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-indigo-400" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-white">
                {file ? file.name : 'Click to upload or drag & drop'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Supports Excel (.xlsx, .xls) and CSV (.csv) with any custom headers.
              </p>
            </div>

            {parseError && (
              <div className="mt-4 p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Parsed Inspection & Mapping View */}
          {parsedData && (
            <div className="space-y-6">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase">Total Rows Detected</span>
                  <div className="text-2xl font-bold text-white mt-1">{parsedData.totalRows}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-medium text-emerald-400 uppercase">Valid Email Formats</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{parsedData.validEmailCount}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase">Custom Header Columns</span>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">{parsedData.headers.length}</div>
                </div>
              </div>

              {/* Column Mapping Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Column Header Mapping</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Recipient Email Column</span>
                      <span className="text-[10px] text-emerald-400 font-semibold uppercase">Required</span>
                    </label>
                    <select
                      value={emailCol}
                      onChange={(e) => setEmailCol(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {parsedData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">First Name Column</label>
                    <select
                      value={firstNameCol}
                      onChange={(e) => setFirstNameCol(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None / Custom Variable --</option>
                      {parsedData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Company Column</label>
                    <select
                      value={companyCol}
                      onChange={(e) => setCompanyCol(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None / Custom Variable --</option>
                      {parsedData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    All remaining headers ({parsedData.headers.filter(h => h !== emailCol && h !== firstNameCol && h !== companyCol).map(h => `{{${h}}}`).join(', ') || 'none'}) will be preserved for dynamic email templating.
                  </p>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting || !emailCol}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                    <span>Confirm & Import {parsedData.validEmailCount} Leads</span>
                  </button>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Spreadsheet Preview (First 10 Rows)</h3>
                  <span className="text-xs text-slate-400">Showing 10 of {parsedData.totalRows} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 w-12">#</th>
                        <th className="py-2.5 px-4">Status</th>
                        {parsedData.headers.map(h => (
                          <th key={h} className="py-2.5 px-4 whitespace-nowrap">
                            <span className={h === emailCol ? 'text-indigo-400 font-bold' : ''}>
                              {h}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {parsedData.sampleRows.map((row) => (
                        <tr key={row._rowId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 text-slate-500">{row._rowId}</td>
                          <td className="py-2.5 px-4">
                            {row._validEmail ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-rose-950/60 text-rose-400 border border-rose-500/20">
                                Invalid
                              </span>
                            )}
                          </td>
                          {parsedData.headers.map(h => (
                            <td key={h} className="py-2.5 px-4 whitespace-nowrap font-sans text-slate-300">
                              {String(row[h] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Saved Contacts Database View */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={handleClearContacts}
                disabled={contacts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Contacts
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
              >
                <span>Compose Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {filteredContacts.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white">No Contacts In Database</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Upload an Excel or CSV file in the "Upload Spreadsheet" tab to populate your leads.
                </p>
                <button
                  onClick={() => setActiveSubTab('import')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  Upload Leads Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-4">Dispatch Status</th>
                      <th className="py-3 px-4">Custom Variables</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredContacts.map(c => {
                      let customFields = {};
                      try {
                        customFields = JSON.parse(c.custom_fields || '{}');
                      } catch {}
                      const extraKeys = Object.keys(customFields).filter(k => k.toLowerCase() !== 'email' && k.toLowerCase() !== 'firstname' && k.toLowerCase() !== 'company');

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{c.first_name || '—'}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {c.email}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-slate-300">
                              <Building className="w-3 h-3 text-slate-500" />
                              {c.company || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {c.campaign_name || 'Default'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-800 text-amber-400 border border-slate-700">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {extraKeys.slice(0, 3).map(k => (
                                <span key={k} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono">
                                  {k}: {String(customFields[k])}
                                </span>
                              ))}
                              {extraKeys.length > 3 && (
                                <span className="text-[10px] text-slate-500">+{extraKeys.length - 3} more</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
