export type Role = "client" | "analyst" | "admin";
export const statuses = [
  "Pending",
  "Approved",
  "Rejected",
  "Needs Info",
  "Partially Approved",
] as const;
export type Status = (typeof statuses)[number];
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  username: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  bpjs_number: string | null;
  profile_photo: string | null;
  email_verified_at: string | null;
  two_factor_enabled: boolean;
  is_active: boolean;
  pending_assignments?: number;
  overdue_assignments?: number;
}
export interface Document {
  id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  request_id: number | null;
  message_id: number | null;
}
export interface Claim {
  id: number;
  claim_id: string;
  user_id: number;
  client_name: string;
  provider_name: string;
  type: string;
  amount: string;
  approved_amount: string | null;
  status: Status;
  notes: string | null;
  date_submitted: string;
  patient_date_of_birth: string | null;
  service_date: string | null;
  bpjs_number: string | null;
  assigned_to: number | null;
  assigned_analyst?: { id: number; name: string };
  documents?: Document[];
  sla_due_at: string;
}
export interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  meta?: { current_page: number; last_page: number; total: number };
}
export interface ClaimPage extends Page<Claim> {
  stats: {
    total: number;
    amount: string;
    approved_amount: string;
    by_status: Partial<Record<Status, number>>;
  };
}
export interface History {
  id: number;
  event: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  approved_amount: string | null;
  created_at: string;
  actor: { name: string } | null;
  metadata: Record<string, unknown> | null;
}
export interface Message {
  id: number;
  body: string;
  created_at: string;
  user: { name: string } | null;
  documents: Document[];
}
export interface DocumentRequest {
  id: number;
  title: string;
  instructions: string;
  status: string;
}
export interface Payment {
  id: number;
  status: "paid" | "settled";
  amount: string;
  reference: string;
  paid_at: string;
}
export interface CatalogItem {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  address?: string;
  diagnosis_code?: string;
  coverage_limit?: string | null;
  coverage_rules?: string | null;
}
export interface Catalog {
  providers: CatalogItem[];
  categories: CatalogItem[];
  features: {
    messages: boolean;
    payments: boolean;
    email: boolean;
    realtime: boolean;
    retention: boolean;
  };
  max_amount: number;
}
export interface ClaimInput {
  client_name: string;
  provider_name: string;
  type: string;
  amount: string;
  bpjs_number: string;
  patient_date_of_birth: string;
  service_date: string;
}
export interface Draft {
  id: number;
  data: Partial<ClaimInput> & { step?: number };
  updated_at: string;
}
export interface Notice {
  id: number;
  title: string;
  body: string;
  claim_id: string | null;
  is_read: boolean;
  created_at: string;
}
