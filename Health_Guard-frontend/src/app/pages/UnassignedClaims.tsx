import React, { useState, useEffect } from "react";
import { ArrowUpDown, Loader2, ExternalLink, ChevronDown, Clock, UserCheck } from "lucide-react";
import { useClaims } from "../state/ClaimContext";
import { useNavigate } from "react-router";
import apiClient from "../api/client";

interface UnassignedClaim {
  id: string;
  clientName: string;
  dateSubmitted: string;
  type: string;
  provider: string;
  amount: number;
  status: string;
}

export function UnassignedClaims() {
  const { assignClaim } = useClaims();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<UnassignedClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    fetchUnassigned();
  }, []);

  const fetchUnassigned = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/claims/unassigned');
      const body = response.data;
      const data = body.data || body;
      setClaims(data.map((item: any) => ({
        id: item.claim_id,
        clientName: item.client_name,
        dateSubmitted: item.date_submitted,
        type: item.type,
        provider: item.provider_name,
        amount: Number(item.amount),
        status: item.status,
      })));
    } catch {
      console.error('Failed to fetch unassigned claims');
    } finally {
      setIsLoading(false);
    }
  };

  const pendingClaims = claims
    .filter(c => c.status === 'Pending')
    .sort((a, b) => {
      const dateA = new Date(a.dateSubmitted).getTime();
      const dateB = new Date(b.dateSubmitted).getTime();
      return dateSort === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const handleManage = async (claimId: string) => {
    setAssigningId(claimId);
    try {
      await assignClaim(claimId);
      navigate(`/analyst/review/${claimId}`);
    } catch (err: any) {
      // If already assigned, just navigate to review
      if (err.response?.status === 409) {
        navigate(`/analyst/review/${claimId}`);
      } else {
        console.error('Failed to assign claim:', err);
      }
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full p-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Unassigned Claims</h2>
        <p className="text-gray-500 text-sm mt-0.5">Newly submitted claims awaiting review and assignment.</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 flex flex-col w-full shadow-sm">
        {/* Filters Row */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>
                <span className="font-medium text-gray-900">{pendingClaims.length}</span> claim{pendingClaims.length !== 1 ? 's' : ''} pending
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as 'desc' | 'asc')}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-md pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
              <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Claim ID</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Submitted</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Claim Type</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Amount</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading claims...
                  </td>
                </tr>
              ) : pendingClaims.length > 0 ? (
                pendingClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-1.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-blue-600 text-sm">{claim.id}</span>
                    </td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-900 font-medium">{claim.clientName}</td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(claim.dateSubmitted).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-500">{claim.type}</td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-500">{claim.provider}</td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      Rp {claim.amount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleManage(claim.id)}
                        disabled={assigningId === claim.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
                      >
                        {assigningId === claim.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Assigning...</>
                        ) : (
                          <><UserCheck className="w-3 h-3" /> Manage</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">No pending claims</p>
                      <p className="text-xs text-gray-400">All claims have been reviewed. Check back later.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 bg-white rounded-b-lg">
          <span>Showing <span className="font-medium text-gray-900">{pendingClaims.length}</span> pending claim{pendingClaims.length !== 1 ? 's' : ''}</span>
          <button
            onClick={fetchUnassigned}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
