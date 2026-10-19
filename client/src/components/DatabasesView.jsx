import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Trash2, 
  Download, 
  Search, 
  RefreshCw,
  Eye, 
  Plus, 
  Lock, 
  Unlock, 
  X, 
  Send,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  XCircle,
  UserX,
  Tag
} from 'lucide-react';
import Switch from './common/Switch';

const SENTIMENT_CONFIG = {
  INTERESTED: {
    label: 'Interested',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Sparkles
  },
  QUESTION: {
    label: 'Question',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: HelpCircle
  },
  FOLLOW_UP: {
    label: 'Follow Up',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: Clock
  },
  NOT_INTERESTED: {
    label: 'Not Interested',
    badgeClass: 'bg-subtle text-secondary border-subtle',
    icon: XCircle
  },
  UNSUBSCRIBE: {
    label: 'Unsubscribe',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: UserX
  }
};

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
  const [inspectBouncedTotal, setInspectBouncedTotal] = useState(0);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectSearch, setInspectSearch] = useState('');
  const [inspectPage, setInspectPage] = useState(0);
  const [inspectSentiment, setInspectSentiment] = useState('ALL');
  const [inspectStatus, setInspectStatus] = useState('ALL');
  const [updatingRecordId, setUpdatingRecordId] = useState(null);

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
        alert('Import failed: ' + errMsg);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        setParsedData(null);
        fetchDatabases();
      } else {
        alert('Import failed: ' + data.message);
      }
    } catch (err) {
      alert('Import error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete database
  const handleDeleteDatabase = async (dbItem) => {
    if (dbItem.is_attached) {
      if (!confirm(`Warning: This lead audience is dedicated to campaign "${dbItem.campaign_name}". Deleting it will detach it. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete lead audience "${dbItem.name}"?`)) {
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

  // Open inspector modal and load paginated records
  const loadInspectRecords = async (dbId, sentiment = 'ALL', status = 'ALL') => {
    setInspectLoading(true);
    try {
      let url = `/api/databases/${dbId}?limit=50&offset=0`;
      if (sentiment && sentiment !== 'ALL') {
        url += `&sentiment=${encodeURIComponent(sentiment)}`;
      }
      if (status && status !== 'ALL') {
        url += `&status=${encodeURIComponent(status)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.database) {
        setInspectDb(data.database);
        setInspectRecords(data.records || []);
        setInspectTotal(data.totalCount ?? data.total ?? 0);
        setInspectBouncedTotal(data.bouncedCount ?? 0);
      }
    } catch (err) {
      console.error('Failed to load audience details:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleOpenInspector = async (dbItem) => {
    setInspectDb(dbItem);
    setInspectSentiment('ALL');
    setInspectStatus('ALL');
    setInspectPage(0);
    setInspectSearch('');
    await loadInspectRecords(dbItem.id, 'ALL', 'ALL');
  };

  const handleSentimentFilterChange = async (sentiment) => {
    setInspectSentiment(sentiment);
    if (inspectDb) {
      await loadInspectRecords(inspectDb.id, sentiment, inspectStatus);
    }
  };

  const handleStatusFilterChange = async (status) => {
    setInspectStatus(status);
    if (inspectDb) {
      await loadInspectRecords(inspectDb.id, inspectSentiment, status);
    }
  };

  // Manual 1-click Delivery Failure / Bounce override (mark as inaccurate)
  const handleMarkBounced = async (recordId) => {
    if (!inspectDb) return;
    if (!confirm('Mark this prospect email as inaccurate/bounced? Future scheduled follow-up steps will be halted.')) {
      return;
    }
    try {
      const res = await fetch(`/api/databases/${inspectDb.id}/records/${recordId}/mark-bounced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manually flagged as inaccurate email address by operator.' })
      });
      const data = await res.json();
      if (data.success) {
        setInspectRecords(prev => prev.map(r => {
          if (r.id === recordId) {
            return {
              ...r,
              status: 'BOUNCED',
              bounce_type: 'HARD',
              bounce_code: '550',
              bounce_reason: 'Manually flagged as inaccurate email address by operator.',
              bounced_at: new Date().toISOString(),
              next_step_scheduled_at: null
            };
          }
          return r;
        }));
        setInspectBouncedTotal(prev => prev + 1);
      } else {
        alert(data.message || 'Failed to mark lead as bounced.');
      }
    } catch (err) {
      alert('Error marking bounced: ' + err.message);
    }
  };

  // Manual Sentiment Override for a Record in Database Inspector (SENT-07)
  const handleOverrideRecordSentiment = async (recordId, newSentiment) => {
    if (!inspectDb) return;
    setUpdatingRecordId(recordId);
    try {
      const res = await fetch(`/api/databases/${inspectDb.id}/records/${recordId}/sentiment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentiment: newSentiment })
      });
      const data = await res.json();
      if (data.success) {
        setInspectRecords(prev => prev.map(r => {
          if (r.id === recordId) {
            return {
              ...r,
              sentiment: newSentiment,
              sentiment_provider: 'manual',
              sentiment_confidence: 1.0,
              sentiment_summary: `Manually classified as ${newSentiment} by operator.`,
              status: r.status === 'PENDING' || r.status === 'SENT' ? 'REPLIED' : r.status
            };
          }
          return r;
        }));
      } else {
        alert(data.message || 'Failed to update sentiment.');
      }
    } catch (err) {
      alert('Error updating sentiment: ' + err.message);
    } finally {
      setUpdatingRecordId(null);
    }
  };

  // Manual 1-click Disarm
  const handleMarkReplied = async (recordId) => {
    if (!inspectDb) return;
    try {
      const campId = inspectDb.campaign_id || 0;
      const res = await fetch(`/api/campaigns/${campId}/records/${recordId}/mark-replied`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setInspectRecords(prev => prev.map(r => {
          if (r.id === recordId) {
            return { ...r, status: 'REPLIED', replied_at: new Date().toISOString(), next_step_scheduled_at: null };
          }
          return r;
        }));
      } else {
        alert(data.message || 'Failed to log reply.');
      }
    } catch (err) {
      alert('Error logging reply: ' + err.message);
    }
  };

  // Manual 1-click Cancel next follow-up
  const handleCancelFollowup = async (recordId) => {
    if (!inspectDb) return;
    try {
      const campId = inspectDb.campaign_id || 0;
      const res = await fetch(`/api/campaigns/${campId}/records/${recordId}/cancel-followup`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setInspectRecords(prev => prev.map(r => {
          if (r.id === recordId) {
            return { ...r, status: 'CANCELLED', next_step_scheduled_at: null };
          }
          return r;
        }));
      } else {
        alert(data.message || 'Failed to cancel follow-up.');
      }
    } catch (err) {
      alert('Error cancelling follow-up: ' + err.message);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-primary">Lead Audiences</h1>
          </div>
          <p className="text-xs text-secondary mt-1">
            Isolated prospect datasets and custom column schemas. Each audience connects to cold outreach campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.open('/api/leads/sample-csv', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-subtle text-secondary hover:text-primary hover:bg-subtle text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Sample CSV
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all spring-press focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Import Lead Audience
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audiences by name, file, or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-subtle rounded-lg text-xs text-primary placeholder-muted focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-secondary">
          <span>Total Audiences: <strong className="text-primary">{databases.length}</strong></span>
          <span>•</span>
          <span>Available: <strong className="text-emerald-500 dark:text-emerald-400">{databases.filter(d => !d.is_attached).length}</strong></span>
          <span>•</span>
          <span>Dedicated: <strong className="text-indigo-500 dark:text-indigo-400">{databases.filter(d => d.is_attached).length}</strong></span>
        </div>
      </div>

      {/* Databases Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mb-3" />
          <p className="text-xs text-secondary">Loading lead audiences...</p>
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="border border-dashed border-subtle rounded-xl p-12 text-center bg-surface">
          <div className="w-12 h-12 rounded-xl bg-subtle flex items-center justify-center text-muted mx-auto mb-3">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-primary mb-1">No lead audiences found</h3>
          <p className="text-xs text-secondary max-w-md mx-auto mb-5">
            {searchQuery 
              ? 'No audiences matched your search query.' 
              : 'Import an Excel or CSV file to create your first isolated audience. Each list retains its custom variable headers.'}
          </p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all spring-press cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Import Audience Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatabases.map((dbItem) => (
            <div
              key={dbItem.id}
              className="bg-surface border border-subtle hover:border-default rounded-xl p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-subtle border border-subtle flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-primary truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" title={dbItem.name}>
                        {dbItem.name}
                      </h4>
                      <p className="text-[10px] text-muted truncate" title={dbItem.filename}>
                        {dbItem.filename}
                      </p>
                    </div>
                  </div>

                  {/* Attachment Status Badge */}
                  {dbItem.is_attached ? (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-subtle text-teal-600 dark:text-teal-400 border border-subtle shrink-0"
                      title={`Attached to Campaign: ${dbItem.campaign_name}`}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      Dedicated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-subtle text-emerald-600 dark:text-emerald-400 border border-subtle shrink-0">
                      <Unlock className="w-2.5 h-2.5" />
                      Available
                    </span>
                  )}
                </div>

                {/* Attached Campaign Notice */}
                {dbItem.is_attached && (
                  <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
                    <Send className="w-3 h-3 shrink-0" />
                    <span className="truncate">Outreach: <strong>{dbItem.campaign_name}</strong></span>
                  </div>
                )}

                {/* Stats Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2 mb-3 border-y border-subtle text-xs">
                  <div>
                    <span className="text-[10px] text-muted block">Total</span>
                    <span className="font-semibold text-primary">{dbItem.row_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block">Valid</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{dbItem.valid_email_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block">Bounced</span>
                    <span className={`font-semibold ${dbItem.bounced_count > 0 ? 'text-rose-500 font-bold' : 'text-muted'}`}>
                      {dbItem.bounced_count || 0}
                    </span>
                  </div>
                </div>

                {/* Column Headers Chips */}
                <div className="mb-4">
                  <span className="text-[10px] text-muted font-medium block mb-1.5 uppercase tracking-wider">
                    Header Schema ({Array.isArray(dbItem.headers) ? dbItem.headers.length : 0} Columns)
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {Array.isArray(dbItem.headers) && dbItem.headers.slice(0, 6).map((h, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                          h === dbItem.email_column 
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-300 font-bold'
                            : 'bg-subtle border-subtle text-secondary'
                        }`}
                      >
                        {`{{${h}}}`}
                      </span>
                    ))}
                    {Array.isArray(dbItem.headers) && dbItem.headers.length > 6 && (
                      <span className="text-[10px] text-muted px-1 py-0.5">
                        +{dbItem.headers.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-subtle gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenInspector(dbItem)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-subtle hover:bg-teal-500/10 active:scale-95 text-primary hover:text-teal-500 text-[11px] font-medium transition-all cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-muted" />
                  Inspect Audience
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteDatabase(dbItem)}
                  className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                  title="Delete Audience"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Spreadsheet Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-subtle rounded-2xl w-full max-w-lg shadow-2xl p-6 text-left">
            <div className="flex items-center justify-between border-b border-subtle pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-teal-500" />
                <h3 className="text-sm font-bold text-primary">Import Prospect Audience</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-muted hover:text-primary p-1 rounded-md hover:bg-subtle cursor-pointer"
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
                  className="border-2 border-dashed border-subtle hover:border-indigo-500/80 bg-canvas rounded-xl p-8 text-center cursor-pointer transition-all group"
                >
                  <UploadCloud className="w-10 h-10 text-muted group-hover:text-indigo-500 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-semibold text-primary mb-1">Click to select or drag and drop spreadsheet</p>
                  <p className="text-[11px] text-muted">Supports .xlsx, .xls, .csv up to 15MB</p>
                </div>

                {isParsing && (
                  <div className="flex items-center justify-center gap-2 text-xs text-indigo-500 py-3">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing file schema and columns...</span>
                  </div>
                )}

                {parseError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Configure & Map */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Audience Name</label>
                  <input
                    type="text"
                    value={customDbName}
                    onChange={(e) => setCustomDbName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Q4 Enterprise Founders"
                  />
                  <p className="text-[10px] text-muted mt-1">Original file: {parsedData.filename} ({parsedData.totalRows} rows)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-secondary block mb-1">Email Column *</label>
                    <select
                      value={selectedEmailCol}
                      onChange={(e) => setSelectedEmailCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                    >
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-secondary block mb-1">First Name (Opt.)</label>
                    <select
                      value={selectedFirstNameCol}
                      onChange={(e) => setSelectedFirstNameCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-secondary block mb-1">Company (Opt.)</label>
                    <select
                      value={selectedCompanyCol}
                      onChange={(e) => setSelectedCompanyCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-canvas border border-subtle rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-canvas border border-subtle">
                  <div>
                    <span className="text-xs font-medium text-primary block">Deduplicate Identical Emails</span>
                    <span className="text-[10px] text-muted">Only save the first occurrence of each email address</span>
                  </div>
                  <Switch
                    checked={deduplicate}
                    onChange={setDeduplicate}
                    ariaLabel="Deduplicate emails"
                  />
                </div>

                {/* Sample preview table */}
                <div>
                  <span className="text-[11px] font-medium text-secondary block mb-1.5">First 3 Rows Preview</span>
                  <div className="border border-subtle rounded-lg overflow-x-auto max-h-36">
                    <table className="w-full text-left text-[11px] text-secondary">
                      <thead className="bg-canvas text-muted border-b border-subtle sticky top-0">
                        <tr>
                          {parsedData.headers.slice(0, 5).map((h) => (
                            <th key={h} className="px-2.5 py-1.5 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {parsedData.sampleRows.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="hover:bg-subtle">
                            {parsedData.headers.slice(0, 5).map((h) => (
                              <td key={h} className="px-2.5 py-1.5 truncate max-w-[120px]">{String(row[h] || '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-subtle">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedData(null);
                      setUploadFile(null);
                    }}
                    className="px-3 py-1.5 text-xs text-secondary hover:text-primary cursor-pointer"
                  >
                    Change File
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={isUploading || !selectedEmailCol}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all spring-press disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving Audience...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Save Lead Audience
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
          <div className="bg-surface border border-subtle rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl p-6 text-left">
            <div className="flex items-center justify-between border-b border-subtle pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-sm font-bold text-primary">{inspectDb.name}</h3>
                  {inspectDb.is_attached ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-subtle text-teal-600 dark:text-teal-400 border border-subtle">
                      Dedicated to: {inspectDb.campaign_name}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-subtle text-emerald-600 dark:text-emerald-400 border border-subtle">
                      Available
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-secondary mt-0.5">
                  File: {inspectDb.filename} • {inspectTotal} Total Records • Email Column: <strong className="text-primary">{inspectDb.email_column}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(`/api/databases/${inspectDb.id}/export-bounces`, '_blank')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-all spring-press cursor-pointer"
                  title="Download CSV of inaccurate / delivery-failed email addresses"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Inaccurate ({inspectBouncedTotal})
                </button>

                <button
                  type="button"
                  onClick={() => setInspectDb(null)}
                  className="text-muted hover:text-primary p-1 rounded-md hover:bg-subtle cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Headers row */}
            <div className="mb-3">
              <span className="text-[10px] text-muted uppercase tracking-wider block mb-1">Available Dynamic Variable Tags:</span>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(inspectDb.headers) && inspectDb.headers.map((h, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-subtle text-secondary border border-subtle">
                    {`{{${h}}}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Status & Sentiment Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-subtle">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider mr-1">
                  Status:
                </span>
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    inspectStatus === 'ALL'
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-subtle text-secondary hover:text-primary hover:bg-subtle/80'
                  }`}
                >
                  All Statuses
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange('BOUNCED')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                    inspectStatus === 'BOUNCED'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 font-semibold ring-1 ring-offset-1 ring-rose-500'
                      : 'bg-surface text-secondary border-subtle hover:text-rose-500 hover:bg-rose-500/10'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  <span>Delivery Failures ({inspectBouncedTotal})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider mr-1">
                  Sentiment:
                </span>
                <button
                  type="button"
                  onClick={() => handleSentimentFilterChange('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    inspectSentiment === 'ALL'
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-subtle text-secondary hover:text-primary hover:bg-subtle/80'
                  }`}
                >
                  All
                </button>
                {Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => {
                  const IconComponent = cfg.icon;
                  const isSelected = inspectSentiment === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSentimentFilterChange(key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? `${cfg.badgeClass} font-semibold ring-1 ring-offset-1 ring-current`
                          : 'bg-surface text-secondary border-subtle hover:text-primary hover:bg-subtle'
                      }`}
                    >
                      <IconComponent className="w-3 h-3" />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table Records with Sticky Blurred Header */}
            <div className="flex-1 overflow-auto border border-subtle rounded-lg min-h-[300px] relative">
              {inspectLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
                  <p className="text-xs text-secondary">Loading records...</p>
                </div>
              ) : inspectRecords.length === 0 ? (
                <div className="py-20 text-center text-xs text-muted">
                  No records stored in this audience matching filter.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-secondary">
                  <thead className="sticky top-0 z-20 backdrop-blur-md bg-surface/90 text-secondary border-b border-subtle">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">#</th>
                      <th className="px-3 py-2.5 font-medium">Email</th>
                      <th className="px-3 py-2.5 font-medium">First Name</th>
                      <th className="px-3 py-2.5 font-medium">Company</th>
                      <th className="px-3 py-2.5 font-medium">Dispatch Status</th>
                      <th className="px-3 py-2.5 font-medium">AI Sentiment</th>
                      <th className="px-3 py-2.5 font-medium">Custom Fields</th>
                      <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle font-mono text-[11px]">
                    {inspectRecords.map((r, idx) => {
                      let custom = {};
                      try { custom = JSON.parse(r.custom_fields || '{}'); } catch {}
                      const isReplied = r.status === 'REPLIED';
                      const isCancelled = r.status === 'CANCELLED';
                      return (
                        <tr key={r.id || idx} className="hover:bg-subtle transition-colors">
                          <td className="px-3 py-2 text-muted">{idx + 1}</td>
                          <td className="px-3 py-2 text-primary font-medium">{r.email}</td>
                          <td className="px-3 py-2 text-secondary">{r.first_name || '-'}</td>
                          <td className="px-3 py-2 text-secondary">{r.company || '-'}</td>
                          <td className="px-3 py-2">
                            {r.status === 'BOUNCED' ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  <AlertTriangle className="w-2.5 h-2.5" /> BOUNCED ({r.bounce_type || 'HARD'})
                                </span>
                                {r.bounce_reason && (
                                  <span className="text-[9px] text-rose-500 dark:text-rose-400 font-sans line-clamp-1 max-w-[200px]" title={r.bounce_reason}>
                                    {r.bounce_code ? `[${r.bounce_code}] ` : ''}{r.bounce_reason}
                                  </span>
                                )}
                              </div>
                            ) : isReplied ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <MessageSquare className="w-2.5 h-2.5" /> REPLIED (DISARMED)
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans bg-subtle text-muted border border-subtle">
                                CANCELLED
                              </span>
                            ) : r.status === 'SENT' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">
                                DISPATCHED {r.current_step > 1 ? `(Step ${r.current_step})` : ''}
                              </span>
                            ) : r.status === 'FAILED' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                                FAILED
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                {r.next_step_scheduled_at ? 'WAITING DISPATCH' : 'PENDING'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {r.sentiment && SENTIMENT_CONFIG[r.sentiment] ? (
                              (() => {
                                const cfg = SENTIMENT_CONFIG[r.sentiment];
                                const IconComponent = cfg.icon;
                                const isUpdating = updatingRecordId === r.id;
                                return (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold border ${cfg.badgeClass}`}>
                                        <IconComponent className="w-2.5 h-2.5" />
                                        {cfg.label}
                                      </span>
                                      {r.sentiment_confidence != null && (
                                        <span className="text-[9px] text-muted font-sans font-medium" title={`Confidence: ${Math.round(r.sentiment_confidence * 100)}%`}>
                                          {Math.round(r.sentiment_confidence * 100)}%
                                        </span>
                                      )}
                                      <span className={`text-[8px] uppercase tracking-wider font-mono px-1 rounded ${
                                        r.sentiment_provider === 'gemini' 
                                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                                          : r.sentiment_provider === 'manual'
                                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                          : 'bg-subtle text-muted'
                                      }`}>
                                        {r.sentiment_provider || 'rule'}
                                      </span>
                                    </div>
                                    {r.sentiment_summary && (
                                      <p className="text-[10px] text-secondary font-sans line-clamp-1 max-w-[200px]" title={r.sentiment_summary}>
                                        {r.sentiment_summary}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1 font-sans">
                                      <label htmlFor={`override-sentiment-${r.id}`} className="sr-only">Override sentiment for {r.email}</label>
                                      <select
                                        id={`override-sentiment-${r.id}`}
                                        aria-label={`Override sentiment for ${r.email}`}
                                        disabled={isUpdating}
                                        value={r.sentiment}
                                        onChange={(e) => handleOverrideRecordSentiment(r.id, e.target.value)}
                                        className="text-[9px] bg-subtle border border-subtle rounded px-1 py-0.5 text-secondary hover:text-primary cursor-pointer disabled:opacity-50"
                                      >
                                        <option value="INTERESTED">Interested</option>
                                        <option value="QUESTION">Question</option>
                                        <option value="FOLLOW_UP">Follow Up</option>
                                        <option value="NOT_INTERESTED">Not Interested</option>
                                        <option value="UNSUBSCRIBE">Unsubscribe</option>
                                      </select>
                                      {isUpdating && <RefreshCw className="w-2.5 h-2.5 text-indigo-500 animate-spin" />}
                                    </div>
                                  </div>
                                );
                              })()
                            ) : isReplied ? (
                              <div className="flex items-center gap-1 font-sans">
                                <label htmlFor={`assign-sentiment-${r.id}`} className="sr-only">Assign sentiment for {r.email}</label>
                                <select
                                  id={`assign-sentiment-${r.id}`}
                                  aria-label={`Assign sentiment for ${r.email}`}
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) handleOverrideRecordSentiment(r.id, e.target.value);
                                  }}
                                  className="text-[10px] bg-subtle border border-subtle rounded px-1.5 py-0.5 text-secondary hover:text-primary cursor-pointer"
                                >
                                  <option value="" disabled>Set Sentiment...</option>
                                  <option value="INTERESTED">Interested</option>
                                  <option value="QUESTION">Question</option>
                                  <option value="FOLLOW_UP">Follow Up</option>
                                  <option value="NOT_INTERESTED">Not Interested</option>
                                  <option value="UNSUBSCRIBE">Unsubscribe</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-muted truncate max-w-[160px]" title={JSON.stringify(custom)}>
                            {Object.entries(custom).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ')}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              {r.status === 'BOUNCED' ? (
                                <span className="text-[10px] text-rose-500/80 font-mono italic">
                                  Inaccurate / Halted
                                </span>
                              ) : (
                                <>
                                  {!isReplied && (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkReplied(r.id)}
                                      title="Log lead reply and permanently disarm remaining follow-ups"
                                      className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition-colors spring-press cursor-pointer"
                                    >
                                      Log Reply & Disarm
                                    </button>
                                  )}
                                  {!isReplied && !isCancelled && (r.status === 'PENDING' || r.next_step_scheduled_at) && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelFollowup(r.id)}
                                      title="Cancel pending follow-up steps for this lead"
                                      className="px-2 py-0.5 rounded bg-subtle hover:bg-rose-500/15 text-secondary hover:text-rose-500 border border-subtle hover:border-rose-500/30 text-[10px] font-medium transition-colors spring-press cursor-pointer"
                                    >
                                      Cancel Follow-up
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleMarkBounced(r.id)}
                                    title="Flag email as inaccurate / bounced and disarm future steps"
                                    className="px-2 py-0.5 rounded bg-subtle hover:bg-rose-500/15 text-secondary hover:text-rose-500 border border-subtle hover:border-rose-500/30 text-[10px] font-medium transition-colors spring-press cursor-pointer"
                                  >
                                    Mark Inaccurate
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-subtle mt-3 text-xs text-secondary">
              <span>Showing {inspectRecords.length} of {inspectTotal} records</span>
              <button
                type="button"
                onClick={() => setInspectDb(null)}
                className="px-3 py-1.5 rounded-lg bg-subtle hover:bg-surface text-primary font-medium border border-subtle cursor-pointer"
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
