import { useState, useEffect } from "react";
import { FileText, TrendingUp, Activity, Search, Filter, X, Loader2, Banknote, CheckCircle, AlertCircle, Pencil } from "lucide-react";
import { useClaims, Claim } from "../state/ClaimContext";
import { useNavigate, useSearchParams } from "react-router";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Pending":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1 h-1 rounded-full bg-amber-400 mr-1.5"></span>
          Pending
        </span>
      );
    case "Needs Info":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1 h-1 rounded-full bg-blue-400 mr-1.5"></span>
          Needs Info
        </span>
      );
    case "Approved":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1.5"></span>
          Approved
        </span>
      );
    case "Rejected":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1 h-1 rounded-full bg-rose-400 mr-1.5"></span>
          Rejected
        </span>
      );
    case "Partially Approved":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
          <span className="w-1 h-1 rounded-full bg-slate-400 mr-1.5"></span>
          Partially Approved
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
};

export function Dashboard() {
  const { claims, fetchClaims, isLoading } = useClaims();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const filteredClaims = claims.filter(c => 
    !searchQuery || 
    c.id.toLowerCase().includes(searchQuery) ||
    c.provider.toLowerCase().includes(searchQuery) ||
    c.type.toLowerCase().includes(searchQuery) ||
    c.status.toLowerCase().includes(searchQuery)
  );

  const activeClaims = filteredClaims.length;
  const pendingClaims = filteredClaims.filter(c => c.status === 'Pending').length;
  
  const totalPayouts = filteredClaims
    .filter(c => c.status === 'Approved' || c.status === 'Partially Approved')
    .reduce((sum, c) => sum + (c.approvedAmount ?? c.amount), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-12 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <button 
          onClick={() => navigate('/client/submit')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 mr-2" />
          Submit Claim
        </button>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center space-x-4">
          <div className="p-2.5 bg-blue-50/50 rounded-md text-blue-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Total Active Claims</p>
            <div className="flex items-baseline space-x-3">
              <h3 className="text-2xl font-bold text-slate-800">{activeClaims}</h3>
              <p className="text-xs font-medium text-amber-500 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                {pendingClaims} Pending
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center space-x-4">
          <div className="p-2.5 bg-emerald-50/50 rounded-md text-emerald-500">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Recent Payouts</p>
            <div className="flex items-baseline space-x-3">
              <h3 className="text-2xl font-bold text-slate-800">Rp {totalPayouts.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</h3>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Claims List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Recent Claims</h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 bg-transparent border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
              />
            </div>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded transition-colors cursor-pointer">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Claim ID</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date Submitted</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Provider Name</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Billed Amount</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Approved Amount</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Analyst</th>
                <th className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-700">{claim.id}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500">
                    {new Date(claim.dateSubmitted).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-700">
                    {claim.provider}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs font-medium text-slate-700">
                    Rp {claim.amount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs">
                    {claim.approvedAmount != null
                      ? <span className="font-medium text-emerald-600">Rp {claim.approvedAmount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</span>
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    {getStatusBadge(claim.status)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500">
                    {claim.assignedTo ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right text-[11px] font-medium">
                    <button 
                      onClick={() => setSelectedClaim(claim)}
                      className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading claims...
                  </td>
                </tr>
              ) : claims.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No claims submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <h3 className="font-semibold text-slate-800">Claim Details</h3>
                {getStatusBadge(selectedClaim.status)}
              </div>
              <button 
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Rejection / Partial Approval Banner */}
              {(selectedClaim.status === 'Rejected' || selectedClaim.status === 'Partially Approved') && (
                <div className={`rounded-lg p-3.5 flex items-start gap-2.5 text-sm ${
                  selectedClaim.status === 'Rejected'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-slate-100 border border-slate-200 text-slate-700'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    selectedClaim.status === 'Rejected' ? 'text-rose-500' : 'text-slate-500'
                  }`} />
                  <div>
                    <p className="font-semibold text-xs mb-0.5">
                      {selectedClaim.status === 'Rejected' ? 'This claim was rejected' : 'This claim was partially approved'}
                    </p>
                    {selectedClaim.notes && (
                      <p className="text-xs leading-relaxed opacity-90">{selectedClaim.notes}</p>
                    )}
                    <p className="text-xs mt-1.5 font-medium">
                      You can edit and resubmit this claim below.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Claim ID</p>
                  <p className="text-sm font-medium text-slate-800">{selectedClaim.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Date Submitted</p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(selectedClaim.dateSubmitted).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Provider</p>
                  <p className="text-sm font-medium text-slate-800">{selectedClaim.provider}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Amount Billed</p>
                  <p className="text-sm font-medium text-slate-800">Rp {selectedClaim.amount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</p>
                </div>
                {selectedClaim.approvedAmount != null && (
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Approved Amount</p>
                    <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Rp {selectedClaim.approvedAmount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <h4 className="text-xs font-semibold text-slate-800 mb-2">Analyst Notes & Reasoning</h4>
                {selectedClaim.notes ? (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedClaim.notes}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    No notes have been added by an analyst yet.
                  </p>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {(selectedClaim.status === 'Rejected' || selectedClaim.status === 'Partially Approved') ? (
                <button 
                  onClick={() => {
                    setSelectedClaim(null);
                    navigate('/client/submit', { state: { editClaim: selectedClaim } });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Edit & Resubmit
                </button>
              ) : (
                <div />
              )}
              <button 
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}