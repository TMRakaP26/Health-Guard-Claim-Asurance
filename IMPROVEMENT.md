# HealthGuard — Implementasi improvement

Sumber rencana: `C:\RAKA\IMPROVEMENT.md`. Cakupan yang dipilih pengguna pada 31 Oktober 2026: implementasi bertahap, dimulai dari keamanan **P0 (SEC-01–SEC-08)**. Dokumen sumber merupakan rencana, bukan bukti bahwa seluruh fiturnya sudah tersedia.

## Perubahan tahap P0

| Tiket | Implementasi | Verifikasi |
|---|---|---|
| SEC-01 | Cookie hanya menyimpan nama/email/role; cookie lama berisi password dibuang; pemilihan akun hanya mengisi email | 5 tes modul cookie; build frontend |
| SEC-02 | Endpoint publik `/api/demo-users` dan method controller dihapus | Tes 404 pada environment production |
| SEC-03 | Registrasi menolak role selain client; command interaktif `healthguard:create-analyst` | Tes penolakan eskalasi role, command, dan seeder demo |
| SEC-04 | ClaimPolicy/DocumentPolicy, middleware analis, keputusan oleh assigned analyst, assignment atomik hanya untuk Pending/unassigned | Matriks akses, kepemilikan, assignment ganda dan status tak valid |
| SEC-05 | Disk privat, download terautentikasi, preview blob, blokir path publik di Nginx/Apache, command migrasi legacy dengan checksum | Tes akses/migrasi dan smoke HTTP melalui Nginx lulus; batas build image frontend dijelaskan di bawah |
| SEC-06 | Rate limit login/register/API, token 480 menit, pencabutan seluruh token ketika password berubah | Tes 429, expiry, revocation, logout, dan password salah |
| SEC-07 | Validasi isi MIME terhadap ekstensi, file kosong ditolak, batas 10 MB/2 MB dipertahankan | Tes file valid, spoofing, ekstensi terlarang, kosong, batas tepat, dan batas+1 byte |
| SEC-08 | README utama/frontend/backend dan panduan Docker diperbarui; seeder tetap manual; APP_DEBUG produksi tetap false | Review konfigurasi dan tes respons production tanpa trace |

## Keputusan akses

- Client hanya membuat klaim dan membaca/mengubah/mengunggah dokumen miliknya.
- Semua analis boleh membaca klaim/dokumen untuk triase; keputusan hanya boleh diberikan oleh analis yang ditugaskan.
- Endpoint queue analis menolak client. Assignment hanya pada klaim `Pending` yang belum ditugaskan; kegagalan menghasilkan 409 dan tidak membuat notifikasi.
- Policy history disiapkan untuk aturan akses yang sama, tetapi API/tabel history belum dibuat pada P0.
- Foto profil tetap publik. Dokumen klaim wajib privat. Endpoint API menolak guest dengan 401, pelanggaran policy dengan 403, dan objek tidak ditemukan dengan 404. Notifikasi milik pengguna lain menghasilkan 404 agar keberadaannya tidak terungkap.
- Password tidak disimpan dalam browser. Token Bearer tetap berada di localStorage sesuai arsitektur saat ini; durasinya dibatasi dan sesi dicabut saat password berubah.
- Status string dan format ID klaim tetap sama. Aturan transisi status, nilai keputusan parsial, dan resubmission merupakan pekerjaan P1.

## Upgrade instalasi yang sudah berisi data

1. Backup database dan storage, lalu hentikan traffic.
2. Terapkan kode backend dan konfigurasi server.
3. Jalankan `php artisan healthguard:privatize-documents` pada lingkungan yang memuat storage sebenarnya. Tidak ada perubahan skema atau edit database manual.
4. Command memverifikasi SHA-256 sebelum menghapus salinan publik. Jika exit code bukan 0, selesaikan kegagalan terlebih dahulu. Periksa pula orphan/backup file pada direktori publik.
5. Buka frontend baru, uji login, preview/download, dan penolakan URL publik. Detail perintah Docker: [DOCKER.md](DOCKER.md#upgrade-keamanan-p0).

Migrasi pada data pengguna belum dijalankan oleh sesi implementasi ini; pengujian migrasi menggunakan disk dan database pengujian terisolasi.

## Verifikasi

- Baseline sebelum perubahan: 13 tes backend lulus; build frontend lulus.
- `npm.cmd run test:security`: 5 tes lulus.
- `npm.cmd run build`: lulus; peringatan ukuran bundle di atas 500 kB masih ada seperti baseline.
- `composer test`: **58 tes lulus, 364 assertions**, menggunakan SQLite memory dan disk pengujian terisolasi.
- Pint `--test`: lulus untuk 16 file PHP yang diubah/ditambahkan. `git diff --check`: lulus.
- `docker compose config --quiet`: lulus setelah memperbaiki salah ketik lokal `uatname` menjadi `name`.
- Build image backend PHP 8.4: lulus. Build image frontend dari Dockerfile belum berhasil karena `npm ci` mengalami `EIDLETIMEOUT` ke `registry.npmjs.org:443`; bukan kegagalan kompilasi aplikasi.
- **Smoke HTTP Docker: 20 pemeriksaan lulus** pada stack terisolasi `healthguard-security-p0`, port 18080. Backend memakai image baru. Frontend memakai runtime Nginx dari image yang sudah tersedia, dengan bundle `dist` hasil build lokal dan konfigurasi Nginx terbaru dipasang read-only melalui override sementara. Ini memverifikasi perilaku runtime, tetapi bukan keberhasilan build ulang image frontend dari nol.
- Smoke test menempatkan salinan file uji legacy pada disk publik dan membuktikan URL-nya menghasilkan 404, sedangkan download terautentikasi berhasil dan download tanpa token ditolak 401. Queue analis menolak client dengan 403; demo-users menghasilkan 404.
- Container, jaringan, dan volume stack uji sudah dibersihkan setelah label project diverifikasi. Stack utama `healthguard` pada port 8080 tetap berjalan dan belum diredeploy; migrasi dokumen pada data utamanya belum dijalankan.
- QA browser/interaksi visual belum dilakukan. Preview/download telah dibangun dan endpoint-nya diuji, tetapi rendering browser masih perlu diperiksa saat deployment.
- Lint/typecheck/frontend E2E lengkap belum tersedia; termasuk tahap P1/P2 dan tidak diklaim selesai.

## Tahap berikutnya

1. P1 database: MySQL 8.4, volume app key terpisah, prosedur pemindahan data dan backup.
2. P1 history: audit event transaksional, API history, backfill, timeline client/analis.
3. P1 pengujian dan UX: tooling frontend/E2E, detail dengan direct URL, pagination/filter, Needs Info, profil dan validasi keputusan.
4. P2 maintainability/operasi: Form Requests, resources/services, CI, observability, dan dokumentasi API lengkap.

Tahap P1–P3 belum diimplementasikan. Implementasi P0 dan verifikasi otomatis di atas tersedia untuk review; sebelum deployment, ulangi build image frontend ketika registry dapat diakses, jalankan migrasi dokumen lama, dan lakukan QA browser. Perubahan juga menghapus pencetakan objek error Axios yang dapat memuat token dari console frontend.
