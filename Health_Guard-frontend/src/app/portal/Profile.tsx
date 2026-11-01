import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import api from "../api/client";
import { useAuth } from "../state/AuthContext";
import { useLocale } from "./locale";
import {
  date,
  Feedback,
  Field,
  formValues,
  useAction,
  useQuery,
} from "./shared";
import type { Catalog, Page } from "./types";
export interface Deletion {
  id: number;
  user_id: number | null;
  status: string;
  reason: string | null;
  review_notes: string | null;
  created_at: string;
}
export function Profile() {
  const { user, refreshUser } = useAuth();
  const { t } = useLocale();
  const action = useAction();
  const catalog = useQuery<Catalog>("/catalog");
  const deletions = useQuery<Page<Deletion>>("/deletion-requests");
  const [setup, setSetup] = useState<{ secret: string; otpauth_url: string }>();
  const [codes, setCodes] = useState<string[]>();
  if (!user) return null;
  return (
    <>
      <h1>{t("Profil & keamanan", "Profile & security")}</h1>
      <Feedback error={action.error} />
      <section className="panel">
        <h2>{t("Data pribadi", "Personal details")}</h2>
        <form
          onSubmit={(e) => {
            const data = formValues(e);
            void action.run(async () => {
              await api.put("/user", data);
              await refreshUser();
              toast.success(t("Profil disimpan", "Profile saved"));
            });
          }}
        >
          <div className="filters">
            {(
              [
                "name",
                "email",
                "username",
                "phone",
                "date_of_birth",
                "bpjs_number",
                "address",
              ] as const
            ).map((key) => (
              <Field
                key={key}
                label={
                  {
                    name: t("Nama", "Name"),
                    email: "Email",
                    username: "Username",
                    phone: t("Telepon", "Phone"),
                    date_of_birth: t("Tanggal lahir", "Date of birth"),
                    bpjs_number: "BPJS",
                    address: t("Alamat", "Address"),
                  }[key]
                }
              >
                <input
                  name={key}
                  type={
                    key === "email"
                      ? "email"
                      : key === "date_of_birth"
                        ? "date"
                        : "text"
                  }
                  defaultValue={user[key] || ""}
                  required={key === "name" || key === "email"}
                />
              </Field>
            ))}
          </div>
          <button disabled={action.busy}>
            {t("Simpan profil", "Save profile")}
          </button>
        </form>
        {user.profile_photo && (
          <img
            className="avatar"
            src={"/storage/" + user.profile_photo}
            alt={t("Foto profil", "Profile photo")}
          />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void action.run(async () => {
              await api.post("/user/photo", data);
              await refreshUser();
            });
          }}
        >
          <Field
            label={t(
              "Foto JPG/PNG, maksimal 2 MB",
              "JPG/PNG photo, maximum 2 MB",
            )}
          >
            <input name="photo" type="file" required accept=".jpg,.jpeg,.png" />
          </Field>
          <button disabled={action.busy}>
            {t("Unggah foto", "Upload photo")}
          </button>
          <button
            type="button"
            disabled={action.busy || !user.profile_photo}
            onClick={() =>
              void action.run(async () => {
                await api.delete("/user/photo");
                await refreshUser();
              })
            }
          >
            {t("Hapus foto", "Remove photo")}
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>{t("Password & sesi", "Password & sessions")}</h2>
        <form
          onSubmit={(e) => {
            const data = formValues(e);
            void action.run(async () => {
              await api.put("/user", data);
            });
          }}
        >
          <Field label={t("Password saat ini", "Current password")}>
            <input
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label={t("Password baru", "New password")}>
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label={t("Konfirmasi password", "Confirm password")}>
            <input
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
          <p>
            {t(
              "Perubahan password mengakhiri semua sesi.",
              "Changing your password ends all sessions.",
            )}
          </p>
          <button disabled={action.busy}>
            {t("Ubah password", "Change password")}
          </button>
        </form>
        <button
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              await api.post("/logout-all");
              localStorage.removeItem("auth_token");
              window.location.assign("/");
            })
          }
        >
          {t("Keluar dari semua perangkat", "Sign out all devices")}
        </button>
      </section>
      <section className="panel">
        <h2>{t("Verifikasi email", "Email verification")}</h2>
        <p>
          {user.email_verified_at
            ? date(user.email_verified_at)
            : t("Belum diverifikasi", "Not verified")}
        </p>
        {catalog.data?.features.email && !user.email_verified_at && (
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await api.post("/email/verification-notification");
                toast.success(
                  t("Email verifikasi dikirim", "Verification email sent"),
                );
              })
            }
          >
            {t("Kirim email verifikasi", "Send verification email")}
          </button>
        )}
      </section>
      {user.role !== "client" && (
        <section className="panel">
          <h2>{t("Autentikasi dua faktor", "Two-factor authentication")}</h2>
          <p>
            {user.two_factor_enabled
              ? t("Aktif", "Enabled")
              : t("Belum aktif", "Disabled")}
          </p>
          {!user.two_factor_enabled && !setup && (
            <form
              onSubmit={(e) => {
                const data = formValues(e);
                void action.run(async () => {
                  const r = await api.post<{
                    secret: string;
                    otpauth_url: string;
                  }>("/two-factor/setup", data);
                  setSetup(r.data);
                });
              }}
            >
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </Field>
              <button disabled={action.busy}>
                {t("Siapkan 2FA", "Set up 2FA")}
              </button>
            </form>
          )}
          {setup && (
            <>
              <p>
                {t(
                  "Tambahkan kunci berikut ke aplikasi authenticator.",
                  "Add this key to your authenticator app.",
                )}
              </p>
              <code className="secret">{setup.secret}</code>
              <form
                onSubmit={(e) => {
                  const data = formValues(e);
                  void action.run(async () => {
                    const r = await api.post<{ recovery_codes: string[] }>(
                      "/two-factor/confirm",
                      data,
                    );
                    setCodes(r.data.recovery_codes);
                    setSetup(undefined);
                    await refreshUser();
                  });
                }}
              >
                <Field label={t("Kode authenticator", "Authenticator code")}>
                  <input
                    name="code"
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                  />
                </Field>
                <button disabled={action.busy}>
                  {t("Aktifkan", "Enable")}
                </button>
              </form>
            </>
          )}
          {codes && (
            <div role="status">
              <p>
                {t(
                  "Simpan kode pemulihan ini di tempat aman. Setiap kode hanya berlaku sekali.",
                  "Save these recovery codes securely. Each code works once.",
                )}
              </p>
              <pre>{codes.join("\n")}</pre>
              <button onClick={() => setCodes(undefined)}>
                {t("Sudah disimpan", "Saved securely")}
              </button>
            </div>
          )}
          {user.two_factor_enabled && (
            <form
              onSubmit={(e) => {
                const data = formValues(e);
                void action.run(async () => {
                  await api.delete("/two-factor", { data });
                });
              }}
            >
              <Field label="Password">
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                />
              </Field>
              <Field label={t("Kode 2FA / pemulihan", "2FA / recovery code")}>
                <input name="code" required autoComplete="one-time-code" />
              </Field>
              <button disabled={action.busy}>
                {t("Nonaktifkan 2FA & keluar", "Disable 2FA & sign out")}
              </button>
            </form>
          )}
        </section>
      )}
      <section className="panel">
        <h2>{t("Permintaan penghapusan akun", "Account deletion request")}</h2>
        <p>
          {t(
            "Pengelola akan meninjau klaim terbuka dan kebijakan retensi sebelum menghapus data.",
            "The administrator reviews open claims and the retention policy before deleting data.",
          )}
        </p>
        <form
          onSubmit={(e) => {
            const data = formValues(e);
            void action.run(async () => {
              await api.post("/deletion-requests", data);
              deletions.reload();
            });
          }}
        >
          <Field label={t("Alasan", "Reason")}>
            <textarea name="reason" maxLength={2000} />
          </Field>
          <button disabled={action.busy}>
            {t("Ajukan permintaan", "Request deletion")}
          </button>
        </form>
        <Feedback {...deletions} retry={deletions.reload} />
        {deletions.data?.data.map((d) => (
          <p key={d.id}>
            {d.status} · {d.review_notes || d.reason}
          </p>
        ))}
      </section>
    </>
  );
}
export function VerifyEmail() {
  const [params] = useSearchParams();
  const action = useAction();
  const { refreshUser } = useAuth();
  const { t } = useLocale();
  const [done, setDone] = useState(false);
  return (
    <>
      <h1>{t("Verifikasi email", "Verify email")}</h1>
      <Feedback error={action.error} />
      {done ? (
        <p>{t("Email berhasil diverifikasi", "Email verified")}</p>
      ) : (
        <button
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const url = new URL(params.get("url") || "");
              if (
                url.origin !== window.location.origin ||
                !url.pathname.startsWith("/api/email/verify/")
              )
                throw new Error("Invalid verification link");
              await api.get(url.pathname.replace(/^\/api/, "") + url.search);
              await refreshUser();
              setDone(true);
            })
          }
        >
          {t("Verifikasi alamat email", "Verify email address")}
        </button>
      )}
    </>
  );
}
