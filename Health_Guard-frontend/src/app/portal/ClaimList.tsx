import { Link, useSearchParams } from "react-router";
import { useAuth } from "../state/AuthContext";
import { useLocale } from "./locale";
import {
  Field,
  Feedback,
  Pager,
  date,
  rupiah,
  saveBlob,
  useAction,
  useQuery,
} from "./shared";
import { statuses, type ClaimPage } from "./types";
import api from "../api/client";
export function ClaimList() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLocale();
  const action = useAction();
  const query = useQuery<ClaimPage>("/claims?" + params.toString());
  function filter(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete("page");
    setParams(p);
  }
  async function exportFile(xlsx: boolean) {
    const r = await api.get<string>("/claims/export?" + params.toString(), {
      responseType: "text",
    });
    if (xlsx) {
      const XLSX = await import("xlsx");
      const book = XLSX.read(r.data, { type: "string", raw: true });
      XLSX.writeFile(book, "healthguard-claims.xlsx");
    } else
      saveBlob(
        new Blob([r.data], { type: "text/csv;charset=utf-8" }),
        "healthguard-claims.csv",
      );
  }
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">HEALTHGUARD</p>
          <h1>{t("Daftar klaim", "Claims")}</h1>
        </div>
        {user?.role === "client" ? (
          <Link className="button primary" to="/claims/new">
            {t("Ajukan klaim", "New claim")}{" "}
          </Link>
        ) : (
          <div className="actions">
            <button
              disabled={action.busy}
              onClick={() => void action.run(() => exportFile(false))}
            >
              CSV
            </button>
            <button
              disabled={action.busy}
              onClick={() => void action.run(() => exportFile(true))}
            >
              XLSX
            </button>
          </div>
        )}
      </header>
      <section className="stats">
        <article>
          <span>{t("Klaim sesuai filter", "Filtered claims")}</span>
          <strong>{query.data?.stats.total ?? "—"}</strong>
        </article>
        <article>
          <span>{t("Nominal diajukan", "Submitted amount")}</span>
          <strong>{query.data ? rupiah(query.data.stats.amount) : "—"}</strong>
        </article>
        <article>
          <span>{t("Nominal disetujui", "Approved amount")}</span>
          <strong>
            {query.data ? rupiah(query.data.stats.approved_amount) : "—"}
          </strong>
        </article>
      </section>
      <section className="panel filters">
        <Field
          label={t(
            "Cari klaim, pasien, provider",
            "Search claim, patient, provider",
          )}
        >
          <input
            type="search"
            value={params.get("q") || ""}
            onChange={(e) => filter("q", e.target.value)}
            maxLength={255}
          />
        </Field>
        <Field label="Status">
          <select
            value={params.get("status") || ""}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">{t("Semua", "All")}</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label={t("Dari tanggal", "From date")}>
          <input
            type="date"
            value={params.get("date_from") || ""}
            onChange={(e) => filter("date_from", e.target.value)}
          />
        </Field>
        <Field label={t("Sampai tanggal", "To date")}>
          <input
            type="date"
            value={params.get("date_to") || ""}
            onChange={(e) => filter("date_to", e.target.value)}
          />
        </Field>
        <Field label={t("Urutan", "Sort")}>
          <select
            value={params.get("sort") || "newest"}
            onChange={(e) => filter("sort", e.target.value)}
          >
            <option value="newest">{t("Terbaru", "Newest")}</option>
            <option value="oldest">{t("Terlama", "Oldest")}</option>
            <option value="amount_asc">
              {t("Nominal naik", "Amount ascending")}
            </option>
            <option value="amount_desc">
              {t("Nominal turun", "Amount descending")}
            </option>
          </select>
        </Field>
        <button onClick={() => setParams({})}>
          {t("Reset filter", "Reset filters")}
        </button>
      </section>
      <Feedback {...query} retry={query.reload} />
      <Feedback error={action.error} />
      {query.data && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                {t(
                  "Klaim sesuai filter aktif",
                  "Claims matching active filters",
                )}
              </caption>
              <thead>
                <tr>
                  {[
                    t("Klaim / pasien", "Claim / patient"),
                    "Provider",
                    t("Nominal", "Amount"),
                    "Status",
                    t("Analis", "Analyst"),
                    t("Tanggal", "Submitted"),
                  ].map((s) => (
                    <th scope="col" key={s}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((c) => (
                  <tr key={c.claim_id}>
                    <td>
                      <Link to={"/claims/" + c.claim_id}>{c.claim_id}</Link>
                      <small>{c.client_name}</small>
                    </td>
                    <td>
                      {c.provider_name}
                      <small>{c.type}</small>
                    </td>
                    <td>{rupiah(c.amount)}</td>
                    <td>
                      <span className="badge">{c.status}</span>
                    </td>
                    <td>{c.assigned_analyst?.name || "—"}</td>
                    <td>{date(c.date_submitted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.data.length === 0 && (
            <p>
              {t(
                "Tidak ada klaim sesuai filter.",
                "No claims match your filters.",
              )}
            </p>
          )}
          <Pager
            page={query.data.current_page}
            last={query.data.last_page}
            onChange={(p) => {
              const next = new URLSearchParams(params);
              next.set("page", String(p));
              setParams(next);
            }}
          />
        </section>
      )}
    </>
  );
}
