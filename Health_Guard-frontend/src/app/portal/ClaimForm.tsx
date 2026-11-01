import { Dialog } from "./Dialog";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { toast } from "sonner";
import api from "../api/client";
import { useAuth } from "../state/AuthContext";
import { useLocale } from "./locale";
import {
  Feedback,
  Field,
  date,
  fileAccept,
  rupiah,
  useAction,
  useQuery,
  validateFile,
} from "./shared";
import type { Catalog, Claim, ClaimInput, Draft } from "./types";
export function Drafts() {
  const { t } = useLocale();
  const query = useQuery<Draft[]>("/drafts");
  const action = useAction();
  return (
    <>
      <h1>{t("Draf tersimpan", "Saved drafts")}</h1>
      <Feedback {...query} retry={query.reload} />
      {query.data?.length === 0 && (
        <p>{t("Belum ada draf.", "No saved drafts.")}</p>
      )}
      {query.data?.map((d) => (
        <article className="panel" key={d.id}>
          <Link to={"/claims/new?draft=" + d.id}>
            {d.data.client_name || t("Draf tanpa nama", "Untitled draft")}
          </Link>
          <p>{date(d.updated_at)}</p>
          <button
            disabled={action.busy}
            onClick={() => {
              if (window.confirm(t("Hapus draf?", "Delete draft?")))
                void action.run(async () => {
                  await api.delete("/drafts/" + d.id);
                  query.reload();
                });
            }}
          >
            {t("Hapus", "Delete")}
          </button>
        </article>
      ))}
    </>
  );
}
const empty: ClaimInput = {
  client_name: "",
  provider_name: "",
  type: "",
  amount: "",
  bpjs_number: "",
  patient_date_of_birth: "",
  service_date: "",
};
export function ClaimForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLocale();
  const action = useAction();
  const catalog = useQuery<Catalog>("/catalog");
  const claim = useQuery<Claim>(id ? "/claims/" + id : null);
  const drafts = useQuery<Draft[]>(params.get("draft") ? "/drafts" : null);
  const [data, setData] = useState<ClaimInput>({
    ...empty,
    client_name: user?.name || "",
    bpjs_number: user?.bpjs_number || "",
    patient_date_of_birth: user?.date_of_birth || "",
  });
  const [step, setStep] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [draftId, setDraftId] = useState<number | undefined>(
    Number(params.get("draft")) || undefined,
  );
  const [savedClaim, setSavedClaim] = useState<string>();
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [controller, setController] = useState<AbortController>();
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    const source =
      claim.data ||
      drafts.data?.find((d) => d.id === Number(params.get("draft")))?.data;
    if (source) {
      const values = { ...empty };
      for (const key of Object.keys(empty) as (keyof ClaimInput)[])
        values[key] = String(source[key] ?? "");
      setData(values);
      if ("step" in source) setStep(source.step || 1);
      loaded.current = true;
    }
  }, [claim.data, drafts.data, params]);
  const allowNavigation = useRef(false);
  const blocker = useBlocker(
    () => dirty && !savedClaim && !allowNavigation.current,
  );
  useEffect(() => {
    function before(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  function change(key: keyof ClaimInput, value: string) {
    setData((old) => ({ ...old, [key]: value }));
    setDirty(true);
  }
  async function saveDraft() {
    const body = {
      ...data,
      step,
      amount: data.amount || null,
      patient_date_of_birth: data.patient_date_of_birth || null,
      service_date: data.service_date || null,
    };
    const r = await api.request<Draft>({
      url: "/drafts" + (draftId ? "/" + draftId : ""),
      method: draftId ? "put" : "post",
      data: { data: body },
    });
    setDraftId(r.data.id);
    setDirty(false);
    toast.success(
      t(
        "Draf disimpan. Berkas perlu dipilih kembali jika halaman ditutup.",
        "Draft saved. Reselect files if you close this page.",
      ),
    );
  }
  async function submit() {
    let claimId = savedClaim;
    if (!claimId) {
      const r = await api.request<Claim>({
        url: id ? "/claims/" + id : "/claims",
        method: id ? "put" : "post",
        data,
      });
      claimId = r.data.claim_id;
      setSavedClaim(claimId);
    }
    const abort = new AbortController();
    setController(abort);
    try {
      for (const file of files) {
        const key = file.name + ":" + file.size + ":" + file.lastModified;
        if (uploaded.includes(key)) continue;
        const body = new FormData();
        body.append("file", file);
        await api.post("/claims/" + claimId + "/documents", body, {
          signal: abort.signal,
          onUploadProgress: (p) =>
            setProgress(Math.round((p.progress || 0) * 100)),
        });
        setUploaded((list) => [...list, key]);
      }
      if (draftId) await api.delete("/drafts/" + draftId);
      setDirty(false);
      toast.success(t("Klaim tersimpan", "Claim saved"));
      allowNavigation.current = true;
      navigate("/claims/" + claimId);
    } finally {
      setController(undefined);
    }
  }
  const today = new Date().toLocaleDateString("en-CA");
  if (user?.role !== "client")
    return (
      <p role="alert">
        {t(
          "Hanya klien dapat mengajukan klaim.",
          "Only clients may submit claims.",
        )}
      </p>
    );
  return (
    <>
      <h1>
        {id
          ? t("Perbaiki & ajukan ulang", "Edit & resubmit")
          : t("Pengajuan klaim", "Submit claim")}
      </h1>
      <Feedback {...catalog} retry={catalog.reload} />
      <Feedback {...claim} retry={claim.reload} />
      <Feedback error={action.error} />
      <ol className="steps">
        {[
          t("Pasien", "Patient"),
          t("Layanan", "Service"),
          t("Dokumen", "Documents"),
          t("Tinjau", "Review"),
        ].map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      {savedClaim && (
        <div role="status" className="success">
          {t(
            "Klaim sudah tersimpan. Coba ulang untuk melanjutkan unggahan yang gagal.",
            "Claim is saved. Retry to continue failed uploads.",
          )}{" "}
          <Link to={"/claims/" + savedClaim}>{savedClaim}</Link>
        </div>
      )}
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 4) setStep(step + 1);
          else void action.run(submit);
        }}
      >
        <fieldset disabled={!!savedClaim || action.busy}>
          <legend>{t("Data pengajuan", "Claim data")}</legend>
          {step === 1 && (
            <>
              <Field label={t("Nama pasien", "Patient name")}>
                <input
                  required
                  maxLength={255}
                  value={data.client_name}
                  onChange={(e) => change("client_name", e.target.value)}
                />
              </Field>
              <Field label={t("Tanggal lahir pasien", "Patient date of birth")}>
                <input
                  type="date"
                  max={today}
                  value={data.patient_date_of_birth}
                  onChange={(e) =>
                    change("patient_date_of_birth", e.target.value)
                  }
                />
              </Field>
              <Field label="Nomor BPJS">
                <input
                  maxLength={30}
                  value={data.bpjs_number}
                  onChange={(e) => change("bpjs_number", e.target.value)}
                />
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label="Provider">
                <input
                  required
                  list="providers"
                  maxLength={255}
                  value={data.provider_name}
                  onChange={(e) => change("provider_name", e.target.value)}
                />
                <datalist id="providers">
                  {catalog.data?.providers.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </Field>
              <Field label={t("Kategori klaim", "Claim category")}>
                <input
                  required
                  list="categories"
                  maxLength={255}
                  value={data.type}
                  onChange={(e) => change("type", e.target.value)}
                />
                <datalist id="categories">
                  {catalog.data?.categories.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </Field>
              {catalog.data?.categories
                .filter((c) => c.name === data.type)
                .map((c) => (
                  <p key={c.id}>
                    {c.coverage_rules}{" "}
                    {c.coverage_limit && rupiah(c.coverage_limit)}
                  </p>
                ))}
              <Field label={t("Tanggal layanan", "Service date")}>
                <input
                  type="date"
                  max={today}
                  value={data.service_date}
                  onChange={(e) => change("service_date", e.target.value)}
                />
              </Field>
              <Field label={t("Nominal klaim (IDR)", "Claim amount (IDR)")}>
                <input
                  type="number"
                  required
                  min=".01"
                  step=".01"
                  max={catalog.data?.max_amount || 99999999.99}
                  value={data.amount}
                  onChange={(e) => change("amount", e.target.value)}
                />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <Field
                label={t(
                  "Pilih dokumen pendukung",
                  "Choose supporting documents",
                )}
              >
                <input
                  type="file"
                  multiple
                  accept={fileAccept}
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    void action.run(async () => {
                      selected.forEach(validateFile);
                      setFiles(selected);
                      setUploaded([]);
                      setDirty(true);
                    });
                  }}
                />
              </Field>
              <p>
                {t(
                  "PDF, JPG, PNG, DOC/DOCX. Maksimal 10 MB per berkas.",
                  "PDF, JPG, PNG, DOC/DOCX. Maximum 10 MB per file.",
                )}
              </p>
              <ul>
                {files.map((f) => (
                  <li key={f.name + f.size}>
                    {f.name} ({Math.ceil(f.size / 1024)} KB)
                  </li>
                ))}
              </ul>
            </>
          )}
          {step === 4 && (
            <>
              <dl>
                {Object.entries(data).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {
                        (
                          {
                            client_name: t("Pasien", "Patient"),
                            provider_name: "Provider",
                            type: t("Kategori", "Category"),
                            amount: t("Nominal", "Amount"),
                            bpjs_number: "BPJS",
                            patient_date_of_birth: t(
                              "Tanggal lahir",
                              "Birth date",
                            ),
                            service_date: t("Tanggal layanan", "Service date"),
                          } as Record<string, string>
                        )[key]
                      }
                    </dt>
                    <dd>{key === "amount" ? rupiah(value) : value || "—"}</dd>
                  </div>
                ))}
              </dl>
              <p>
                {files.length} {t("dokumen dipilih", "documents selected")}
              </p>
              <label>
                <input type="checkbox" required />{" "}
                {t(
                  "Saya telah memeriksa data pengajuan.",
                  "I have reviewed the claim details.",
                )}
              </label>
            </>
          )}
        </fieldset>
        <div className="actions">
          {step > 1 && !savedClaim && (
            <button
              type="button"
              disabled={action.busy}
              onClick={() => setStep(step - 1)}
            >
              {t("Kembali", "Back")}
            </button>
          )}
          <button
            className="primary"
            disabled={action.busy || (!!id && claim.loading)}
          >
            {step < 4
              ? t("Lanjut", "Continue")
              : savedClaim
                ? t("Coba ulang unggahan", "Retry uploads")
                : t("Kirim pengajuan", "Submit claim")}
          </button>
          {!id && !savedClaim && (
            <button
              type="button"
              disabled={action.busy}
              onClick={() => void action.run(saveDraft)}
            >
              {t("Simpan draf", "Save draft")}
            </button>
          )}
        </div>
        {controller && (
          <>
            <progress max={100} value={progress} aria-label="Upload" />
            <button type="button" onClick={() => controller.abort()}>
              {t("Batalkan unggahan", "Cancel upload")}
            </button>
          </>
        )}
      </form>
      {blocker.state === "blocked" && (
        <Dialog
          label={t("Perubahan belum disimpan", "Unsaved changes")}
          onClose={() => blocker.reset()}
        >
          <div className="panel">
            <h2 id="leave-title">
              {t("Perubahan belum disimpan", "Unsaved changes")}
            </h2>
            <button autoFocus onClick={() => blocker.reset()}>
              {t("Tetap di sini", "Stay")}
            </button>
            <button onClick={() => blocker.proceed()}>
              {t("Tinggalkan halaman", "Leave page")}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
