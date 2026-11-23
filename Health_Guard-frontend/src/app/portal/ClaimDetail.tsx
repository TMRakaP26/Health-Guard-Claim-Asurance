import { Dialog } from "./Dialog";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import api from "../api/client";
import { useAuth } from "../state/AuthContext";
import { useLocale } from "./locale";
import {
  date,
  Feedback,
  Field,
  fileAccept,
  formValues,
  Pager,
  rupiah,
  saveBlob,
  useAction,
  useQuery,
  validateFile,
} from "./shared";
import type {
  Catalog,
  Claim,
  Document,
  DocumentRequest,
  History,
  Message,
  Page,
  Payment,
} from "./types";
export function ClaimDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLocale();
  const query = useQuery<Claim>("/claims/" + id);
  const catalog = useQuery<Catalog>("/catalog");
  const action = useAction();
  const [historyPage, setHistoryPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const history = useQuery<Page<History>>(
    "/claims/" + id + "/history?page=" + historyPage + "&per_page=15",
  );
  const messages = useQuery<Page<Message>>(
    catalog.data?.features.messages
      ? "/claims/" + id + "/messages?page=" + messagePage
      : null,
  );
  const requests = useQuery<DocumentRequest[]>(
    "/claims/" + id + "/document-requests",
  );
  const payment = useQuery<{ data: Payment | null }>(
    catalog.data?.features.payments ? "/claims/" + id + "/payment" : null,
  );
  const [decision, setDecision] = useState("Approved");
  const [confirmation, setConfirmation] = useState<Record<
    string,
    string
  > | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [replyId, setReplyId] = useState<number>();
  const chatEnd = useRef<HTMLDivElement>(null);
  const orderedMessages = [...(messages.data?.data || [])].reverse();
  useEffect(() => {
    if (messages.data) chatEnd.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages.data]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const [file, setFile] = useState<File>();
  const [requestId, setRequestId] = useState("");
  const [progress, setProgress] = useState(0);
  const [controller, setController] = useState<AbortController>();
  const claim = query.data;
  const canWrite =
    !!claim && (user?.id === claim.user_id || user?.id === claim.assigned_to);
  const canDecide = user?.role === "analyst" && user?.id === claim?.assigned_to;
  const roleLabel = (role?: string) =>
    role === "analyst"
      ? t("Analis", "Analyst")
      : role === "admin"
        ? "Admin"
        : t("Klien", "Client");
  function reload() {
    query.reload();
    history.reload();
    messages.reload();
    requests.reload();
    payment.reload();
  }
  async function openDocument(d: Document, download = false) {
    const r = await api.get<Blob>(
      "/claims/" + id + "/documents/" + d.id + "/download",
      { responseType: "blob" },
    );
    if (
      download ||
      !["application/pdf", "image/png", "image/jpeg"].includes(
        r.data.type.split(";")[0],
      )
    )
      saveBlob(r.data, d.file_name);
    else {
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(r.data), name: d.file_name });
    }
  }
  function documents(items: Document[]) {
    return items.map((d) => (
      <div className="actions" key={d.id}>
        <button onClick={() => void action.run(() => openDocument(d))}>
          {d.file_name}
        </button>
        <button
          aria-label={t("Unduh ", "Download ") + d.file_name}
          onClick={() => void action.run(() => openDocument(d, true))}
        >
          ↓
        </button>
      </div>
    ));
  }
  return (
    <>
      <Link to="/claims">← {t("Daftar klaim", "Claims")}</Link>
      <Feedback {...query} retry={query.reload} />
      <Feedback error={action.error} />
      {claim && (
        <>
          <header className="page-header">
            <div>
              <h1>{claim.claim_id}</h1>
              <span className="badge">{claim.status}</span>
            </div>
            {user?.role === "client" &&
              ["Rejected", "Needs Info", "Partially Approved"].includes(
                claim.status,
              ) &&
              !payment.data?.data && (
                <Link className="button primary" to={"/claims/" + id + "/edit"}>
                  {t("Perbaiki & ajukan ulang", "Edit & resubmit")}
                </Link>
              )}
            {user?.role === "analyst" &&
              claim.assigned_to === null &&
              claim.status === "Pending" && (
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await api.post("/claims/" + id + "/assign");
                      reload();
                    })
                  }
                >
                  {t("Ambil tugas", "Assign to me")}
                </button>
              )}
          </header>
          <div className="detail-grid">
            <section className="panel">
              <h2>{t("Rincian klaim", "Claim details")}</h2>
              <dl>
                <dt>{t("Pasien", "Patient")}</dt>
                <dd>{claim.client_name}</dd>
                <dt>{t("ID Client", "Client ID")}</dt>
                <dd>{claim.client_id || "—"}</dd>
                <dt>{t("Rumah sakit", "Hospital")}</dt>
                <dd>{claim.provider_name}</dd>
                <dt>{t("Penyakit", "Disease")}</dt>
                <dd>{claim.disease_name || "—"}</dd>
                <dt>{t("Jenis layanan", "Service type")}</dt>
                <dd>{claim.type}</dd>
                <dt>{t("Tanggal lahir", "Date of birth")}</dt>
                <dd>{claim.patient_date_of_birth || "—"}</dd>
                <dt>{t("Tanggal layanan", "Service date")}</dt>
                <dd>{claim.service_date || "—"}</dd>
                <dt>{t("Deskripsi", "Description")}</dt>
                <dd className="pre-wrap">{claim.description || "—"}</dd>
                <dt>{t("Diajukan", "Submitted")}</dt>
                <dd>{date(claim.date_submitted)}</dd>
                <dt>{t("Nominal", "Amount")}</dt>
                <dd>{rupiah(claim.amount)}</dd>
                <dt>{t("Disetujui", "Approved")}</dt>
                <dd>
                  {claim.approved_amount === null
                    ? "—"
                    : rupiah(claim.approved_amount)}
                </dd>
                <dt>{t("Analis", "Analyst")}</dt>
                <dd>{claim.assigned_analyst?.name || "—"}</dd>
                <dt>SLA</dt>
                <dd>{date(claim.sla_due_at)}</dd>
              </dl>
              {!claim.disease_name && (
                <p className="hint">
                  {t(
                    "Klaim lama ini belum memiliki data penyakit. Jenis layanan ditampilkan terpisah.",
                    "This legacy claim has no disease data. The service type is shown separately.",
                  )}
                </p>
              )}
              {claim.notes && (
                <>
                  <h3>{t("Catatan analis", "Analyst notes")}</h3>
                  <blockquote>{claim.notes}</blockquote>
                </>
              )}
              {catalog.data?.categories
                .filter((c) => c.name === claim.type)
                .map((c) => (
                  <aside key={c.id}>
                    <h3>{t("Aturan jenis layanan", "Service type rules")}</h3>
                    <p>
                      {c.diagnosis_code || "—"} ·{" "}
                      {c.coverage_limit ? rupiah(c.coverage_limit) : "—"}
                    </p>
                    <p>
                      {c.coverage_rules ||
                        t("Belum dikonfigurasi", "Not configured")}
                    </p>
                  </aside>
                ))}
            </section>
            <section className="panel">
              <h2>{t("Dokumen", "Documents")}</h2>
              {documents(claim.documents || [])}
              <Feedback {...requests} retry={requests.reload} />
              {requests.data?.map((r) => (
                <article key={r.id}>
                  <strong>
                    {r.title} · {r.status}
                  </strong>
                  <p>{r.instructions}</p>
                </article>
              ))}
              {canWrite && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action.run(async () => {
                      if (!file)
                        throw new Error(t("Pilih berkas", "Choose a file"));
                      if (user?.role !== "client" && !replyId)
                        throw new Error(
                          t(
                            "Kirim pesan terlebih dahulu untuk lampiran analis.",
                            "Send a message first to attach an analyst document.",
                          ),
                        );
                      validateFile(file);
                      const body = new FormData();
                      body.append("file", file);
                      if (replyId) body.append("message_id", String(replyId));
                      if (requestId) body.append("request_id", requestId);
                      const abort = new AbortController();
                      setController(abort);
                      try {
                        await api.post("/claims/" + id + "/documents", body, {
                          signal: abort.signal,
                          onUploadProgress: (p) =>
                            setProgress(Math.round((p.progress || 0) * 100)),
                        });
                        setFile(undefined);
                        setProgress(0);
                        toast.success(t("Dokumen tersimpan", "Document saved"));
                        reload();
                      } finally {
                        setController(undefined);
                      }
                    });
                  }}
                >
                  <Field
                    label={t(
                      "Lampiran (maks. 10 MB)",
                      "Attachment (max. 10 MB)",
                    )}
                  >
                    <input
                      type="file"
                      accept={fileAccept}
                      onChange={(e) => setFile(e.target.files?.[0])}
                    />
                  </Field>
                  {user?.role === "client" && (
                    <Field
                      label={t("Untuk permintaan", "For document request")}
                    >
                      <select
                        value={requestId}
                        onChange={(e) => setRequestId(e.target.value)}
                      >
                        <option value="">
                          {t("Dokumen umum", "General document")}
                        </option>
                        {requests.data
                          ?.filter((r) => r.status === "open")
                          .map((r) => (
                            <option value={r.id} key={r.id}>
                              {r.title}
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}
                  {replyId && (
                    <p>
                      {t(
                        "Dilampirkan ke pesan terakhir",
                        "Attached to last sent message",
                      )}{" "}
                      #{replyId}{" "}
                      <button
                        type="button"
                        onClick={() => setReplyId(undefined)}
                      >
                        ×
                      </button>
                    </p>
                  )}
                  <button disabled={action.busy || !file}>
                    {t("Unggah / coba ulang", "Upload / retry")}
                  </button>
                  {controller && (
                    <>
                      <progress
                        value={progress}
                        max={100}
                        aria-label="Upload"
                      />
                      <button type="button" onClick={() => controller.abort()}>
                        {t("Batalkan", "Cancel")}
                      </button>
                    </>
                  )}
                </form>
              )}
            </section>
          </div>
          {canDecide && (
            <section className="panel">
              <h2>{t("Keputusan analis", "Analyst decision")}</h2>
              <form onSubmit={(e) => setConfirmation(formValues(e))}>
                <div className="filters">
                  <Field label="Status">
                    <select
                      name="status"
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                    >
                      {[
                        "Approved",
                        "Partially Approved",
                        "Rejected",
                        "Needs Info",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  {decision === "Partially Approved" && (
                    <Field
                      label={t(
                        "Nominal disetujui (IDR)",
                        "Approved amount (IDR)",
                      )}
                    >
                      <input
                        name="approved_amount"
                        required
                        type="number"
                        min="0.01"
                        max={claim.amount}
                        step="0.01"
                      />
                    </Field>
                  )}
                  <Field label={t("Catatan", "Notes")}>
                    <textarea
                      name="notes"
                      required={["Rejected", "Needs Info"].includes(decision)}
                      maxLength={4000}
                    />
                  </Field>
                </div>
                <button disabled={action.busy}>
                  {t("Tinjau keputusan", "Review decision")}
                </button>
              </form>
              <details>
                <summary>
                  {t("Minta dokumen tambahan", "Request additional document")}
                </summary>
                <form
                  onSubmit={(e) => {
                    const body = formValues(e);
                    void action.run(async () => {
                      await api.post(
                        "/claims/" + id + "/document-requests",
                        body,
                      );
                      reload();
                    });
                  }}
                >
                  <Field label={t("Judul dokumen", "Document title")}>
                    <input name="title" required maxLength={255} />
                  </Field>
                  <Field label={t("Petunjuk", "Instructions")}>
                    <textarea name="instructions" required maxLength={4000} />
                  </Field>
                  <button disabled={action.busy}>
                    {t(
                      "Kirim permintaan (Needs Info)",
                      "Send request (Needs Info)",
                    )}
                  </button>
                </form>
              </details>
            </section>
          )}
          {confirmation && (
            <Dialog
              label={t("Konfirmasi keputusan", "Confirm decision")}
              onClose={() => setConfirmation(null)}
            >
              <div className="panel">
                <h2 id="confirm-title">
                  {t("Konfirmasi keputusan", "Confirm decision")}
                </h2>
                <p>
                  {claim.claim_id} → {confirmation.status}
                </p>
                <p>{confirmation.notes}</p>
                {confirmation.approved_amount && (
                  <p>{rupiah(confirmation.approved_amount)}</p>
                )}
                <button
                  autoFocus
                  disabled={action.busy}
                  onClick={() => setConfirmation(null)}
                >
                  {t("Kembali", "Back")}
                </button>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await api.patch(
                        "/claims/" + id + "/status",
                        confirmation,
                      );
                      setConfirmation(null);
                      reload();
                      toast.success(t("Keputusan disimpan", "Decision saved"));
                    })
                  }
                >
                  {t("Konfirmasi & simpan", "Confirm & save")}
                </button>
              </div>
            </Dialog>
          )}
          {catalog.data?.features.messages && (
            <section className="panel chat-panel">
              <h2>{t("Chat", "Chat")}</h2>
              <Feedback {...messages} retry={messages.reload} />
              {messages.data?.data.length === 0 && (
                <p>
                  {t(
                    "Belum ada pesan. Mulai chat dengan analis.",
                    "No messages yet. Start a chat with the analyst.",
                  )}
                </p>
              )}
              <div
                className="chat-log"
                role="log"
                aria-live="polite"
                aria-label={t("Pesan chat", "Chat messages")}
              >
                {orderedMessages.map((m) => {
                  const mine = m.user?.id === user?.id;
                  return (
                    <article
                      className={"chat-message " + (mine ? "mine" : "theirs")}
                      key={m.id}
                    >
                      <div className="chat-bubble">
                        <header>
                          <strong>
                            {m.user?.name ||
                              t("Akun dihapus", "Deleted account")}
                          </strong>
                          {m.user?.role && (
                            <span className="chat-role">
                              {roleLabel(m.user.role)}
                            </span>
                          )}
                          <time dateTime={m.created_at}>
                            {date(m.created_at)}
                          </time>
                        </header>
                        <p>{m.body}</p>
                        {documents(m.documents)}
                      </div>
                    </article>
                  );
                })}
                <div ref={chatEnd} />
              </div>
              {messages.data && (
                <Pager
                  label={t("Halaman chat", "Chat pages")}
                  page={messagePage}
                  last={messages.data.last_page}
                  onChange={setMessagePage}
                />
              )}
              {canWrite && (
                <form
                  className="chat-composer"
                  onSubmit={(e) => {
                    const body = formValues(e);
                    const form = e.currentTarget;
                    void action.run(async () => {
                      const r = await api.post<{ id: number }>(
                        "/claims/" + id + "/messages",
                        body,
                      );
                      setReplyId(r.data.id);
                      form.reset();
                      reload();
                    });
                  }}
                >
                  <Field
                    label={t(
                      "Pesan (lampiran bisa diunggah setelah mengirim)",
                      "Message (upload attachments after sending)",
                    )}
                  >
                    <textarea
                      name="body"
                      required
                      maxLength={4000}
                      rows={3}
                      placeholder={t("Tulis pesan…", "Write a message…")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                  </Field>
                  <button disabled={action.busy}>
                    {action.busy
                      ? t("Mengirim…", "Sending…")
                      : t("Kirim", "Send")}
                  </button>
                </form>
              )}
            </section>
          )}
          {catalog.data?.features.payments && (
            <section className="panel">
              <h2>{t("Catatan pembayaran", "Payment record")}</h2>
              <Feedback {...payment} retry={payment.reload} />
              {payment.data?.data ? (
                <p>
                  {payment.data.data.status} ·{" "}
                  {rupiah(payment.data.data.amount)} ·{" "}
                  {payment.data.data.reference} ·{" "}
                  {date(payment.data.data.paid_at)}
                </p>
              ) : (
                <p>
                  {t("Belum ada pembayaran tercatat", "No payment recorded")}
                </p>
              )}
              {user?.role === "admin" &&
                ["Approved", "Partially Approved"].includes(claim.status) &&
                payment.data?.data?.status !== "settled" && (
                  <form
                    onSubmit={(e) => {
                      const body = formValues(e);
                      if (
                        window.confirm(
                          t(
                            "Simpan catatan pembayaran ini?",
                            "Save this payment record?",
                          ),
                        )
                      )
                        void action.run(async () => {
                          await api.post("/claims/" + id + "/payment", body);
                          reload();
                        });
                    }}
                  >
                    <input
                      type="hidden"
                      name="status"
                      value={payment.data?.data ? "settled" : "paid"}
                    />
                    <Field label={t("Nominal (IDR)", "Amount (IDR)")}>
                      <input
                        name="amount"
                        type="number"
                        min=".01"
                        step=".01"
                        max={claim.approved_amount || claim.amount}
                        required
                        defaultValue={
                          payment.data?.data?.amount ||
                          claim.approved_amount ||
                          ""
                        }
                        readOnly={!!payment.data?.data}
                      />
                    </Field>
                    <Field label={t("Referensi", "Reference")}>
                      <input
                        name="reference"
                        required
                        maxLength={100}
                        defaultValue={payment.data?.data?.reference || ""}
                        readOnly={!!payment.data?.data}
                      />
                    </Field>
                    <Field label={t("Tanggal pembayaran", "Payment date")}>
                      <input
                        type="date"
                        name="paid_at"
                        required
                        defaultValue={payment.data?.data?.paid_at?.slice(0, 10)}
                        readOnly={!!payment.data?.data}
                      />
                    </Field>
                    <button disabled={action.busy}>
                      {payment.data?.data
                        ? t("Tandai settled", "Mark settled")
                        : t("Catat pembayaran", "Record payment")}
                    </button>
                  </form>
                )}
            </section>
          )}
          <section className="panel">
            <h2>{t("Histori klaim", "Claim history")}</h2>
            <Feedback {...history} retry={history.reload} />
            {history.data?.data.length === 0 && (
              <p>{t("Belum ada histori klaim.", "No claim history yet.")}</p>
            )}
            <ol className="timeline">
              {history.data?.data.map((h) => (
                <li key={h.id}>
                  <strong>{h.event.replaceAll("_", " ")}</strong>
                  <p>
                    {h.from_status || "—"} → {h.to_status || "—"}
                  </p>
                  <p>{h.notes}</p>
                  {h.approved_amount !== null && (
                    <p>{rupiah(h.approved_amount)}</p>
                  )}
                  <small>
                    {h.actor?.name ||
                      t(
                        "Sistem / data historis",
                        "System / historical data",
                      )}{" "}
                    · {date(h.created_at)}
                  </small>
                  {(h.metadata?.backfilled === true ||
                    h.event === "migrated_snapshot") && (
                    <p>
                      {t(
                        "Snapshot migrasi; detail asli tidak tersedia.",
                        "Migration snapshot; original details unavailable.",
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {history.data && (
              <Pager
                label={t("Halaman histori klaim", "Claim history pages")}
                page={historyPage}
                last={history.data.meta?.last_page || 1}
                onChange={setHistoryPage}
              />
            )}
          </section>
        </>
      )}
      {preview && (
        <Dialog
          label={preview.name}
          onClose={() => {
            URL.revokeObjectURL(preview.url);
            setPreview(null);
          }}
        >
          <div className="preview panel">
            <button
              autoFocus
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
            >
              {t("Tutup pratinjau", "Close preview")}
            </button>
            <iframe
              title={preview.name}
              src={preview.url}
              sandbox="allow-same-origin"
            />
          </div>
        </Dialog>
      )}
    </>
  );
}
