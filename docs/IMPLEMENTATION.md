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

### Pembaruan 19 November 2026

- `UX-04` selesai: hapus berkas sebelum pengiriman, retry berkas individual yang gagal/belum
  dikirim, daftar nama berkas saat konfirmasi, ringkasan dan pesan validasi per field, fokus
  field invalid pertama, serta guard navigasi ketika klaim tersimpan tetapi unggahan belum selesai.
  Retry mempertahankan ID klaim dan melewati berkas yang sudah dikonfirmasi berhasil.
- Verifikasi frontend lokal: TypeScript, ESLint, **12 tes Vitest**, **5 tes keamanan cookie**,
  dan build produksi lulus. Tujuh tes baru mencakup pemulihan formulir dan autentikasi.
  Setup tes mengisolasi storage dan menggunakan AbortController yang kompatibel dengan Node Request;
  mesin lokal memakai Node 26, sedangkan workflow memakai Node 22.
- `ValidationBoundaryTest.php` menambah kasus registrasi, field klaim, nominal/BPJS dan pagination,
  termasuk memastikan input invalid tidak meninggalkan klaim atau histori. Tes baru telah
  dijalankan melalui CI PR pada SQLite dan MySQL; kedua job termasuk Pint berhasil.
  SQLite mencatat 667 asersi dan MySQL 682 asersi. Ringkasan masing-masing menampilkan
  `128 warnings, 1 passed`; warning `file_get_contents` masih perlu ditindaklanjuti,
  sehingga hasil ini bukan klaim suite bebas peringatan. Runtime backend lokal tetap tidak tersedia.
  `TEST-02` tetap parsial; matriks keputusan, file dan ID masih perlu direkonsiliasi dengan seluruh
  kasus yang sudah ada, lalu seluruh suite harus lulus.
