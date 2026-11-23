import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { Link, Navigate, Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../state/AuthContext";
import { useLocale } from "./locale";
import { Feedback, date, Pager, useAction, useQuery } from "./shared";
import type { Notice, Page, Catalog } from "./types";
import api from "../api/client";
export function Shell() {
  const location = useLocation();
  const { user, isLoading, logout } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const action = useAction();
  const catalog = useQuery<Catalog>(user ? "/catalog" : null);
  const [count, setCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function poll() {
      try {
        const r = await api.get<{ count: number }>(
          "/notifications/unread-count",
          { signal: controller.signal },
        );
        if (active) setCount(r.data.count);
      } catch {
        /* The notifications page exposes retry and errors. */
      }
    }
    void poll();
    const refresh = () => void poll();
    window.addEventListener("healthguard:notifications-changed", refresh);
    const timer = setInterval(() => {
      if (!document.hidden) void poll();
    }, 30000);
    // SSE uses fetch so bearer tokens never enter a URL.
    if (catalog.data?.features.realtime) {
      const connect = async () => {
        try {
          const response = await fetch("/api/notifications/stream", {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("auth_token"),
            },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) return;
          const reader = response.body.getReader();
          while (active) {
            const chunk = await reader.read();
            if (chunk.done) break;
            void poll();
          }
        } catch {
          /* Polling remains the fallback. */
        } finally {
          if (active) reconnect = setTimeout(() => void connect(), 3000);
        }
      };
      void connect();
    }
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      clearTimeout(reconnect);
      window.removeEventListener("healthguard:notifications-changed", refresh);
    };
  }, [user, catalog.data?.features.realtime]);
  if (isLoading) return <Feedback loading />;
  if (!user)
    return (
      <Navigate
        to={"/?next=" + encodeURIComponent(location.pathname + location.search)}
        replace
      />
    );
  const navigation = (
        <nav aria-label={t("Navigasi utama", "Main navigation")}>
          <Link to="/claims">{t("Daftar klaim", "Claims")}</Link>
          {user.role === "client" && (
            <>
              <Link to="/claims/new">{t("Ajukan klaim", "New claim")}</Link>
              <Link to="/drafts">{t("Draf tersimpan", "Saved drafts")}</Link>
            </>
          )}
          {user.role === "analyst" && (
            <>
              <Link to="/claims?scope=unassigned">
                {t("Belum ditugaskan", "Unassigned")}
              </Link>
              <Link to="/claims?scope=assigned">
                {t("Tugas saya", "My assignments")}
              </Link>
            </>
          )}
          {user.role !== "client" && (
            <Link to="/analytics">{t("Analitik", "Analytics")}</Link>
          )}
          {user.role === "admin" && (
            <Link to="/admin">{t("Administrasi", "Administration")}</Link>
          )}
          <Link to="/notifications">
            {t("Notifikasi", "Notifications")}{" "}
            <span className="badge">{count}</span>
          </Link>
          <Link to="/profile">
            {t("Profil & keamanan", "Profile & security")}
          </Link>
          <Link to="/guide">{t("Panduan", "Guide")}</Link>
        </nav>
  );
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        {t("Langsung ke konten", "Skip to content")}
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/claims">
          ✚ HealthGuard
        </Link>
        <button
          className="mobile-menu-toggle"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          {t("Buka menu", "Open menu")}
        </button>
        <p>
          {user.name}
          <br />
          <small>{user.role}</small>
        </p>
        <div className="desktop-navigation">{navigation}</div>
      </aside>
      {menuOpen && (
        <Dialog label={t("Menu navigasi", "Navigation menu")} onClose={() => setMenuOpen(false)}>
          <div className="panel mobile-navigation">
            <button onClick={() => setMenuOpen(false)}>{t("Tutup menu", "Close menu")}</button>
            <div onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
            }}>{navigation}</div>
          </div>
        </Dialog>
      )}
      <main id="main" className="main">
        <header className="topbar">
          <div
            className="locale-switch"
            role="group"
            aria-label={t("Pilih bahasa", "Choose language")}
          >
            <button
              type="button"
              aria-pressed={locale === "id"}
              className={locale === "id" ? "active" : ""}
              onClick={() => setLocale("id")}
            >
              <span aria-hidden="true">🇮🇩</span> ID
            </button>
            <button
              type="button"
              aria-pressed={locale === "en"}
              className={locale === "en" ? "active" : ""}
              onClick={() => setLocale("en")}
            >
              <span aria-hidden="true">🇬🇧</span> EN
            </button>
          </div>
          <button disabled={action.busy} onClick={() => void action.run(logout)}>
            {t("Keluar", "Sign out")}
          </button>
        </header>
        <Feedback error={action.error} />
        <Outlet />
      </main>
    </div>
  );
}
export function Notifications() {
  const [page, setPage] = useState(1);
  const query = useQuery<Page<Notice>>("/notifications?page=" + page);
  const action = useAction();
  const navigate = useNavigate();
  const { t } = useLocale();
  return (
    <>
      <h1>{t("Notifikasi", "Notifications")}</h1>
      <button
        disabled={action.busy}
        onClick={() =>
          void action.run(async () => {
            await api.post("/notifications/read-all");
            window.dispatchEvent(
              new Event("healthguard:notifications-changed"),
            );
            query.reload();
          })
        }
      >
        {t("Tandai semua dibaca", "Mark all read")}
      </button>
      <Feedback {...query} retry={query.reload} />
      <Feedback error={action.error} />
      {query.data?.data.map((n) => (
        <article className="panel" key={n.id}>
          <button
            className="link-button"
            onClick={() =>
              void action.run(async () => {
                try {
                  await api.post("/notifications/" + n.id + "/read");
                  window.dispatchEvent(
                    new Event("healthguard:notifications-changed"),
                  );
                } finally {
                  if (n.claim_id) navigate("/claims/" + n.claim_id);
                  else query.reload();
                }
              })
            }
          >
            <strong>
              {!n.is_read && "● "}
              {n.title}
            </strong>
          </button>
          <p>{n.body}</p>
          <small>{date(n.created_at)}</small>
        </article>
      ))}
      {query.data && (
        <Pager page={page} last={query.data.last_page} onChange={setPage} />
      )}
    </>
  );
}
export function Guide() {
  const { t } = useLocale();
  return (
    <>
      <h1>{t("Panduan klaim", "Claim guide")}</h1>
      <section className="panel">
        <ol>
          <li>
            {t(
              "Lengkapi profil dan data pengajuan. Simpan draf untuk melanjutkan nanti.",
              "Complete your profile and claim details. Save a draft to continue later.",
            )}
          </li>
          <li>
            {t(
              "Unggah bukti PDF, JPG, PNG, DOC atau DOCX, maksimal 10 MB per berkas.",
              "Upload PDF, JPG, PNG, DOC or DOCX evidence, up to 10 MB per file.",
            )}
          </li>
          <li>
            {t(
              "Pantau status, histori, dan chat pada detail klaim.",
              "Follow status, history, and chat in claim details.",
            )}
          </li>
          <li>
            {t(
              "Jika diminta informasi tambahan atau klaim ditolak/disetujui sebagian, perbaiki data lalu ajukan ulang.",
              "If more information is requested or a claim is rejected/partially approved, correct and resubmit it.",
            )}
          </li>
          <li>
            {t(
              "Catatan pembayaran menampilkan referensi pembayaran dari pengelola.",
              "Payment records show payment references recorded by the administrator.",
            )}
          </li>
        </ol>
      </section>
    </>
  );
}
