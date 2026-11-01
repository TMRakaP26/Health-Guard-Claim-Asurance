import { useState } from "react";
import api from "../api/client";
import { useAuth } from "../state/AuthContext";
import { useLocale } from "./locale";
import {
  Feedback,
  Field,
  formValues,
  Pager,
  rupiah,
  saveBlob,
  useAction,
  useQuery,
} from "./shared";
import type { Catalog, CatalogItem, Page, User } from "./types";
import type { Deletion } from "./Profile";
export function Admin() {
  const { user } = useAuth();
  const { t } = useLocale();
  const action = useAction();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const users = useQuery<Page<User>>(
    "/admin/users?page=" + page + "&q=" + encodeURIComponent(search),
  );
  const catalog = useQuery<Catalog>("/admin/catalog");
  const [deletionPage, setDeletionPage] = useState(1);
  const deletions = useQuery<Page<Deletion>>(
    "/deletion-requests?page=" + deletionPage,
  );
  const [invite, setInvite] = useState("");
  const [kind, setKind] = useState("providers");
  const [edit, setEdit] = useState<CatalogItem>();
  if (user?.role !== "admin") return <p role="alert">403</p>;
  return (
    <>
      <h1>{t("Administrasi", "Administration")}</h1>
      <Feedback error={action.error} />
      <section className="panel">
        <h2>{t("Pengguna & beban kerja", "Users & workload")}</h2>
        <Field label={t("Cari nama / email", "Search name / email")}>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Feedback {...users} retry={users.reload} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Pengguna", "User")}</th>
                <th>Role</th>
                <th>Pending / SLA</th>
                <th>{t("Akses", "Access")}</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.data.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    <small>{u.email}</small>
                  </td>
                  <td>{u.role}</td>
                  <td>
                    {u.pending_assignments || 0} / {u.overdue_assignments || 0}
                  </td>
                  <td>
                    <button
                      disabled={action.busy || u.role === "admin"}
                      onClick={() =>
                        void action.run(async () => {
                          await api.patch("/admin/users/" + u.id + "/active", {
                            is_active: !u.is_active,
                          });
                          users.reload();
                        })
                      }
                    >
                      {u.is_active
                        ? t("Nonaktifkan", "Deactivate")
                        : t("Aktifkan", "Activate")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.data && (
          <Pager page={page} last={users.data.last_page} onChange={setPage} />
        )}
        <form
          onSubmit={(e) => {
            const data = formValues(e);
            void action.run(async () => {
              const r = await api.post<{ invitation_url: string }>(
                "/admin/invitations",
                data,
              );
              setInvite(r.data.invitation_url);
            });
          }}
        >
          <Field label={t("Email calon analis", "New analyst email")}>
            <input name="email" type="email" required />
          </Field>
          <button disabled={action.busy}>
            {t("Buat undangan", "Create invitation")}
          </button>
        </form>
        {invite && (
          <div role="status">
            <p>
              {t(
                "Tautan undangan berlaku 24 jam. Sampaikan hanya kepada penerima.",
                "Invitation valid for 24 hours. Share only with the recipient.",
              )}
            </p>
            <input aria-label="Invitation link" readOnly value={invite} />
          </div>
        )}
      </section>
      <section className="panel">
        <h2>{t("Provider & aturan kategori", "Providers & category rules")}</h2>
        <Field label={t("Jenis katalog", "Catalog type")}>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setEdit(undefined);
            }}
          >
            <option value="providers">Provider</option>
            <option value="categories">{t("Kategori", "Category")}</option>
          </select>
        </Field>
        <Feedback {...catalog} retry={catalog.reload} />
        <ul>
          {(kind === "providers"
            ? catalog.data?.providers
            : catalog.data?.categories
          )?.map((c) => (
            <li key={c.id}>
              <button onClick={() => setEdit(c)}>
                {c.code} · {c.name} · {c.is_active ? "Active" : "Inactive"}
              </button>
              {c.coverage_limit && rupiah(c.coverage_limit)}
            </li>
          ))}
        </ul>
        <form
          key={kind + ":" + (edit?.id || "new")}
          onSubmit={(e) => {
            const data = formValues(e);
            void action.run(async () => {
              await api.request({
                method: edit ? "put" : "post",
                url: "/admin/catalog/" + kind + (edit ? "/" + edit.id : ""),
                data: {
                  ...data,
                  is_active: data.is_active === "true",
                  coverage_limit: data.coverage_limit || null,
                },
              });
              setEdit(undefined);
              catalog.reload();
            });
          }}
        >
          <div className="filters">
            <Field label={t("Kode", "Code")}>
              <input
                name="code"
                required
                maxLength={30}
                defaultValue={edit?.code}
              />
            </Field>
            <Field label={t("Nama", "Name")}>
              <input
                name="name"
                required
                maxLength={255}
                defaultValue={edit?.name}
              />
            </Field>
            <Field label="Status">
              <select
                name="is_active"
                defaultValue={String(edit?.is_active ?? true)}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
            {kind === "providers" ? (
              <Field label={t("Alamat", "Address")}>
                <textarea
                  name="address"
                  maxLength={1000}
                  defaultValue={edit?.address}
                />
              </Field>
            ) : (
              <>
                <Field label={t("Kode diagnosis", "Diagnosis code")}>
                  <input
                    name="diagnosis_code"
                    maxLength={30}
                    defaultValue={edit?.diagnosis_code}
                  />
                </Field>
                <Field
                  label={t("Batas pertanggungan (IDR)", "Coverage limit (IDR)")}
                >
                  <input
                    name="coverage_limit"
                    type="number"
                    min=".01"
                    max="99999999.99"
                    step=".01"
                    defaultValue={edit?.coverage_limit || ""}
                  />
                </Field>
                <Field label={t("Aturan pertanggungan", "Coverage rules")}>
                  <textarea
                    name="coverage_rules"
                    maxLength={4000}
                    defaultValue={edit?.coverage_rules || ""}
                  />
                </Field>
              </>
            )}
          </div>
          <button disabled={action.busy}>
            {edit ? t("Simpan perubahan", "Save changes") : t("Tambah", "Add")}
          </button>
          <button type="button" onClick={() => setEdit(undefined)}>
            {t("Batal edit", "Cancel edit")}
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>{t("Permintaan penghapusan", "Deletion requests")}</h2>
        <Feedback {...deletions} retry={deletions.reload} />
        {deletions.data?.data.map((d) => (
          <article className="message" key={d.id}>
            <p>
              #{d.id} · User #{d.user_id || "—"} · {d.status}
            </p>
            <p>{d.reason}</p>
            <p>{d.review_notes}</p>
            {d.status === "pending" && (
              <form
                onSubmit={(e) => {
                  const data = formValues(e);
                  if (
                    window.confirm(
                      t(
                        "Simpan keputusan? Persetujuan menghapus data sesuai kebijakan retensi yang aktif.",
                        "Save decision? Approval deletes data according to the enabled retention policy.",
                      ),
                    )
                  )
                    void action.run(async () => {
                      await api.patch("/admin/deletion-requests/" + d.id, {
                        ...data,
                        confirm: true,
                      });
                      deletions.reload();
                      users.reload();
                    });
                }}
              >
                <Field label={t("Keputusan", "Decision")}>
                  <select name="status">
                    <option value="rejected">{t("Tolak", "Reject")}</option>
                    <option value="approved">
                      {t("Setujui penghapusan", "Approve deletion")}
                    </option>
                  </select>
                </Field>
                <Field label={t("Catatan peninjauan", "Review notes")}>
                  <textarea name="review_notes" required maxLength={2000} />
                </Field>
                <button disabled={action.busy}>{t("Simpan", "Save")}</button>
              </form>
            )}
          </article>
        ))}
        {deletions.data && (
          <Pager
            page={deletionPage}
            last={deletions.data.last_page}
            onChange={setDeletionPage}
          />
        )}
      </section>
    </>
  );
}
interface Group {
  label: string;
  count: number;
  amount: string;
}
interface AnalyticsData {
  total: number;
  approved: number;
  approval_rate: number;
  average_decision_hours: number | null;
  by_status: Group[];
  by_provider: Group[];
  by_type: Group[];
}
export function Analytics() {
  const { t } = useLocale();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = new URLSearchParams();
  if (from) params.set("date_from", from);
  if (to) params.set("date_to", to);
  const query = useQuery<AnalyticsData>("/analytics?" + params);
  return (
    <>
      <h1>{t("Analitik klaim", "Claims analytics")}</h1>
      <button
        disabled={!query.data}
        onClick={() => {
          if (!query.data) return;
          const rows: (string | number)[][] = [
            ["Metric", "Group", "Count", "Amount IDR"],
            ["summary", "total", query.data.total, ""],
            ["summary", "approval_rate_percent", query.data.approval_rate, ""],
            [
              "summary",
              "average_decision_hours",
              query.data.average_decision_hours ?? "",
              "",
            ],
          ];
          for (const key of ["by_status", "by_provider", "by_type"] as const)
            for (const group of query.data[key])
              rows.push([key, group.label, group.count, group.amount]);
          const csv = rows
            .map((row) =>
              row
                .map((value) => {
                  const text = String(value);
                  return (
                    '"' +
                    (/^[=+@\-\t\r\n]/.test(text) ? "'" : "") +
                    text.replaceAll('"', '""') +
                    '"'
                  );
                })
                .join(","),
            )
            .join("\r\n");
          saveBlob(
            new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
            "healthguard-analytics.csv",
          );
        }}
      >
        {t("Ekspor laporan CSV", "Export CSV report")}
      </button>
      <section className="panel filters">
        <Field label={t("Dari tanggal", "From date")}>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label={t("Sampai tanggal", "To date")}>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </section>
      <Feedback {...query} retry={query.reload} />
      {query.data && (
        <>
          <section className="stats">
            <article>
              <span>Total</span>
              <strong>{query.data.total}</strong>
            </article>
            <article>
              <span>{t("Tingkat persetujuan", "Approval rate")}</span>
              <strong>{query.data.approval_rate}%</strong>
            </article>
            <article>
              <span>
                {t("Rata-rata jam keputusan", "Average decision hours")}
              </span>
              <strong>{query.data.average_decision_hours ?? "—"}</strong>
            </article>
          </section>
          {(["by_status", "by_provider", "by_type"] as const).map((key) => (
            <section className="panel" key={key}>
              <h2>
                {
                  {
                    by_status: "Status",
                    by_provider: "Provider",
                    by_type: t("Kategori", "Category"),
                  }[key]
                }
              </h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Kelompok", "Group")}</th>
                      <th>{t("Jumlah", "Count")}</th>
                      <th>{t("Nominal", "Amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data?.[key].map((g) => (
                      <tr key={g.label}>
                        <td>{g.label}</td>
                        <td>{g.count}</td>
                        <td>{rupiah(g.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
