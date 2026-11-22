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
  MoneyInput,
  rupiah,
  useAction,
  useQuery,
  validateFile,
  message,
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
  disease_name: "",
  description: "",
  amount: "",
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
  // Local calendar date: toISOString() would shift the day in some time zones.
  const today = new Date().toLocaleDateString("en-CA");
  const clientId =
    user?.client_id ||
    (user?.id ? "CL-" + String(user.id).padStart(6, "0") : "");
  const [data, setData] = useState<ClaimInput>(() => ({
    ...empty,
    client_name: user?.name || "",
    patient_date_of_birth: user?.date_of_birth || "",
    service_date: id ? "" : today,
  }));
  const [step, setStep] = useState(1);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) stepHeading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const stepLabels = [
    t("Pasien", "Patient"),
    t("Layanan", "Service"),
    t("Dokumen", "Documents"),
    t("Tinjau", "Review"),
  ];
  const [dirty, setDirty] = useState(false);
  const [draftId, setDraftId] = useState<number | undefined>(
    Number(params.get("draft")) || undefined,
  );
  const [savedClaim, setSavedClaim] = useState<string>();
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  const blocker = useBlocker(() => dirty && !allowNavigation.current);
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
  const fileKey = (file: File) =>
    file.name + ":" + file.size + ":" + file.lastModified;
  async function submit(onlyFile?: File) {
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
      const confirmed = new Set(uploaded);
      for (const file of onlyFile ? [onlyFile] : files) {
        const key = fileKey(file);
        if (confirmed.has(key)) continue;
        const body = new FormData();
        body.append("file", file);
        setProgress(0);
        try {
          await api.post("/claims/" + claimId + "/documents", body, {
            signal: abort.signal,
            onUploadProgress: (p) =>
              setProgress(Math.round((p.progress || 0) * 100)),
          });
        } catch (error) {
          setFileErrors((old) => ({ ...old, [key]: message(error) }));
          throw error;
        }
        setFileErrors((old) => {
          const next = { ...old };
          delete next[key];
          return next;
        });
        confirmed.add(key);
        setUploaded((list) => [...list, key]);
      }
      if (files.some((file) => !confirmed.has(fileKey(file)))) return;
      if (draftId) await api.delete("/drafts/" + draftId);
      setDirty(false);
      toast.success(t("Klaim tersimpan", "Claim saved"));
      allowNavigation.current = true;
      navigate("/claims/" + claimId);
    } finally {
      setController(undefined);
    }
  }
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
        {stepLabels.map((s, i) => (
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
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const invalid = Array.from(
            e.currentTarget.querySelectorAll<HTMLInputElement>("input:invalid"),
          );
          setFieldErrors(
            Object.fromEntries(
              invalid.map((input) => [input.name, input.validationMessage]),
            ),
          );
          setValidation(
            invalid.map(
              (input) =>
                `${input.closest("label")?.textContent?.trim() || "Field"}: ${input.validationMessage}`,
            ),
          );
          for (const input of e.currentTarget.querySelectorAll<HTMLInputElement>(
            "input",
          )) {
            input.setAttribute("aria-invalid", String(!input.validity.valid));
          }
          if (invalid.length) {
            invalid[0].focus();
            return;
          }
          if (step < 4) setStep(step + 1);
          else void action.run(() => submit());
        }}
      >
        <h2 ref={stepHeading} tabIndex={-1}>
          {t("Langkah", "Step")} {step} {t("dari", "of")} 4:{" "}
          {stepLabels[step - 1]}
        </h2>
        {validation.length > 0 && (
          <div className="error" role="alert">
            <strong>
              {t("Periksa data pengajuan", "Check claim details")}
            </strong>
            <ul>
              {validation.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <fieldset disabled={!!savedClaim || action.busy}>
          <legend>{t("Data pengajuan", "Claim data")}</legend>
          {step === 1 && (
            <>
              <Field label={t("Nama pasien", "Patient name")}>
                <input
                  required
                  maxLength={255}
                  value={data.client_name}
                  name="client_name"
                  aria-label={t("Nama pasien", "Patient name")}
                  aria-describedby="client_name-error client_name-hint"
                  onChange={(e) => change("client_name", e.target.value)}
                />
                <span id="client_name-error">{fieldErrors.client_name}</span>
                <small id="client_name-hint">
                  {t(
                    "Diisi dari profil akun Anda. Ubah jika pasien berbeda.",
                    "Prefilled from your account profile. Change it if the patient is different.",
                  )}
                </small>
              </Field>
              <Field label={t("Tanggal lahir pasien", "Patient date of birth")}>
                <input
                  type="date"
                  max={today}
                  value={data.patient_date_of_birth}
                  name="patient_date_of_birth"
                  aria-label={t("Tanggal lahir pasien", "Patient date of birth")}
                  aria-describedby="patient_date_of_birth-error patient_date_of_birth-hint"
                  onChange={(e) =>
                    change("patient_date_of_birth", e.target.value)
                  }
                />
                <span id="patient_date_of_birth-error">
                  {fieldErrors.patient_date_of_birth}
                </span>
                {!user?.date_of_birth && (
                  <small id="patient_date_of_birth-hint">
                    {t(
                      "Belum diisi di profil. Lengkapi profil agar tanggal lahir terisi otomatis.",
                      "Not set in your profile. Complete your profile to autofill this date.",
                    )}
                  </small>
                )}
              </Field>
              <Field label={t("ID Client", "Client ID")}>
                <input
                  value={clientId}
                  name="client_id"
                  readOnly
                  aria-label={t("ID Client", "Client ID")}
                  aria-describedby="client_id-hint"
                />
                <small id="client_id-hint">
                  {t(
                    "Dibuat oleh server dari akun Anda dan tidak dapat diubah.",
                    "Created by the server from your account and cannot be changed.",
                  )}
                </small>
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label={t("Rumah sakit", "Hospital")}>
                <input
                  required
                  list="providers"
                  maxLength={255}
                  value={data.provider_name}
                  name="provider_name"
                  aria-describedby="provider_name-error"
                  onChange={(e) => change("provider_name", e.target.value)}
                />
                <span id="provider_name-error">
                  {fieldErrors.provider_name}
                </span>
                <datalist id="providers">
                  {catalog.data?.providers.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </Field>
              <Field label={t("Penyakit", "Disease")}>
                <input
                  required
                  maxLength={255}
                  value={data.disease_name}
                  name="disease_name"
                  aria-label={t("Penyakit", "Disease")}
                  aria-describedby="disease_name-error disease_name-hint"
                  onChange={(e) => change("disease_name", e.target.value)}
                />
                <span id="disease_name-error">{fieldErrors.disease_name}</span>
                <small id="disease_name-hint">
                  {t(
                    "Nama penyakit atau diagnosis yang tercantum pada dokumen.",
                    "The disease or diagnosis stated in the documents.",
                  )}
                </small>
              </Field>
              <Field label={t("Jenis layanan", "Service type")}>
                <input
                  required
                  list="categories"
                  maxLength={255}
                  value={data.type}
                  name="type"
                  aria-label={t("Jenis layanan", "Service type")}
                  aria-describedby="type-error type-hint"
                  onChange={(e) => change("type", e.target.value)}
                />
                <span id="type-error">{fieldErrors.type}</span>
                <small id="type-hint">
                  {t(
                    "Kategori layanan lama tetap disimpan terpisah dari penyakit.",
                    "The legacy service category is kept separate from the disease.",
                  )}
                </small>
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
                  name="service_date"
                  aria-describedby="service_date-error"
                  onChange={(e) => change("service_date", e.target.value)}
                />
                <span id="service_date-error">{fieldErrors.service_date}</span>
              </Field>
              <Field label={t("Nominal klaim (IDR)", "Claim amount (IDR)")}>
                <MoneyInput
                  required
                  max={catalog.data?.max_amount || 99999999.99}
                  value={data.amount}
                  name="amount"
                  aria-label={t("Nominal klaim (IDR)", "Claim amount (IDR)")}
                  aria-describedby="amount-error"
                  invalidMessage={t(
                    "Nominal harus lebih dari 0 dan tidak melebihi batas.",
                    "Amount must be greater than zero and within the limit.",
                  )}
                  onChange={(value) => change("amount", value)}
                />
                <span id="amount-error">{fieldErrors.amount}</span>
                <small>
                  {t(
                    "Gunakan titik sebagai pemisah ribuan; koma untuk sen.",
                    "Use dots as thousands separators; a comma for cents.",
                  )}
                </small>
              </Field>
              <Field label={t("Deskripsi", "Description")}>
                <textarea
                  name="description"
                  rows={4}
                  maxLength={4000}
                  value={data.description}
                  placeholder={t(
                    "Jelaskan keluhan, tindakan, atau konteks klaim.",
                    "Describe the symptoms, treatment, or claim context.",
                  )}
                  onChange={(e) => change("description", e.target.value)}
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
            </>
          )}
          {step === 4 && (
            <>
              <dl>
                <div>
                  <dt>{t("ID Client", "Client ID")}</dt>
                  <dd>{clientId || "—"}</dd>
                </div>
                {Object.entries(data).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {
                        (
                          {
                            client_name: t("Pasien", "Patient"),
                            provider_name: t("Rumah sakit", "Hospital"),
                            type: t("Jenis layanan", "Service type"),
                            disease_name: t("Penyakit", "Disease"),
                            description: t("Deskripsi", "Description"),
                            amount: t("Nominal", "Amount"),
                            patient_date_of_birth: t(
                              "Tanggal lahir",
                              "Date of birth",
                            ),
                            service_date: t("Tanggal layanan", "Service date"),
                          } as Record<string, string>
                        )[key]
                      }
                    </dt>
                    <dd className={key === "description" ? "pre-wrap" : ""}>
                      {key === "amount" ? rupiah(value) : value || "—"}
                    </dd>
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
        {step >= 3 && (
          <ul aria-label={t("Dokumen dipilih", "Selected documents")}>
            {files.map((file) => (
              <li key={fileKey(file)}>
                {file.name} ({Math.ceil(file.size / 1024)} KB)
                {uploaded.includes(fileKey(file)) ? (
                  <span role="status"> — {t("Terunggah", "Uploaded")}</span>
                ) : (
                  <>
                    {fileErrors[fileKey(file)] && (
                      <span role="alert"> {fileErrors[fileKey(file)]}</span>
                    )}
                    <button
                      type="button"
                      disabled={action.busy}
                      onClick={() => {
                        setFiles((old) => old.filter((f) => f !== file));
                        setDirty(true);
                      }}
                    >
                      {t("Hapus", "Remove")} {file.name}
                    </button>
                    {savedClaim && (
                      <button
                        type="button"
                        disabled={action.busy}
                        onClick={() => void action.run(() => submit(file))}
                      >
                        {t("Coba ulang", "Retry")} {file.name}
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
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
