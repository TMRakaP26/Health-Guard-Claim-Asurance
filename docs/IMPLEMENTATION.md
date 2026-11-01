# Status implementasi IMPROVEMENT.md

Sumber ruang lingkup: IMPROVEMENT.md; persetujuan pengguna mencakup P0–P3, MySQL8.4, assignment tetap saat resubmit, catatan dalam histori, polling default, nominal maksimal99.999.999,99 IDR. Status ini membedakan kode yang tersedia dari verifikasi deployment.

| Kelompok | Implementasi |
|---|---|
| SEC-01–08 | Cookie identitas saja, demo endpoint dihapus, pendaftaran client-only, role/policies, private documents, rate limits/token expiry/revocation, MIME/size validation, guarded demo seeding. |
| DB-01–05 | MySQL8.4 Compose/pdo_mysql, healthcheck, appdata key terpisah, import SQLite tujuan kosong, backup/restore runbook dan scripts. Build, smoke, import fixture, persistensi dan restore lokal lulus pada stack terpisah. |
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

- Verifikasi lanjutan pada **1 November 2026**, menggunakan fixture sintetis dan project Docker `healthguard-check`/`healthguard-restore` yang terpisah dari deployment aktif.
- Backend SQLite: **74 passed, 2 skipped**, 468 asersi (76 tes). Dua skip adalah pengujian import yang memerlukan MySQL.
- Backend MySQL 8.4/PHP 8.4: **75 passed, 1 skipped**, 483 asersi (76 tes). Skip adalah pengujian penolakan tujuan SQLite. Import fixture mempertahankan ID, hash password, assignment, nominal, dokumen, notifikasi dan histori; ID klaim berikutnya tidak bertabrakan. Sumber tidak berubah, import ulang ditolak, dan relasi tidak valid menyebabkan rollback seluruh import.
- Typecheck, ESLint, Vitest/RTL5tes, cookie security5tes, dan production build lulus.
- Playwright terakhir: **2 passed**, exit0; alur client–Needs Info–resubmit–analyst approval, deep link/reload, draf/resume, ID/EN. Axe pada login, daftar klaim mobile, dan dialog keputusan tidak menemukan pelanggaran.
- Docker build dan HTTP smoke lulus: autentikasi, histori, upload/download privat, penolakan URL dokumen publik dan pembatasan role.
- Uji proses MySQL bersamaan lulus: empat klien menghasilkan ID klaim unik; dua analis menghasilkan tepat satu assignment dan satu event histori. EXPLAIN menunjukkan indeks pemilik/tanggal tersedia.
- Pembuatan ulang container (`down` lalu `up`, tanpa menghapus volume) mempertahankan database, file privat dan key. Fixture terenkripsi masih dapat dibaca, lalu smoke lulus kembali.
- Backup dan restore ke stack disposable lulus; fixture terenkripsi dan isi file cocok, lalu smoke pada hasil restore lulus. Masalah restart yang menunggu readiness saat maintenance telah diperbaiki dengan `restart --no-deps`.
- Backup mempertahankan maintenance yang sudah aktif. Manifest tidak lengkap, duplikat atau checksum salah ditolak sebelum Docker dipanggil. Parsing PowerShell, pengujian negatif backup, dan Pint lulus.
- Workflow CI diperluas dengan uji concurrency MySQL, persistensi setelah pembuatan ulang container, validasi backup, dan smoke setelah restore.
- Tidak ada migrasi/penghapusan data deployment utama dilakukan.

## Verifikasi yang belum boleh dianggap selesai

1. Menjalankan workflow CI di runner GitHub, termasuk PowerShell 7 Linux (file sudah tersedia; belum ada bukti run remote). Skrip backup/restore lokal telah dijalankan dengan Windows PowerShell 5.1.
2. Manual screen-reader audit NVDA/VoiceOver dan penerimaan desain bisnis.
3. SMTP eksternal, kebijakan retensi/durasi, data provider/polis nyata, serta pencatatan pembayaran operasional perlu konfigurasi pengelola. Fitur tersedia tetapi default email/retention nonaktif.
4. Benchmark dan penilaian query pada volume data produksi. Uji contention InnoDB dasar dan ketersediaan indeks sudah lulus, tetapi tidak membuktikan kapasitas produksi.
5. Cutover data operasional: import dan restore telah diuji memakai fixture sintetis. Rekonsiliasi jumlah record dan file dari backup data nyata tetap perlu dilakukan pada maintenance window sebelum migrasi deployment aktif.

Jangan menandai seluruh Definition of Done sumber sebagai selesai sebelum pemeriksaan manual, CI remote, dan kesiapan operasional di atas dilaksanakan. Tidak ada migrasi atau pemulihan yang dijalankan pada database deployment aktif.
