import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import axios from "axios";
import { toast } from "sonner";
import api from "../api/client";
import { useLocale } from "./locale";

export function message(error: unknown): string {
  if (
    axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(
      error,
    )
  ) {
    if (error.response?.data.errors)
      return Object.values(error.response.data.errors).flat().join(" ");
    return (
      error.response?.data.message ||
      (error.response?.status === 429
        ? "Too many attempts. Please wait."
        : "Connection failed. Please retry.")
    );
  }
  return error instanceof Error
    ? error.message
    : "Unable to complete this action.";
}
export function useQuery<T>(url: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    setData(undefined);
    if (!url) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get<T>(url, { signal: controller.signal })
      .then((r) => {
        if (!controller.signal.aborted) setData(r.data);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, revision]);
  return { data, error, loading, reload };
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      const text = message(e);
      setError(text);
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}
export function Feedback({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  return (
    <>
      {loading && <p role="status">Memuat / Loading…</p>}
      {error && (
        <div className="error" role="alert">
          {error} {retry && <button onClick={retry}>Coba lagi / Retry</button>}
        </div>
      )}
    </>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Pager({
  page,
  last,
  onChange,
  label = "Pagination",
}: {
  page: number;
  last: number;
  onChange: (p: number) => void;
  label?: string;
}) {
  const { t } = useLocale();
  return (
    <nav className="pager" aria-label={label}>
      <button
        aria-label={t("Halaman sebelumnya", "Previous page")}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ←
      </button>
      <span>
        {page} / {Math.max(1, last)}
      </span>
      <button
        aria-label={t("Halaman berikutnya", "Next page")}
        disabled={page >= last}
        onClick={() => onChange(page + 1)}
      >
        →
      </button>
    </nav>
  );
}
export const rupiah = (value: string | number | null) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(
    document.documentElement.lang === "en" ? "en-US" : "id-ID",
    {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    },
  ).format(amount);
};

/**
 * Normalise a user-entered amount to an API-safe numeric string. Indonesian
 * input commonly uses "." for thousands and "," for decimals; both that and
 * plain "1500000" / "1500000.50" are accepted.
 */
export function normalizeAmount(input: string | number | null | undefined) {
  const text = String(input ?? "")
    .trim()
    .replace(/[^\d.,]/g, "");
  if (!text) return "";
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let decimalAt = -1;
  if (lastComma >= 0) {
    decimalAt = lastComma;
  } else if (lastDot >= 0) {
    const decimals = text.length - lastDot - 1;
    const dots = (text.match(/\./g) || []).length;
    // A single dot followed by 1–2 digits is a decimal separator. With
    // several dots (or a three-digit tail) the dots are thousands separators.
    if (decimals > 0 && decimals <= 2 && dots === 1) decimalAt = lastDot;
  }
  let whole: string;
  let fraction: string;
  if (decimalAt >= 0) {
    whole = text.slice(0, decimalAt).replace(/[.,]/g, "");
    fraction = text
      .slice(decimalAt + 1)
      .replace(/[.,]/g, "")
      .slice(0, 2);
  } else {
    whole = text.replace(/[.,]/g, "");
    fraction = "";
  }
  whole = whole.replace(/^0+(?=\d)/, "");
  if (!whole && !fraction) return "";
  return (whole || "0") + (fraction ? "." + fraction : "");
}

export function formatAmount(value: string | number | null | undefined) {
  const normalized = normalizeAmount(value);
  if (!normalized) return "";
  const [whole, fraction] = normalized.split(".");
  const grouped = (whole || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction ? grouped + "," + fraction : grouped;
}

/**
 * Text input that shows grouped thousands while keeping the form value as a
 * plain numeric string. The caret is restored by digit count so typing does
 * not jump to the end on every keystroke.
 */
export function MoneyInput({
  value,
  onChange,
  name,
  required,
  max,
  invalidMessage,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  max?: number;
  invalidMessage?: string;
  id?: string;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const [text, setText] = useState(() => formatAmount(value));
  useEffect(() => {
    if (!focused.current) setText(formatAmount(value));
  }, [value]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const amount = Number(value);
    let error = "";
    if (!value) error = required ? invalidMessage || "Enter an amount." : "";
    else if (!Number.isFinite(amount) || amount <= 0)
      error = invalidMessage || "Amount must be greater than zero.";
    else if (max !== undefined && amount > max)
      error = invalidMessage || "Amount exceeds the allowed limit.";
    element.setCustomValidity(error);
  }, [value, required, max, invalidMessage]);
  return (
    <input
      {...rest}
      ref={ref}
      name={name}
      required={required}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText(formatAmount(value));
      }}
      onChange={(event) => {
        const input = event.currentTarget;
        const raw = input.value;
        const caretAtEnd = (input.selectionStart ?? raw.length) >= raw.length;
        const digitsBefore = raw
          .slice(0, input.selectionStart ?? raw.length)
          .replace(/\D/g, "").length;
        const normalized = normalizeAmount(raw);
        onChange(normalized);
        // Keep a trailing decimal separator visible while the user is typing
        // the fractional part; it is removed on blur.
        const display =
          formatAmount(normalized) + (/[.,]$/.test(raw) ? "," : "");
        setText(display);
        requestAnimationFrame(() => {
          const element = ref.current;
          if (!element) return;
          let seen = 0;
          let position = 0;
          if (caretAtEnd) {
            position = display.length;
          } else {
            for (; position < display.length; position++) {
              if (/\d/.test(display[position])) seen++;
              if (seen >= digitsBefore) {
                position++;
                break;
              }
            }
          }
          element.setSelectionRange(position, position);
        });
      }}
    />
  );
}

export const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat(
        document.documentElement.lang === "en" ? "en-GB" : "id-ID",
        {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        },
      ).format(new Date(value))
    : "—";
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function formValues(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(
    new FormData(event.currentTarget).entries(),
  ) as Record<string, string>;
}
export const fileAccept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
export function validateFile(file: File) {
  if (
    !/\.(pdf|jpe?g|png|docx?)$/i.test(file.name) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Gunakan PDF, JPG, PNG, DOC/DOCX berukuran 1 byte–10 MB.");
}
