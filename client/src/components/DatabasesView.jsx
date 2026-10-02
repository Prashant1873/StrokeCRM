import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Download, 
  Search, 
  RefreshCw,
  SlidersHorizontal,
  Mail,
  Building,
  User,
  ShieldCheck,
  Send,
  Eye,
  Plus,
  Lock,
  Unlock,
  X,
  ArrowRight
} from 'lucide-react';
import Switch from './common/Switch';

export default function DatabasesView({ setActiveTab, navigate, currentRoute }) {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [customDbName, setCustomDbName] = useState('');
  const [selectedEmailCol, setSelectedEmailCol] = useState('');
  const [selectedFirstNameCol, setSelectedFirstNameCol] = useState('');
  const [selectedCompanyCol, setSelectedCompanyCol] = useState('');
  const [deduplicate, setDeduplicate] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Inspector modal state
  const [inspectDb, setInspectDb] = useState(null);
  const [inspectRecords, setInspectRecords] = useState([]);
  const [inspectTotal, setInspectTotal] = useState(0);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectSearch, setInspectSearch] = useState('');
  const [inspectPage, setInspectPage] = useState(0);

  const fileInputRef = useRef(null);

  // Fetch databases list
  const fetchDatabases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/databases');
      const data = await res.json();
      setDatabases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load databases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  // Handle route param inspection
  useEffect(() => {
    if (currentRoute?.name === 'database-detail' && currentRoute.params?.id) {
      handleOpenInspector({ id: currentRoute.params.id });
    }
  }, [currentRoute?.name, currentRoute?.params?.id]);

  // Handle file select for parsing
  const handleFileSelect = async (file) => {
    if (!file) return;
    setUploadFile(file);
    setIsParsing(true);
    setParseError(null);
    setParsedData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/databases/parse', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Server error (${res.status})`;
        try {
          const errJson = JSON.parse(text);
          if (errJson.message) errMsg = errJson.message;
        } catch {}
        setParseError(errMsg);
        return;
      }

      const json = await res.json();

      if (json.success) {
        setParsedData(json.data);
        setSelectedEmailCol(json.data.detectedFields.email || (json.data.headers[0] || ''));
        setSelectedFirstNameCol(json.data.detectedFields.firstName || '');
        setSelectedCompanyCol(json.data.detectedFields.company || '');
        setCustomDbName(file.name.replace(/\.[^/.]+$/, ''));
      } else {
        setParseError(json.message);
      }
    } catch (err) {
      setParseError('Failed to parse spreadsheet: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Submit new isolated database
  const handleConfirmUpload = async () => {
    if (!uploadFile || !selectedEmailCol) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', customDbName || uploadFile.name);
    formData.append('deduplicate', String(deduplicate));
    formData.append('fieldMapping', JSON.stringify({
      email: selectedEmailCol,
      firstName: selectedFirstNameCol,
      company: selectedCompanyCol
    }));

    try {
      const res = await fetch('/api/databases/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Server error (${res.status})`;
        try {
          const errJson = JSON.parse(text);
          if (errJson.message) errMsg = errJson.message;
        } catch {}
        alert('Upload failed: ' + errMsg);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        setParsedData(null);
        fetchDatabases();
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete database
  const handleDeleteDatabase = async (dbItem) => {
    if (dbItem.is_attached) {
      if (!confirm(`Warning: This database is dedicated to campaign "${dbItem.campaign_name}". Deleting it will detach it. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete the database "${dbItem.name}"?`)) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/databases/${dbItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDatabases();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Open Inspector
  const handleOpenInspector = async (dbItem) => {
    setInspectDb(dbItem);
    setInspectLoading(true);
    setInspectPage(0);
    try {
      const res = await fetch(`/api/databases/${dbItem.id}?limit=50&offset=0`);
      const data = await res.json();
      if (data && data.database) {
        setInspectDb(data.database);
        setInspectRecords(data.records || []);
        setInspectTotal(data.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to load database details:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Filtered databases
  const filteredDatabases = databases.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.filename?.toLowerCase().includes(q) ||
      d.campaign_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Databases</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Isolated spreadsheets and custom contact schemas. Each database belongs exclusively to one campaign.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.open('/api/leads/sample-csv', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Sample CSV
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Plus className="w-3.5 h-3.5" />
            Upload New Database
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search databases by name, file, or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Total Databases: <strong className="text-white">{databases.length}</strong></span>
          <span>•</span>
          <span>Available: <strong className="text-emerald-400">{databases.filter(d => !d.is_attached).length}</strong></span>
          <span>•</span>
          <span>Dedicated: <strong className="text-indigo-400">{databases.filter(d => d.is_attached).length}</strong></span>
        </div>
      </div>

      {/* Databases Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-3" />
          <p className="text-xs text-slate-400">Loading databases...</p>
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center bg-slate-900/30">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No databases found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
            {searchQuery 
              ? 'No databases matched your search query.' 
              : 'Upload an Excel or CSV file to create your first isolated database. Each database retains its custom headers.'}
          </p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Database Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatabases.map((dbItem) => (
            <div
              key={dbItem.id}
              className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors" title={dbItem.name}>
                        {dbItem.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate" title={dbItem.filename}>
                        {dbItem.filename}
                      </p>
                    </div>
                  </div>

                  {/* Attachment Status Badge */}
                  {dbItem.is_attached ? (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0"
                      title={`Attached to Campaign: ${dbItem.campaign_name}`}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      Dedicated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Unlock className="w-2.5 h-2.5" />
                      Available
                    </span>
                  )}
                </div>

                {/* Attached Campaign Notice */}
                {dbItem.is_attached && (
                  <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300 flex items-center gap-1.5">
                    <Send className="w-3 h-3 shrink-0" />
                    <span className="truncate">Campaign: <strong>{dbItem.campaign_name}</strong></span>
                  </div>
                )}

                {/* Stats Metrics */}
                <div className="grid grid-cols-2 gap-2 py-2 mb-3 border-y border-slate-800/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Records</span>
                    <span className="font-semibold text-white">{dbItem.row_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Valid Emails</span>
                    <span className="font-semibold text-emerald-400">{dbItem.valid_email_count || 0}</span>
                  </div>
                </div>

                {/* Column Headers Chips */}
                <div className="mb-4">
                  <span className="text-[10px] text-slate-500 font-medium block mb-1.5 uppercase tracking-wider">
                    Header Schema ({Array.isArray(dbItem.headers) ? dbItem.headers.length : 0} Columns)
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {Array.isArray(dbItem.headers) && dbItem.headers.slice(0, 6).map((h, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                          h === dbItem.email_column 
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 font-bold'
                            : 'bg-slate-800/70 border-slate-700/50 text-slate-300'
                        }`}
                      >
                        {`{{${h}}}`}
                      </span>
                    ))}
                    {Array.isArray(dbItem.headers) && dbItem.headers.length > 6 && (
                      <span className="text-[10px] text-slate-500 px-1 py-0.5">
                        +{dbItem.headers.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenInspector(dbItem)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-white text-[11px] font-medium transition-colors"
                >
                  <Eye className="w-3 h-3 text-slate-400" />
                  Inspect
                </button>

                {!dbItem.is_attached && (
                  <button
                    type="button"
                    onClick={() => {
                      if (navigate) {
                        navigate('#/campaigns');
                      }
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition-colors"
                    title="Launch Campaign with this Database"
                  >
                    <Send className="w-3 h-3" />
                    Launch
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => window.open(`/api/databases/${dbItem.id}/download`, '_blank')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Download raw file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteDatabase(dbItem)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Database Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Upload Isolated Database</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!parsedData ? (
              /* Step 1: Drop zone */
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/40 rounded-xl p-8 text-center cursor-pointer transition-all group"
                >
                  <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-semibold text-white mb-1">Click to select or drag and drop spreadsheet</p>
                  <p className="text-[11px] text-slate-500">Supports .xlsx, .xls, .csv up to 15MB</p>
                </div>

                {isParsing && (
                  <div className="flex items-center justify-center gap-2 text-xs text-indigo-400 py-3">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing file schema and columns...</span>
                  </div>
                )}

                {parseError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Configure & Map */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Database Name</label>
                  <input
                    type="text"
                    value={customDbName}
                    onChange={(e) => setCustomDbName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Q4 Enterprise Founders"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Original file: {parsedData.filename} ({parsedData.totalRows} rows)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">Email Column *</label>
                    <select
                      value={selectedEmailCol}
                      onChange={(e) => setSelectedEmailCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">First Name (Opt.)</label>
                    <select
                      value={selectedFirstNameCol}
                      onChange={(e) => setSelectedFirstNameCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">Company (Opt.)</label>
                    <select
                      value={selectedCompanyCol}
                      onChange={(e) => setSelectedCompanyCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-medium text-white block">Deduplicate Identical Emails</span>
                    <span className="text-[10px] text-slate-500">Only save the first occurrence of each email address</span>
                  </div>
                  <Switch
                    checked={deduplicate}
                    onChange={setDeduplicate}
                    ariaLabel="Deduplicate emails"
                  />
                </div>

                {/* Sample preview table */}
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">First 3 Rows Preview</span>
                  <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-36">
                    <table className="w-full text-left text-[11px] text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          {parsedData.headers.slice(0, 5).map((h) => (
                            <th key={h} className="px-2.5 py-1.5 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {parsedData.sampleRows.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            {parsedData.headers.slice(0, 5).map((h) => (
                              <td key={h} className="px-2.5 py-1.5 truncate max-w-[120px]">{String(row[h] || '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedData(null);
                      setUploadFile(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Change File
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={isUploading || !selectedEmailCol}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving Database...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Save Isolated Database
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspector Modal */}
      {inspectDb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">{inspectDb.name}</h3>
                  {inspectDb.is_attached ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Dedicated to: {inspectDb.campaign_name}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Available
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  File: {inspectDb.filename} • {inspectTotal} Total Records • Email Column: <strong className="text-white">{inspectDb.email_column}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectDb(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Headers row */}
            <div className="mb-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Available Dynamic Variable Tags:</span>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(inspectDb.headers) && inspectDb.headers.map((h, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
                    {`{{${h}}}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Table Records */}
            <div className="flex-1 overflow-auto border border-slate-800 rounded-lg min-h-[300px]">
              {inspectLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                  <p className="text-xs text-slate-400">Loading records...</p>
                </div>
              ) : inspectRecords.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-500">
                  No records stored in this database.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">First Name</th>
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Custom Fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {inspectRecords.map((r, idx) => {
                      let custom = {};
                      try { custom = JSON.parse(r.custom_fields || '{}'); } catch {}
                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-800/30">
                          <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 text-white font-medium">{r.email}</td>
                          <td className="px-3 py-2 text-slate-300">{r.first_name || '-'}</td>
                          <td className="px-3 py-2 text-slate-300">{r.company || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans ${
                              r.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400' :
                              r.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {r.status || 'PENDING'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-slate-400 truncate max-w-[200px]" title={JSON.stringify(custom)}>
                            {Object.entries(custom).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-3 text-xs text-slate-400">
              <span>Showing {inspectRecords.length} of {inspectTotal} records</span>
              <button
                type="button"
                onClick={() => setInspectDb(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
