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
  ArrowLeft,
  Search, 
  FileCheck, 
  RefreshCw,
  SlidersHorizontal,
  Mail,
  Building,
  User,
  ShieldCheck,
  Check,
  Database
} from 'lucide-react';
import Switch from './common/Switch';

export default function LeadsView({ setActiveTab, navigate, currentRoute }) {
  // Tab within Leads: 'wizard' | 'contacts'
  const [activeSubTab, setActiveSubTab] = useState('wizard');

  // Wizard Step: 1 = Upload, 2 = Map & Options, 3 = Preview & Confirm
  const [currentStep, setCurrentStep] = useState(1);

  // File upload & parsing state
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedData, setParsedData] = useState(null); // { filename, headers, detectedFields, sampleRows, allRows, totalRows, validEmailCount, invalidEmailCount }

  // Step 2: Column mapping & Options
  const [campaignName, setCampaignName] = useState(`Outreach - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
  const [emailCol, setEmailCol] = useState('');
  const [firstNameCol, setFirstNameCol] = useState('');
  const [companyCol, setCompanyCol] = useState('');
  const [deduplicateEmails, setDeduplicateEmails] = useState(true);
  const [fallbackMissingNames, setFallbackMissingNames] = useState(true);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Existing contacts list state
  const [contacts, setContacts] = useState([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef(null);

  // Synchronize wizard step with URL route if present
  useEffect(() => {
    if (currentRoute?.name === 'leads-upload') {
      setActiveSubTab('wizard');
      setCurrentStep(1);
    } else if (currentRoute?.name === 'leads-map') {
      setActiveSubTab('wizard');
      setCurrentStep(2);
    } else if (currentRoute?.name === 'leads-preview') {
      setActiveSubTab('wizard');
      setCurrentStep(3);
    }
  }, [currentRoute?.name]);

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
        // Advance to Step 2
        setCurrentStep(2);
        if (navigate) navigate('#/leads/map');
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
        deduplicate: deduplicateEmails,
        fallbackNames: fallbackMissingNames,
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
      setCurrentStep(1);
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

  const steps = [
    { num: 1, title: 'Upload Spreadsheet', path: '#/leads/upload' },
    { num: 2, title: 'Map Variables & Rules', path: '#/leads/map' },
    { num: 3, title: 'Validate & Ingest', path: '#/leads/preview' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6 text-left">
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
            Indexed 3-step lead ingestion wizard with variable mapping, duplicate protection, and validation.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              setActiveSubTab('wizard');
              if (navigate) navigate(steps[currentStep - 1].path);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'wizard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ingestion Wizard
          </button>
          <button
            onClick={() => {
              setActiveSubTab('contacts');
              if (navigate) navigate('#/leads');
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Database ({totalContacts})
          </button>
        </div>
      </div>

      {activeSubTab === 'wizard' ? (
        <div className="space-y-6">
          {/* Wizard Step Progression Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              {steps.map((s) => {
                const isCurrent = currentStep === s.num;
                const isComplete = currentStep > s.num;
                const isClickable = s.num === 1 || (s.num <= 2 && parsedData) || (s.num === 3 && parsedData);

                return (
                  <button
                    key={s.num}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => {
                      setCurrentStep(s.num);
                      if (navigate) navigate(s.path);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isCurrent
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                        : isComplete
                        ? 'bg-slate-950/60 border-slate-800/80 text-emerald-400 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-800/40 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isComplete 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : isCurrent 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isComplete ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Step {s.num}
                      </div>
                      <div className="text-xs font-bold truncate text-slate-200">
                        {s.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 1: Upload Dropzone */}
          {currentStep === 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Step 1: Upload Contact Spreadsheet</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload your leads in .xlsx, .xls, or .csv format. Headers will be extracted dynamically.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 transition-colors"
                  title="Download ready-to-test sample leads CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-xl p-12 text-center cursor-pointer transition-all bg-slate-950/50 hover:bg-indigo-950/10 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  {isParsing ? (
                    <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-indigo-400" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {file ? file.name : 'Click to select or drag & drop spreadsheet'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Supports Excel (.xlsx, .xls) and CSV (.csv) with unlimited custom variables.
                </p>
              </div>

              {parseError && (
                <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {parsedData && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-400 font-medium">
                    ✓ Spreadsheet loaded: {parsedData.filename} ({parsedData.totalRows} rows)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(2);
                      if (navigate) navigate('#/leads/map');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                  >
                    <span>Proceed to Step 2 (Map Variables)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Map Variables & Duplicate Rules */}
          {currentStep === 2 && parsedData && (
            <div className="space-y-6">
              {/* Header Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase">Rows Ingested</span>
                  <div className="text-2xl font-bold text-white mt-1">{parsedData.totalRows}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-medium text-emerald-400 uppercase">Valid Email Headers</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{parsedData.validEmailCount}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase">Variable Headers</span>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">{parsedData.headers.length}</div>
                </div>
              </div>

              {/* Column Mapping Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">Step 2: Column Header Mapping</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    File: {parsedData.filename}
                  </span>
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

                {/* Additional Step 2 Option Switches */}
                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Ingestion Safeguard Options
                  </h4>

                  <Switch
                    id="dedup-switch"
                    checked={deduplicateEmails}
                    onChange={setDeduplicateEmails}
                    label="Deduplicate Recipient Emails"
                    description="Automatically skips duplicate email entries in the spreadsheet to prevent double-messaging prospects."
                    badge="Safety"
                  />

                  <Switch
                    id="fallback-names-switch"
                    checked={fallbackMissingNames}
                    onChange={setFallbackMissingNames}
                    label="Auto-fallback Empty First Names to 'there'"
                    description="If recipient first name is missing or blank, automatically uses 'there' so {{FirstName}} renders naturally as 'Hi there'."
                  />
                </div>

                {/* Navigation Bar between steps */}
                <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      if (navigate) navigate('#/leads/upload');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Step 1 (Upload)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(3);
                      if (navigate) navigate('#/leads/preview');
                    }}
                    disabled={!emailCol}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <span>Proceed to Step 3 (Preview & Validate)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Confirm */}
          {currentStep === 3 && parsedData && (
            <div className="space-y-6">
              {/* Preview Table Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Step 3: Lead List Preflight Inspection</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Review parsed contact records and email validity before committing to database.
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Showing 10 of {parsedData.totalRows} leads
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 w-12">#</th>
                        <th className="py-2.5 px-4">Validity</th>
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
                            <td key={h} className="py-2.5 px-4 whitespace-nowrap text-slate-200">
                              {row[h] || <span className="text-slate-600 font-sans italic">blank</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import Confirmation Bar */}
                <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(2);
                      if (navigate) navigate('#/leads/map');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Step 2 (Mapping)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting || !emailCol}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                    <span>Confirm & Ingest {parsedData.validEmailCount} Leads</span>
                  </button>
                </div>
              </div>

              {/* Import Result Notification */}
              {importResult && (
                <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Successfully Ingested {importResult.importedCount} Contacts!</div>
                      <div className="text-xs text-emerald-300/80">
                        Campaign &quot;{campaignName}&quot; created with ready queue.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate ? navigate('#/campaigns') : setActiveTab('campaigns')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all"
                    >
                      Open Campaign Cockpit
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('contacts')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      View Database
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Subtab 2: Contacts Database Table */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by email, name, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchContacts}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Refresh contacts"
              >
                <RefreshCw className={`w-4 h-4 ${contactsLoading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button
                onClick={handleClearContacts}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 w-12">#</th>
                  <th className="py-2.5 px-4">Recipient Email</th>
                  <th className="py-2.5 px-4">First Name</th>
                  <th className="py-2.5 px-4">Company</th>
                  <th className="py-2.5 px-4">Campaign</th>
                  <th className="py-2.5 px-4">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      {searchQuery ? 'No contacts match your search query.' : 'No contacts in database yet. Use Ingestion Wizard to upload a spreadsheet.'}
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-slate-800/40 transition-colors font-sans">
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono font-medium text-indigo-300">{c.email}</td>
                      <td className="py-2.5 px-4 text-slate-300">{c.first_name || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-300">{c.company || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-400">{c.campaign_name || `ID #${c.campaign_id}`}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
