import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useClaims, Claim } from '../state/ClaimContext';
import apiClient from '../api/client';
import {
  FileText, ZoomIn, ZoomOut, RotateCw, Download,
  AlertCircle, CheckCircle2, XCircle, HelpCircle,
  User, Hash, Activity, Banknote, ChevronDown, Check, FileImage, File,
  Loader2, RefreshCw, CreditCard
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending Review', color: 'bg-amber-100 text-amber-800', icon: AlertCircle, iconColor: 'text-amber-600' },
  { value: 'Approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  { value: 'Rejected', label: 'Rejected', color: 'bg-rose-100 text-rose-800', icon: XCircle, iconColor: 'text-rose-600' },
  { value: 'Needs Info', label: 'Needs Info', color: 'bg-blue-100 text-blue-800', icon: HelpCircle, iconColor: 'text-blue-600' },
  { value: 'Partially Approved', label: 'Partially Approved', color: 'bg-slate-200 text-slate-700', icon: CheckCircle2, iconColor: 'text-slate-500' },
];

interface DocFile {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export function AnalystReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { claims, updateClaimStatus } = useClaims();

  const claim = claims.find(c => c.id === id);

  const [status, setStatus] = useState<Claim['status']>(claim?.status || 'Pending');
  const [notes, setNotes] = useState(claim?.notes || '');
  const [approvedAmount, setApprovedAmount] = useState<string>(
    claim?.approvedAmount != null ? String(claim.approvedAmount) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Document viewer state
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [docKey, setDocKey] = useState(0); // used to force iframe reload

  const activeDoc = documents[activeDocIndex] ?? null;
  const isImage = activeDoc ? /\.(jpe?g|png|gif|webp)$/i.test(activeDoc.file_name) : false;
  const isPdf = activeDoc ? activeDoc.mime_type === 'application/pdf' || /\.pdf$/i.test(activeDoc.file_name) : false;
  const docUrl = activeDoc ? `/storage/${activeDoc.file_path.replace(/^storage\//, '')}` : '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch documents for this claim
  useEffect(() => {
    if (!id) return;
    const fetchDocs = async () => {
      setIsFetchingDocs(true);
      try {
        const res = await apiClient.get(`/claims/${id}/documents`);
        const data = res.data.data || res.data;
        setDocuments(Array.isArray(data) ? data : []);
      } catch {
        setDocuments([]);
      } finally {
        setIsFetchingDocs(false);
      }
    };
    fetchDocs();
  }, [id]);

  if (!claim) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Claim not found
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitError('');

    // Validate: only Partially Approved requires approved amount
    if (status === 'Partially Approved' && approvedAmount === '') {
      setSubmitError('Please enter the approved amount before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const approved = status === 'Partially Approved' && approvedAmount !== ''
        ? parseFloat(approvedAmount)
        : undefined;
      await updateClaimStatus(claim.id, status, notes, approved);
      navigate('/analyst');
    } catch (err) {
      console.error('Failed to update claim status:', err);
      setSubmitError('Failed to submit decision. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!activeDoc) return;
    const downloadUrl = `/api/claims/${claim.id}/documents/${activeDoc.id}/download`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = activeDoc.file_name;
    // Fetch the file as blob to trigger proper download
    const token = localStorage.getItem('auth_token');
    fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        // fallback: open in new tab
        window.open(downloadUrl, '_blank');
      });
  };

  const handleRefresh = () => {
    setDocKey(k => k + 1);
    setZoom(100);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      {/* Claim Context Header */}
      <div className="px-8 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-2xl font-semibold text-slate-900">Claim #{claim.id}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${STATUS_OPTIONS.find(o => o.value === status)?.color}`}>
              {status === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
              {STATUS_OPTIONS.find(o => o.value === status)?.label}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Submitted on {new Date(claim.dateSubmitted).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} via HealthGuard Platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analyst')}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel Review
          </button>
        </div>
      </div>

      {/* Split Screen Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE - Details and Document Viewer */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {/* Top Data Cards */}
          <div className="flex flex-col shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md shrink-0"><User size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client Name</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[50%]">{claim.clientName}</p>
            </div>

            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0"><Hash size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Provider Name</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[50%]">{claim.provider}</p>
            </div>

            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md shrink-0"><Activity size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diagnosis Code</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[50%]">{claim.type}</p>
            </div>

            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md shrink-0"><CreditCard size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">BPJS Number</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[50%]">{claim.bpjsNumber ?? <span className="text-slate-300">—</span>}</p>
            </div>

            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md shrink-0"><Banknote size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Billed</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[50%]">Rp {claim.amount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</p>
            </div>

            {/* Approved Billed - manually filled by analyst */}
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-md shrink-0"><Banknote size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Billed</span>
              </div>
              <div className="flex items-center gap-2 max-w-[50%]">
                <span className="text-sm text-slate-500">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  min={0}
                  value={approvedAmount ? Number(approvedAmount).toLocaleString('en-US') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setApprovedAmount(raw);
                  }}
                  placeholder="0"
                  disabled={status !== 'Partially Approved'}
                  className="w-36 px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Document Viewer Container */}
          <div className="flex-1 min-h-[500px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Document header with controls */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={18} className="text-blue-600 shrink-0" />
                {activeDoc ? (
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 leading-none mb-1 truncate">{activeDoc.file_name}</div>
                    <div className="text-xs text-slate-500">{formatFileSize(activeDoc.file_size)}</div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-400 leading-none mb-1">
                      {isFetchingDocs ? 'Loading documents...' : 'No documents attached'}
                    </div>
                  </div>
                )}
              </div>

              {activeDoc && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shrink-0">
                  <button
                    onClick={() => setZoom(z => Math.max(25, z - 25))}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-40"
                    title="Zoom Out"
                    disabled={zoom <= 25}
                  ><ZoomOut size={16} /></button>
                  <span className="text-xs font-medium px-2 text-slate-700 min-w-[3rem] text-center">{zoom}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(300, z + 25))}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-40"
                    title="Zoom In"
                    disabled={zoom >= 300}
                  ><ZoomIn size={16} /></button>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <button
                    onClick={handleRefresh}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Refresh"
                  ><RefreshCw size={16} /></button>
                  <button
                    onClick={handleDownload}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Download"
                  ><Download size={16} /></button>
                </div>
              )}
            </div>

            {/* Document list tabs (when multiple documents) */}
            {documents.length > 1 && (
              <div className="flex gap-0 border-b border-slate-200 bg-white overflow-x-auto shrink-0">
                {documents.map((doc, i) => (
                  <button
                    key={doc.id}
                    onClick={() => { setActiveDocIndex(i); setZoom(100); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                      i === activeDocIndex
                        ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {/\.(jpe?g|png|gif|webp)$/i.test(doc.file_name) ? <FileImage size={13} /> : <File size={13} />}
                    {doc.file_name}
                  </button>
                ))}
              </div>
            )}

            {/* Document preview area */}
            <div className="flex-1 bg-slate-200/40 overflow-auto flex justify-center items-start shadow-inner relative">
              {isFetchingDocs ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 p-8">
                  <Loader2 size={32} className="animate-spin" />
                  <span className="text-sm">Loading documents...</span>
                </div>
              ) : !activeDoc ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-8">
                  <FileText size={48} strokeWidth={1.2} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-500">No documents attached</p>
                    <p className="text-xs text-slate-400 mt-1">The client has not uploaded any documents for this claim.</p>
                  </div>
                </div>
              ) : isImage ? (
                <div className="p-4 flex justify-center" style={{ minWidth: '100%' }}>
                  <img
                    key={docKey}
                    src={docUrl}
                    alt={activeDoc.file_name}
                    className="max-w-full shadow-md border border-slate-200 rounded-sm transition-transform duration-200"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                    onError={() => {/* handled by fallback */}}
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  key={`${docKey}-${activeDoc.id}`}
                  src={docUrl}
                  title={activeDoc.file_name}
                  className="w-full h-full border-0"
                  style={{ minHeight: '600px', transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-8">
                  <File size={48} strokeWidth={1.2} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-500">{activeDoc.file_name}</p>
                    <p className="text-xs text-slate-400 mt-1">Preview not available for this file type. Use the download button.</p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE - Action Panel */}
        <div className="w-[360px] bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Decision Panel</h2>
              <p className="text-sm text-slate-500 mt-1">Review the documentation and submit a final determination.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Claim Status</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white border border-slate-200 text-left text-sm rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 px-3 py-2.5 shadow-sm transition-all hover:border-slate-300 outline-none flex items-center justify-between cursor-pointer"
                >
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1.5 ${STATUS_OPTIONS.find(o => o.value === status)?.color}`}>
                    {(() => {
                      const opt = STATUS_OPTIONS.find(o => o.value === status);
                      const Icon = opt?.icon;
                      return Icon ? <Icon size={14} className={opt.iconColor} /> : null;
                    })()}
                    {STATUS_OPTIONS.find(o => o.value === status)?.label}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setStatus(option.value as Claim['status']);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer ${status === option.value ? 'bg-slate-50' : ''}`}
                      >
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${option.color}`}>
                          <option.icon size={14} className={option.iconColor} />
                          {option.label}
                        </span>
                        {status === option.value && <Check size={16} className="text-slate-900" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Contextual hints */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              status === 'Rejected' || status === 'Needs Info' || status === 'Partially Approved' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {status === 'Rejected' && (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-sm text-rose-800 flex gap-2.5">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">Rejection requires a detailed explanation in the notes section referencing the specific policy clause.</p>
                </div>
              )}
              {status === 'Needs Info' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 flex gap-2.5">
                  <HelpCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">Please specify exactly what documents or information are missing from the provider or client.</p>
                </div>
              )}
              {status === 'Partially Approved' && (
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 flex gap-2.5">
                  <CheckCircle2 size={18} className="text-slate-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">Enter the approved amount in the Approved Billed field above. Notes explaining the partial approval are recommended.</p>
                </div>
              )}
            </div>

            <div className="space-y-2 flex flex-col h-56">
              <label htmlFor="notes" className="flex items-center justify-between text-sm font-medium text-slate-700">
                Analyst Notes
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">Internal</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter findings, policy references, or reasons for decision..."
                className="w-full flex-1 p-3.5 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-sm resize-none transition-all outline-none leading-relaxed text-slate-800 placeholder:text-slate-400"
              ></textarea>
            </div>
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-3 shrink-0">
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-sm text-rose-700 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <><CheckCircle2 size={16} /> Submit Decision</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
