> **Status: HISTORICAL, arsip sejak 2026-11-27.** Berkas ini adalah catatan bukti bertanggal untuk
> [`../../IMPROVEMENT.md`](../../IMPROVEMENT.md) (backlog 64 tiket yang ditutup 26 November 2026).
> Angka tes di sini berlaku untuk revisi kode yang dicatat pada masing-masing bagian, bukan untuk
> HEAD saat ini. Tracker aktif untuk audit fungsional adalah
> [`../HEALTHGUARD_FUNCTIONALITY_AUDIT.md`](../HEALTHGUARD_FUNCTIONALITY_AUDIT.md).
> Tautan relatif di bawah mengarah ke folder `docs/`, bukan folder `docs/archive/`.

---

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

## Bukti lokal dan CI

### Perubahan kriteria QA — 22 November 2026

**Hasil akhir: 64/64 tiket selesai berdasarkan kriteria QA otomatis yang direvisi.**

- Suite lengkap: **9 Playwright tests passed, 8,6 menit, exit 0**, Chrome dengan SQLite/storage
  disposable. Meliputi matriks klaim, keyboard, profil/admin, loading/error/retry/empty,
  pencabutan sesi nyata, semantik ID/EN, upload recovery dan draf/locale.
- Tinjauan screenshot menemukan ringkasan validasi menggabungkan label dengan pesan error
  lama dan teks bantuan. `ClaimForm.tsx` kini memakai aria-label atau span label saja.
  Regresi memeriksa teks ringkasan persis dalam ID/EN, termasuk validasi berulang.
- Setelah perbaikan tersebut: **2 tes QA terarah lulus, 1,9 menit, exit 0**; typecheck,
  lint, **33 Vitest tests** dan build produksi lulus lagi. Backend dan keamanan cookie
  tidak berubah sejak hasil 167 passed/2 skipped/859 asersi, Pint dan 5 tes cookie di bawah.
- Revisi kode akhir saat verifikasi: `5bfffbdb40125f8370f8c6c488f59f62f4812e54`.
  Suite lengkap dimulai sebelum perbaikan ringkasan; tes terarah dan cek frontend menguji
  perbaikan akhir. Perubahan berikutnya hanya dokumentasi.
- Bukti lokal: `Health_Guard-frontend/playwright-report/index.html`,
  `test-results/.last-run.json`, dan `test-results-final/.last-run.json` (keduanya passed).
  Screenshot profil 390 px dan form error EN 360 px juga ditinjau agen.
  Output verifikasi terarah ditambahkan ke gitignore dan dikeluarkan dari indeks Git
  setelah sempat ditangkap proses auto-sync; semuanya memakai fixture sintetis disposable.
- TEST-05, UX-10 dan BL-12 ditutup dengan cakupan dalam TEST-COVERAGE.md, tanpa klaim
  audit suara screen-reader, native picker atau actual browser zoom.

Pengguna meminta agen menjalankan QA tanpa pengujian manual. Kriteria TEST-05, UX-10 dan
BL-12 direvisi menjadi backend/component/browser QA, otomasi keyboard, pemeriksaan layout,
axe dan asersi semantik aksesibilitas. Tabel cakupan tersedia di TEST-COVERAGE.md.
Persyaratan manual pada catatan historis di bawah tidak lagi menjadi gate penyelesaian.
Ini bukan pernyataan bahwa pengumuman NVDA/VoiceOver, native picker atau zoom browser 200%
sudah diuji. Pemeriksaan otomatis tidak membuktikan kepatuhan aksesibilitas menyeluruh.

Run browser sebelumnya dihentikan setelah interupsi; empat skenario awal lulus, sedangkan
upload-recovery gagal setelah reload dengan request pemulihan sesi terputus dalam trace.
Hasil run terputus tidak digunakan untuk penutupan tiket. Suite baru berisi sembilan tes,
termasuk `qa-states.spec.ts`, dijalankan ulang pada SQLite/storage disposable baru.

### Verifikasi lanjutan — 22 November 2026

- Meninjau README, ADR, implementasi portal, kriteria tiga tiket tersisa, dan peta tes.
  Semua tiket implementasi sebelumnya tetap selesai; TEST-05, UX-10 dan BL-12 tetap
  parsial sampai observasi manual tersedia.
- Tombol pagination kini memiliki nama aksesibel Halaman sebelumnya/Halaman berikutnya
  atau Previous page/Next page. Tes daftar klaim menggunakan nama tersebut; tes browser
  admin memeriksa label dalam kedua bahasa dan tombol sebelumnya yang nonaktif di halaman awal.
