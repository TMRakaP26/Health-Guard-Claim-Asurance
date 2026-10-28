import React, { useState, useEffect } from "react";
import { ArrowUpDown, Loader2, ChevronDown, ClipboardList, Clock, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router";
import apiClient from "../api/client";
import type { Claim } from "../state/ClaimContext";

interface AssignedClaim extends Claim {
  assignedToId: number;
}

export function MyAssignments() {
  const navigate = useNavigate();
  const [assignedClaims, setAssignedClaims] = useState<AssignedClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/claims/my-assignments');
      const body = response.data;
      const data = body.data || body;
      setAssignedClaims(data.map((item: any) => ({
        id: item.claim_id,
        clientName: item.client_name,
        dateSubmitted: item.date_submitted,
        type: item.type,
        provider: item.provider_name,
        amount: Number(item.amount),
        status: item.status,
        notes: item.notes,
        assignedToId: item.assigned_to,
        assignedTo: item.assigned_analyst?.name,
        approvedAmount: item.approved_amount != null ? Number(item.approved_amount) : undefined,
      })));
    } catch {
      console.error('Failed to fetch assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClaims = assignedClaims
    .filter(c => statusFilter === 'All' || c.status === statusFilter)
    .sort((a, b) => {
      const dateA = new Date(a.dateSubmitted).getTime();
      const dateB = new Date(b.dateSubmitted).getTime();
      return dateSort === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Approved</span>;
      case 'Pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>;
      case 'Rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Rejected</span>;
      case 'Needs Info':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Needs Info</span>;
      case 'Partially Approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300">Partially Approved</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full p-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">My Assignments</h2>
        <p className="text-gray-500 text-sm mt-0.5">Claims that you have taken responsibility for.</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 flex flex-col w-full shadow-sm">
        {/* Filters Row */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <ClipboardList className="w-4 h-4" />
            <span>
              <span className="font-medium text-gray-900">{filteredClaims.length}</span> assignment{filteredClaims.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="relative flex items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-md pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Needs Info">Needs Info</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Partially Approved">Partially Approved</option>
              </select>
              <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as 'desc' | 'asc')}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-md pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-gray-50 transition-colors"
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
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Claim ID</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Submitted</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-1.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading assignments...
                  </td>
                </tr>
              ) : filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="py-1.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-indigo-600 text-sm">{claim.id}</span>
                    </td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-900 font-medium">{claim.clientName}</td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(claim.dateSubmitted).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-500">{claim.type}</td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      Rp {claim.amount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-1.5 px-4 whitespace-nowrap">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="py-1.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/analyst/review/${claim.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">No assignments yet</p>
                      <p className="text-xs text-gray-400">Go to Unassigned Claims to take on a new claim.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 bg-white rounded-b-lg">
          <span>Showing <span className="font-medium text-gray-900">{filteredClaims.length}</span> of <span className="font-medium text-gray-900">{assignedClaims.length}</span> assignments</span>
          <button
            onClick={fetchAssignments}
            className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