- `TEST-04` tetap parsial: komponen bertambah, tetapi seluruh matriks E2E belum lengkap.
- CI remote telah diperiksa melalui GitHub pada 19 November 2026:
  [run 41441752142](https://github.com/TMRakaP26/Health-Guard-Claim-Asurance/actions/runs/41441752142),
  commit `aff4a2297daf01f316d949caa9978cff1154d517` (2 November), gagal pada Pint
  `method_argument_space` di `CollaborationController.php` dan `ProductWorkflowsTest.php`.
  Frontend, E2E dan Docker berhasil; backend MySQL gagal, backend SQLite dibatalkan setelah
  kegagalan format. Koreksi spasi sudah ada pada salinan lokal. Hasil lama ini bukan bukti CI
  untuk perubahan terbaru. Setelah izin eksplisit pengguna, tujuh file kode/tes dipublikasikan
  dalam [draft PR #1](https://github.com/TMRakaP26/Health-Guard-Claim-Asurance/pull/1),
  branch `codex/improvement-upload-validation`, commit `5551024d3ebb63153d0a49f068c2c00907d8ebab`.
  [CI PR run 44478230866](https://github.com/TMRakaP26/Health-Guard-Claim-Asurance/actions/runs/44478230866)
  **success** pada commit tersebut: backend SQLite/MySQL, frontend, E2E dan Docker berhasil.
  Dua skenario Playwright lulus. Docker mencakup smoke, concurrency MySQL, persistensi,
  backup, penolakan backup invalid, restore disposable, dan verifikasi enkripsi/storage.
  `OPS-01` selesai; progress menjadi **59/64**, lima tiket tetap parsial.
  Dokumentasi progress tetap lokal dan main tidak diubah; PR tetap draft, belum di-merge.
- QA manual, alur keyboard-only penuh, dan audit NVDA/VoiceOver belum dijalankan;
  `TEST-05`, `UX-10`, dan `BL-12` tetap parsial. Tidak ada data deployment yang dimigrasikan.

### Lanjutan matriks pengujian (19 November 2026)

- TEST-02: ditambah keputusan untuk seluruh status, nominal parsial, catatan wajib/batas panjang,
  email duplikat/panjang, ID tidak dikenal/malformed, JPEG, serta batas foto tepat 2 MB.
- TEST-04: ditambah tes interceptor Axios 401/reauthenticate, akses route, notifikasi,
  seluruh badge status, histori berisi/kosong/error, dan browser registration/rejection/
  resubmission/partial approval/notification/ownership. [Peta cakupan](TEST-COVERAGE.md)
  menunjukkan pengganti komponen lama dan delapan skenario E2E sumber.
- Regresi yang ditemukan diperbaiki: jumlah notifikasi segera diperbarui setelah read-all;
  mark-read gagal tetap membuka klaim; histori kosong memiliki pesan eksplisit.
- E2E menggunakan storage dan database di direktori sementara yang sama. Tes keyboard baru
  mencakup client submission, analyst approval, focus trap/Escape/return, serta axe pada detail
  dan dialog. Ini belum menggantikan audit manual NVDA/VoiceOver.
- Verifikasi lokal terbaru: **29 Vitest tests passed**, TypeScript, ESLint dan production build lulus.
  Workflow menyiapkan `.env` disposable dan menampilkan detail warning.
- Setelah izin publikasi 12 file, commit `a5ec0f51c489ed9d6c05a52729c421cc27b39f48`
  diuji pada run 44481298732: frontend/Docker lulus; SQLite 162 passed, 2 skipped,
  1 failed (fixture email panjang), 844 asersi; warning `file_get_contents` hilang.
  E2E menemukan selector textbox yang seharusnya mencakup datalist/combobox serta kontras
  toast sukses 4,25:1, di bawah 4,5:1. Dua skenario E2E lama lulus.
- Fixture panjang email dan selector browser dikoreksi, serta jalur antrean unassigned
  ditambahkan, dalam commit `151ca213f30a568071e19a2916339ddc89b8742d`; CI berjalan ulang.
- Koreksi warna toast sukses di `App.tsx` dari #008a2e ke #166534 sudah tersedia lokal;
  typecheck, lint, 29 tes, dan build lulus. Unggahan file tambahan ini menunggu izin karena
  berada di luar 12 file yang disetujui.
- Run 44481972881 pada commit `151ca213f30a568071e19a2916339ddc89b8742d`:
  SQLite **164 passed, 2 skipped, 847 asersi**; MySQL **165 passed, 1 skipped,
  862 asersi**. Skip khusus database, Pint lulus, warning `file_get_contents` hilang.
  `TEST-02` selesai; progress menjadi **60/64**, empat tiket parsial.

### Bukti historis (1 November 2026)

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

1. Menuntaskan TEST-04 dengan seluruh tes browser lulus, termasuk koreksi kontras toast. TEST-02 selesai pada SQLite/MySQL dan warning `file_get_contents` sudah hilang. Koreksi `App.tsx` tersedia lokal tetapi belum diunggah, menunggu izin publikasi file tambahan.
2. Manual screen-reader audit NVDA/VoiceOver dan penerimaan desain bisnis.
3. SMTP eksternal, kebijakan retensi/durasi, data provider/polis nyata, serta pencatatan pembayaran operasional perlu konfigurasi pengelola. Fitur tersedia tetapi default email/retention nonaktif.
4. Benchmark dan penilaian query pada volume data produksi. Uji contention InnoDB dasar dan ketersediaan indeks sudah lulus, tetapi tidak membuktikan kapasitas produksi.
5. Cutover data operasional: import dan restore telah diuji memakai fixture sintetis. Rekonsiliasi jumlah record dan file dari backup data nyata tetap perlu dilakukan pada maintenance window sebelum migrasi deployment aktif.

Jangan menandai seluruh Definition of Done sumber sebagai selesai sebelum pemeriksaan manual, kelengkapan matriks pengujian, dan kesiapan operasional di atas dilaksanakan. Bukti CI harus merujuk commit yang diuji; revisi baru tidak mewarisi hasil hijau commit lama. Tidak ada migrasi atau pemulihan yang dijalankan pada database deployment aktif.