- Checklist QA dilengkapi langkah keadaan kosong, loading lambat, offline/error/retry,
  pencegahan aksi ganda, upload terputus, dan sesi kedaluwarsa.
- Backend SQLite: **167 passed, 2 skipped, 859 asersi**; Pint lulus, exit 0.
- Frontend: **33 Vitest tests**, **5 cookie-security tests**, production build,
  typecheck dan lint lulus. Typecheck/lint dijalankan kembali setelah perubahan kode/tes.
- Revisi kode frontend setelah perbaikan: `97b662bd0a3116f3e2e51b40df1041b9c1a70623`.
  Proses auto-sync Git yang sudah aktif membuat commit selama sesi; agen tidak menjalankan
  commit/push. Perubahan sesudah revisi ini hanya dokumentasi.
- Tidak tersedia tool kendali desktop interaktif; NVDA tidak ditemukan di lokasi standar.
  QA manual, native picker, zoom browser 200%, dan audit screen reader belum dilaksanakan.
  MySQL/Compose dan CI remote tidak diperiksa ulang; database deployment tidak diubah.

### Lanjutan penutupan P1/P3 — 21 November 2026

- Pengguna menyatakan belum bisa melakukan audit manual. Sesi agen tidak menyediakan alat
  kendali desktop interaktif; NVDA tidak ditemukan pada lokasi instalasi standar. Hasil
  pengujian manual dan screen-reader tidak tersedia, sehingga TEST-05, UX-10 dan BL-12 tetap
  parsial. Progress summary kini menyebut kriteria tersisa secara eksplisit per fase.
- Ditambah `profile-admin.spec.ts`: persistensi telepon/DOB/BPJS/alamat setelah reload,
  axe dan overflow pada profil/draf/notifikasi/panduan mobile; pembuatan provider admin,
  persistensi setelah reload, navigasi berlabel berbeda dan axe pada 390/768/1440 px serta ID/EN.
- Eksekusi awal: skenario profil lulus; skenario admin menemukan pelanggaran axe
  `landmark-unique` karena kedua pager memakai label Pagination. Kedua pager admin kini
  berlabel Halaman pengguna/User pages dan Halaman permintaan penghapusan/Deletion request pages.
- Typecheck, lint, 30 Vitest tests dan build produksi lulus setelah perbaikan. Suite lengkap
  tujuh tes browser sedang diverifikasi. Bukti ini tidak menggantikan QA manual, native picker,
  zoom browser 200%, ataupun pembacaan langsung dengan NVDA/VoiceOver.

### Pembaruan 21 November 2026

- Runtime lokal kini tersedia: Node 22.22.0, PHP 8.3.30 dengan pdo_sqlite/pdo_mysql,
  serta Google Chrome 157.0.8103.79 pada Windows. Catatan 20 November tentang PHP yang tidak
  tersedia bersifat historis.
- Backend SQLite: `php vendor/bin/phpunit --display-warnings` dengan APP_ENV=testing,
  DB_CONNECTION=sqlite, DB_DATABASE=:memory:, DB_URL kosong dan cache/session array lulus:
  **164 passed, 2 skipped, 847 asersi**. `php vendor/bin/pint --test` lulus.
  Tidak ada pengujian MySQL/Compose atau perubahan database deployment pada sesi ini.
- Empat tes browser sebelumnya **lulus lokal** dengan database/storage disposable:
  matriks registrasi/otorisasi/keputusan, alur keyboard client/analis, Needs Info/resubmit,
  serta aksesibilitas/draf/locale. TEST-04 kini memiliki bukti eksekusi lokal yang sebelumnya
  belum dicatat; status CI remote terbaru tidak diperiksa ulang.
- Perbaikan UX-10/BL-12: perpindahan langkah formulir memfokuskan judul langkah berbahasa
  Indonesia/English; Tab berikutnya menuju input pertama. Tes komponen memeriksa maju/mundur,
  fokus input dan aria-current; tes browser keyboard juga memeriksa fokus pada langkah layanan.
