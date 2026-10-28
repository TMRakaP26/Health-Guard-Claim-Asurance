import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import apiClient from '../api/client';

export interface Claim {
  id: string;
  clientName: string;
  dateSubmitted: string;
  type: string;
  provider: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Needs Info' | 'Partially Approved';
  notes?: string;
  assignedTo?: string;
  approvedAmount?: number;
  bpjsNumber?: string;
}

interface PaginationInfo {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

interface ClaimContextType {
  claims: Claim[];
  pagination: PaginationInfo;
  addClaim: (claim: Omit<Claim, 'id' | 'dateSubmitted' | 'status'>) => Promise<Claim>;
  updateClaimStatus: (id: string, status: Claim['status'], notes?: string, approvedAmount?: number) => Promise<void>;
  updateClaim: (id: string, claimData: Partial<Claim>) => Promise<void>;
  fetchClaims: (page?: number) => Promise<void>;
  assignClaim: (id: string) => Promise<void>;
  isLoading: boolean;
}

function transformApiClaim(apiClaim: any): Claim {
  return {
    id: apiClaim.claim_id,
    clientName: apiClaim.client_name,
    dateSubmitted: apiClaim.date_submitted,
    type: apiClaim.type,
    provider: apiClaim.provider_name,
    amount: Number(apiClaim.amount),
    status: apiClaim.status,
    notes: apiClaim.notes,
    assignedTo: apiClaim.assigned_analyst?.name ?? undefined,
    approvedAmount: apiClaim.approved_amount != null ? Number(apiClaim.approved_amount) : undefined,
    bpjsNumber: apiClaim.bpjs_number ?? undefined,
  };
}

const ClaimContext = createContext<ClaimContextType | undefined>(undefined);

export function ClaimProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    total: 0,
  });

  const fetchClaims = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/claims?page=${page}&per_page=20`);
      const body = response.data;
      // Handle paginated vs non-paginated response
      if (body.data) {
        setClaims(body.data.map(transformApiClaim));
        setPagination({
          currentPage: body.current_page,
          lastPage: body.last_page,
          perPage: body.per_page,
          total: body.total,
        });
      } else {
        setClaims(body.map(transformApiClaim));
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addClaim = async (claimData: Omit<Claim, 'id' | 'dateSubmitted' | 'status'>): Promise<Claim> => {
    const payload: Record<string, any> = {
      client_name: claimData.clientName,
      type: claimData.type,
      provider_name: claimData.provider,
      amount: claimData.amount,
    };
    if (claimData.bpjsNumber) payload.bpjs_number = claimData.bpjsNumber;
    const response = await apiClient.post('/claims', payload);
    const newClaim = transformApiClaim(response.data);
    setClaims(prev => [newClaim, ...prev]);
    return newClaim;
  };

  const updateClaimStatus = async (id: string, status: Claim['status'], notes?: string, approvedAmount?: number) => {
    const payload: Record<string, any> = { status, notes };
    if (approvedAmount !== undefined) payload.approved_amount = approvedAmount;
    await apiClient.patch(`/claims/${id}/status`, payload);
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status, notes: notes || c.notes, approvedAmount: approvedAmount ?? c.approvedAmount } : c));
  };

  const updateClaim = async (id: string, claimData: Partial<Claim>) => {
    const payload: Record<string, any> = { status: 'Pending' };
    if (claimData.clientName !== undefined) payload.client_name = claimData.clientName;
    if (claimData.type !== undefined) payload.type = claimData.type;
    if (claimData.provider !== undefined) payload.provider_name = claimData.provider;
    if (claimData.amount !== undefined) payload.amount = claimData.amount;
    
    await apiClient.put(`/claims/${id}`, payload);
    // Reset status, approvedAmount, and notes on resubmission
    setClaims(prev => prev.map(c => c.id === id ? { ...c, ...claimData, status: 'Pending', approvedAmount: undefined, notes: undefined } : c));
  };

  const assignClaim = async (id: string) => {
    await apiClient.post(`/claims/${id}/assign`);
  };

  return (
    <ClaimContext.Provider value={{ claims, pagination, addClaim, updateClaimStatus, updateClaim, assignClaim, fetchClaims, isLoading }}>
      {children}
    </ClaimContext.Provider>
  );
}

export const useClaims = () => {
  const context = useContext(ClaimContext);
  if (!context) throw new Error('useClaims must be used within ClaimProvider');
  return context;
};
