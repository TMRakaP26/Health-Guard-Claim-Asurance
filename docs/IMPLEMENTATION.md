# Status implementasi IMPROVEMENT.md

Sumber ruang lingkup: IMPROVEMENT.md; persetujuan pengguna mencakup P0–P3, MySQL8.4, assignment tetap saat resubmit, catatan dalam histori, polling default, nominal maksimal99.999.999,99 IDR. Status ini membedakan kode yang tersedia dari verifikasi deployment.

| Kelompok | Implementasi |
|---|---|
| SEC-01–08 | Cookie identitas saja, demo endpoint dihapus, pendaftaran client-only, role/policies, private documents, rate limits/token expiry/revocation, MIME/size validation, guarded demo seeding. |
| DB-01–05 | MySQL8.4 Compose/pdo_mysql, healthcheck, appdata key terpisah, import SQLite tujuan kosong, backup/restore runbook dan scripts. Validasi Docker/MySQL/restore lokal masih tertahan. |
| HIST-01–06 | Schema immutable, transaksi create/assign/decision/resubmit/upload, API paginasi, backfill jujur/idempoten, timeline bersama untuk client/analis. |
| TEST-01–05 | Matriks izin dan batas input, regression backend, TypeScript/ESLint/Vitest/RTL, Playwright/axe, manual QA document. |
| UX-01–12 | Detail deep link, real filters/page/stats, loading/error/retry/toasts, draf/form/upload retry, profil nyata, Needs Info resubmit, notif navigasi, decision confirmation, IDR, responsive/native dialog, CSV/XLSX seluruh filter. |
| ARCH-01–09 | Enum, requests/resources/policies/services, row locks/indexes, API types/hooks, scaffold/dependencies dipangkas, Pint/strictTS/ESLint, API/ADR docs. |
| OPS-01–05 | CI SQLite/MySQL/frontend/E2E/Docker, backup/restore scripts, env hardening/trusted hosts/proxies, JSON audit logs, readiness, smoke MySQL/history/private files. |
| P3-1–3 | Percakapan+lampiran, permintaan dokumen, draf server. |
| P3-4–7 | Registry provider/kategori/diagnosis/coverage rules, pembayaran manual paid/settled, admin invitations/activation/workload/SLA, analytics dan ekspor CSV. |
| P3-8–11 | Polling default + optional SSE/email, reset/verifikasi, staff TOTP/recovery, UI ID/EN/localized currency/dates. |
| P3-12–14 | Native dialogs/axe automation/manual audit guide, retention policy/deletion request/purge dry run, feature flags/demo environment guards. |

## Bukti lokal

- Backend terakhir: **74 passed, 1 skipped**,468 asersi. Skip khusus import SQLite→MySQL karena suite lokal memakai SQLite; CI mempunyai job MySQL terpisah.
- Typecheck, ESLint, Vitest/RTL5tes, cookie security5tes, dan production build lulus.
- Playwright terakhir: **2 passed**, exit0; alur client–Needs Info–resubmit–analyst approval, deep link/reload, draf/resume, ID/EN. Axe pada login, daftar klaim mobile, dan dialog keputusan tidak menemukan pelanggaran.
- Pint check lulus. Syntax PHP smoke/restore-check serta parsing PowerShell backup/restore lulus.
- Tidak ada migrasi/penghapusan data deployment utama dilakukan.

## Verifikasi yang belum boleh dianggap selesai

1. Build dan smoke stack MySQL8.4 terbaru, import salinan SQLite, restart persistence/key, serta uji backup/restore disposable. Pemeriksaan Docker diblokir karena automatic approval review tidak selesai akibat batas penggunaan layanan; bukan bukti kegagalan kode ataupun penilaian tidak aman.
2. Menjalankan workflow CI di runner GitHub (file sudah tersedia; belum ada bukti run remote).
3. Manual screen-reader audit NVDA/VoiceOver dan penerimaan desain bisnis.
4. SMTP eksternal, kebijakan retensi/durasi, data provider/polis nyata, serta pencatatan pembayaran operasional perlu konfigurasi pengelola. Fitur tersedia tetapi default email/retention nonaktif.
5. EXPLAIN dan uji contention MySQL skala produksi perlu lingkungan MySQL. Locking dan transactional rollback diuji secara lokal; SQLite tidak membuktikan locking InnoDB.

Jangan menandai seluruh Definition of Done sumber sebagai selesai sebelum pemeriksaan infrastruktur dan manual di atas dilaksanakan. Script dan CI disiapkan supaya langkah yang tersisa dapat dijalankan tanpa mengubah data deployment aktif.