- Typecheck, lint, **30 Vitest tests**, **5 cookie-security tests**, dan build produksi lulus.
- Ditambah `upload-recovery.spec.ts`: tiga PDF dipilih, satu dihapus; unggahan kedua diputus
  sebelum mencapai server. Tes memeriksa dialog navigasi, retry per berkas pada claim ID yang
  sama, satu pembuatan klaim, dan tidak ada duplikasi dokumen/histori setelah reload.
  Percobaan pertama membuktikan retry/dokumen berhasil tetapi selector histori tes memakai
  nama event mentah `document_uploaded`, sedangkan UI merender `document uploaded`.
  Selector dikoreksi; **seluruh 5 tes lulus (3,3 menit, exit 0)** pada revisi kode
  `3e85bab617625fc1cd521e71e604f87764e4f39b`, melalui
  `$env:PLAYWRIGHT_CHANNEL='chrome'; npm.cmd run test:e2e`.
  Laporan lokal: `Health_Guard-frontend/playwright-report/index.html` (artifact diabaikan Git).
  Pada penutupan sesi tersebut perubahan lanjutan hanya dokumentasi; lanjutan P1/P3 di atas
  menambah perubahan admin dan pengujian pada revisi berikutnya.
- TEST-05, UX-10 dan BL-12 tetap parsial: QA manual lengkap, native file picker, zoom visual
  dan audit NVDA/VoiceOver belum dijalankan. Checklist eksekusi tersedia di docs/QA.md.

### Pembaruan 20 November 2026

- PR #1 sudah di-merge pada 19 November; perubahan berikutnya tersedia di
  [draft PR #2](https://github.com/TMRakaP26/Health-Guard-Claim-Asurance/pull/2).
  Branch diselaraskan dengan main `7fa51b57815b37226a0537603eb48a2db8683498`, yang sudah
  berisi pembaruan dokumentasi dan warna toast. Agen tidak melakukan merge ke main.
- Timeout matriks browser ditelusuri dari trace ke selector status. Selector combobox dan
  penantian panel keputusan diperbaiki; batas waktu aksi memperjelas kegagalan berikutnya.
  Run 44690871329 membuktikan tiga skenario browser lulus, termasuk seluruh matriks klaim.
- Tes keyboard menemukan landmark pagination duplikat dan fokus tidak kembali setelah Escape.
  Pagination percakapan/histori kini berlabel berbeda. Dialog yang belum terbuka tetap tersembunyi;
  lifecycle dialog menyimpan dan mengembalikan fokus ke pemicunya.
- Reproduksi layout di Edge lokal: viewport 360/390 px sebelumnya menghasilkan dokumen selebar
  750 px. Setelah koreksi minimum grid dan pembungkusan teks, dokumen sesuai 360/390/768/1440 px.
  Tes browser kini memeriksa overflow dan pratinjau dokumen, selain alur client/analis.
  File chooser dibuka dengan keyboard; byte fixture dimasukkan melalui API Playwright sebagai
  pengganti interaksi dialog OS. Ini bukan klaim pengujian manual native file picker.
- Typecheck, lint, 29 Vitest tests dan production build lokal lulus. Commit
  `d7824e3048f81df6cb0162f16d8f0533f0a0575b` sedang diverifikasi pada run 44691545596.
- Docker Linux engine lokal tetap tidak merespons; PHP/Composer lokal tidak tersedia.
  QA manual lengkap dan audit NVDA/VoiceOver belum dilakukan.

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
  resubmission/partial approval/notification/ownership. [Peta cakupan](../TEST-COVERAGE.md)
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

## Batas verifikasi operasional

1. Pengujian manual dan audit suara NVDA/VoiceOver tidak dijalankan; pengguna menggantinya
   dengan QA otomatis pada 22 November. Hasil terkini dicatat di atas.
2. Penerimaan desain bisnis dan pengalaman teknologi bantu di dunia nyata tidak disimpulkan
   dari hasil otomasi.
3. SMTP eksternal, kebijakan retensi/durasi, data provider/polis nyata, serta pencatatan pembayaran operasional perlu konfigurasi pengelola. Fitur tersedia tetapi default email/retention nonaktif.
4. Benchmark dan penilaian query pada volume data produksi. Uji contention InnoDB dasar dan ketersediaan indeks sudah lulus, tetapi tidak membuktikan kapasitas produksi.
5. Cutover data operasional: import dan restore telah diuji memakai fixture sintetis. Rekonsiliasi jumlah record dan file dari backup data nyata tetap perlu dilakukan pada maintenance window sebelum migrasi deployment aktif.

Penyelesaian backlog mengikuti kriteria QA otomatis yang direvisi pengguna; kesiapan deployment
tetap memerlukan konfigurasi dan verifikasi operasional di atas. Bukti CI harus merujuk commit
yang diuji; revisi baru tidak mewarisi hasil hijau commit lama. Tidak ada migrasi atau pemulihan
yang dijalankan pada database deployment aktif.
