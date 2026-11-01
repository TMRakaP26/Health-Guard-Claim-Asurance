import { useCallback, useEffect, useState, type ReactNode, type FormEvent } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import api from '../api/client';

export function message(error: unknown): string {
 if (axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
  if (error.response?.data.errors) return Object.values(error.response.data.errors).flat().join(' ');
  return error.response?.data.message || (error.response?.status === 429 ? 'Too many attempts. Please wait.' : 'Connection failed. Please retry.');
 } return error instanceof Error ? error.message : 'Unable to complete this action.';
}
export function useQuery<T>(url: string | null) {
 const [data, setData] = useState<T>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
 const reload = useCallback(() => setRevision(x => x + 1), []);
 useEffect(() => { if (!url) { setLoading(false); return; } const controller = new AbortController(); setLoading(true); setError('');
 api.get<T>(url, { signal: controller.signal }).then(r => setData(r.data)).catch((e: unknown) => { if (!controller.signal.aborted) setError(message(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
 return () => controller.abort(); }, [url, revision]);
 return { data, error, loading, reload };
}
export function useAction() { const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch(e) { const text = message(e); setError(text); toast.error(text); } finally { setBusy(false); } }
 return { busy, error, run }; }
export function Feedback({ loading, error, retry }: { loading?: boolean; error?: string; retry?: () => void }) { return <>{loading && <p role="status">Memuat / Loading…</p>}{error && <div className="error" role="alert">{error} {retry && <button onClick={retry}>Coba lagi / Retry</button>}</div>}</>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
export function Pager({ page, last, onChange }: { page: number; last: number; onChange: (p: number) => void }) { return <nav className="pager" aria-label="Pagination"><button disabled={page <= 1} onClick={() => onChange(page - 1)}>←</button><span>{page} / {Math.max(1,last)}</span><button disabled={page >= last} onClick={() => onChange(page + 1)}>→</button></nav>; }
export const rupiah = (value: string | number | null) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2 }).format(Number(value || 0));
export const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) : '—';
export function saveBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function formValues(event: FormEvent<HTMLFormElement>) { event.preventDefault(); return Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>; }
export const fileAccept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
export function validateFile(file: File) { if (!/\.(pdf|jpe?g|png|docx?)$/i.test(file.name) || file.size === 0 || file.size > 10*1024*1024) throw new Error('Gunakan PDF, JPG, PNG, DOC/DOCX berukuran 1 byte–10 MB.'); }

