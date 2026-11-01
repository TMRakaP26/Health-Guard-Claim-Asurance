import { useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";
import { useAuth } from "../state/AuthContext";
import { useLocale } from "./locale";
import { Field, Feedback, formValues, useAction } from "./shared";
import { getQuickUsers, removeQuickUserByEmail } from "../utils/cookies";
import api from "../api/client";
export function AuthPage() {
  const { user, isLoading, login, register } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const path = useLocation().pathname;
  const [params] = useSearchParams();
  const action = useAction();
  const [done, setDone] = useState("");
  const [email, setEmail] = useState("");
  const [quick, setQuick] = useState(getQuickUsers);
  const isRegister = path === "/register";
  const reset = path === "/reset-password";
  const forgot = path === "/forgot-password";
  const invite = path === "/accept-invitation";
  const signin = !(isRegister || reset || forgot || invite);
  if (isLoading) return <Feedback loading />;
  const next = params.get("next") || "/claims";
  if (user && (signin || isRegister))
    return (
      <Navigate
        to={
          next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
            ? next
            : "/claims"
        }
        replace
      />
    );
  const title = isRegister
    ? t("Buat akun", "Create account")
    : reset
      ? t("Atur ulang password", "Reset password")
      : forgot
        ? t("Lupa password", "Forgot password")
        : invite
          ? t("Terima undangan analis", "Accept analyst invitation")
          : t("Selamat datang kembali", "Welcome back");
  return (
    <main className="auth-layout">
      <aside className="auth-art">
        <div className="brand">✚ HealthGuard</div>
        <h1>
          {t("Klaim kesehatan, lebih jelas.", "Health claims, made clear.")}
        </h1>
        <p>
          {t(
            "Pantau pengajuan dan berkomunikasi dengan analis dalam satu tempat.",
            "Track submissions and communicate with your analyst in one place.",
          )}
        </p>
      </aside>
      <section className="auth-card">
        <label className="language">
          Language{" "}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as "id" | "en")}
          >
            <option value="id">Indonesia</option>
            <option value="en">English</option>
          </select>
        </label>
        <h1>{title}</h1>
        <Feedback error={action.error} />
        {done && (
          <p role="status" className="success">
            {done}
          </p>
        )}
        <form
          onSubmit={(e) => {
            const data = formValues(e);
            void action.run(async () => {
              if (signin) await login(data);
              else if (isRegister) await register(data);
              else if (forgot) {
                await api.post("/forgot-password", data);
                setDone(
                  t(
                    "Jika alamat terdaftar, petunjuk reset akan dikirim.",
                    "If the address is registered, reset instructions will be sent.",
                  ),
                );
              } else if (reset) {
                await api.post("/reset-password", {
                  ...data,
                  token: params.get("token"),
                });
                setDone(
                  t(
                    "Password diubah. Silakan masuk.",
                    "Password changed. Please sign in.",
                  ),
                );
              } else {
                await api.post("/invitations/accept", {
                  ...data,
                  token: params.get("token"),
                });
                setDone(
                  t(
                    "Akun siap. Masuk dan aktifkan 2FA di profil.",
                    "Account ready. Sign in and enable 2FA in your profile.",
                  ),
                );
              }
            });
          }}
        >
          {(isRegister || invite) && (
            <Field label={t("Nama lengkap", "Full name")}>
              <input name="name" required maxLength={255} autoComplete="name" />
            </Field>
          )}
          {!invite && (
            <Field label="Email">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={reset ? params.get("email") || email : email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={reset && !!params.get("email")}
              />
            </Field>
          )}
          {!forgot && (
            <Field label="Password">
              <input
                name="password"
                type="password"
                minLength={signin ? 1 : 8}
                maxLength={128}
                required
                autoComplete={signin ? "current-password" : "new-password"}
              />
            </Field>
          )}
          {(isRegister || reset || invite) && (
            <Field label={t("Konfirmasi password", "Confirm password")}>
              <input
                name="password_confirmation"
                type="password"
                required
                autoComplete="new-password"
              />
            </Field>
          )}
          {signin && (
            <Field
              label={t(
                "Kode 2FA / pemulihan (jika aktif)",
                "2FA / recovery code (if enabled)",
              )}
            >
              <input name="two_factor_code" autoComplete="one-time-code" />
            </Field>
          )}
          <button className="primary" disabled={action.busy}>
            {action.busy ? t("Memproses…", "Working…") : title}
          </button>
        </form>
        <div className="actions">
          <Link to="/">{t("Masuk", "Sign in")}</Link>
          <Link to="/register">{t("Daftar", "Register")}</Link>
          <Link to="/forgot-password">
            {t("Lupa password?", "Forgot password?")}
          </Link>
        </div>
        {signin && quick.length > 0 && (
          <section>
            <h2>{t("Akun tersimpan", "Saved accounts")}</h2>
            {quick.map((q) => (
              <div className="actions" key={q.email}>
                <button onClick={() => setEmail(q.email)}>
                  {q.name} · {q.email}
                </button>
                <button
                  aria-label={
                    t("Hapus akun tersimpan ", "Remove saved account ") +
                    q.email
                  }
                  onClick={() => {
                    removeQuickUserByEmail(q.email);
                    setQuick(getQuickUsers());
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
