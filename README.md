# HealthGuard

Aplikasi pengajuan dan peninjauan klaim kesehatan: React + TypeScript, Laravel API, Sanctum, dan MySQL 8.4. Nginx menyajikan frontend dan meneruskan API ke backend; database tidak membuka port host.

## Menjalankan

Ikuti [DOCKER.md](DOCKER.md). Salin `.env.example` ke `.env` di root, ubah password database, lalu `docker compose up -d --build --wait`. Buat administrator melalui:

```sh
docker compose exec backend php artisan healthguard:create-admin admin@example.test --name="Administrator"
```

Password diminta secara tersembunyi. Pendaftaran publik selalu membuat **client**. Administrator mengundang analis melalui halaman Administrasi. Tidak ada akun demo otomatis atau endpoint daftar akun publik.

## Kemampuan

- Klien: profil nyata termasuk DOB/BPJS/foto, formulir empat tahap, draf server, pengajuan ulang, unggahan privat dengan retry/cancel, percakapan dan permintaan dokumen.
- Analis: antrean, assignment atomik, keputusan hanya untuk klaim yang ditugaskan kepadanya, histori lengkap, filter/pagination/statistik dan ekspor seluruh hasil filter.
- Administrator: undangan analis, aktif/nonaktif pengguna, beban kerja/SLA, katalog provider/kategori/diagnosis/aturan pertanggungan, catatan pembayaran dan tinjauan penghapusan.
- Akun: reset password, email verification, logout semua perangkat, 2FA TOTP dan recovery code sekali pakai untuk staf.
- UI Indonesia/English, angka IDR, tanggal WIB, dialog keyboard, notifikasi polling. SSE dan email dapat diaktifkan terpisah.

Lima status klaim tetap `Pending`, `Approved`, `Rejected`, `Needs Info`, `Partially Approved`. Status pembayaran `paid → settled` terpisah; pencatatan ini **tidak melakukan transfer bank**. Provider/kategori dapat dikonfigurasi, sedangkan keputusan polis tetap ditinjau analis berdasarkan aturan yang dimasukkan pengelola.

Pengajuan ulang mempertahankan assignment dan catatan; nilai lama disimpan di histori. Klaim yang sudah memiliki pembayaran tidak dapat diubah lagi. Histori tidak memiliki API edit/delete; penghapusan hanya melalui retensi yang diotorisasi.

## Pemeriksaan

```sh
cd Health_Guard-backend
composer install
composer test
php vendor/bin/pint --test
cd ../Health_Guard-frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run test:security
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright membuat database SQLite sementara dan fixture khusus `APP_ENV=testing`; tidak memakai database aplikasi. Di Windows dengan Chrome terpasang: `$env:PLAYWRIGHT_CHANNEL='chrome'` sebelum menjalankan E2E. CI juga menjalankan matriks backend SQLite/MySQL, build Docker dan smoke HTTP.

## Dokumentasi

- [Kontrak API](docs/API.md)
- [Keputusan arsitektur](docs/ADR.md)
- [QA dan aksesibilitas](docs/QA.md)
- [Retensi dan privasi operasional](docs/RETENTION.md)
- [Status implementasi dan verifikasi](docs/IMPLEMENTATION.md)
- [Rencana sumber](IMPROVEMENT.md)

Email memerlukan SMTP dan `FEATURE_EMAIL=true`. Retensi nonaktif secara default; tetapkan kebijakan organisasi dan durasi sebelum mengaktifkan penghapusan. Foto profil memakai disk public; dokumen klaim selalu private. Token autentikasi disimpan di browser; quick sign-in hanya menyimpan nama/email/role, tidak password.
