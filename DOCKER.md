# HealthGuard di Docker Desktop

Gunakan Docker Desktop dengan Linux containers. Jalankan perintah dari folder `C:\RAKA\Healtguard`:

```powershell
docker compose up -d --build --wait
```

Buka **http://localhost:8080**. Stack `healthguard` juga muncul di tab Containers Docker Desktop.

Frontend React dibangun dengan Node 22 lalu dilayani Nginx. Backend menggunakan PHP 8.4/Apache dan Laravel. Nginx meneruskan `/api/` dan `/storage/` ke backend; `/storage/documents/` diblokir dengan 404. Dokumen klaim hanya dilayani melalui API terautentikasi. Foto profil tetap publik. Laravel menjalankan migrasi skema otomatis saat backend dimulai. Queue menggunakan `sync`.

## Database dan akun

Database SQLite, kunci aplikasi, dan file unggahan disimpan di named volumes `healthguard_database` dan `healthguard_storage`. Database container dimulai kosong; database, `.env`, dan unggahan di folder lokal tidak disalin atau diubah. Buat akun melalui **Create Account**.

Untuk akun analis non-demo, gunakan `docker compose exec backend php artisan healthguard:create-analyst`. Password diminta secara tersembunyi, bukan melalui argumen shell.

Opsional, hanya untuk demo lokal pada database baru yang belum memiliki akun demo, jalankan seeder sekali:

```powershell
docker compose exec backend php artisan db:seed --force
```

Seeder bawaan menyediakan `analyst@healthguard.com` dan `client@healthguard.com`, keduanya dengan password `password`. Seeder tidak idempotent; jangan dijalankan berulang pada data yang sama.

## Upgrade keamanan P0

Database tetap SQLite pada tahap ini. Backup volume database dan storage sebelum upgrade. Jangan menjalankan seeder demo pada produksi. `APP_DEBUG` pada Compose harus tetap `false`.

Untuk instalasi lama, hentikan akses frontend selama memindahkan dokumen:

```powershell
docker compose stop frontend
docker compose up -d --build --wait backend
docker compose exec -T backend php artisan healthguard:privatize-documents
# Lanjutkan hanya setelah command di atas keluar dengan kode 0.
docker compose up -d --build --wait frontend
```

Command menyalin file dari `storage/app/public/documents` ke `storage/app/private/documents`, membandingkan SHA-256, lalu menghapus salinan publik hanya jika cocok. Path relatif pada tabel tetap sama; tidak ada perubahan skema. Aman dijalankan ulang. File hilang, path tak terduga, atau konflik isi menghasilkan exit code 1; pertahankan maintenance sampai diselesaikan. Command tidak memindahkan file lain atau foto profil. Periksa juga backup publik/orphan file sebelum membuka traffic.

Untuk mode lokal `php artisan serve`, hentikan server dahulu, jalankan `php artisan healthguard:privatize-documents`, lalu mulai kembali. PHP development server dapat menyajikan file lama langsung jika file belum dipindahkan; aturan Apache/Nginx tidak berlaku pada server tersebut.

Token secara default berlaku 480 menit. Override `SANCTUM_TOKEN_EXPIRATION` melalui environment backend bila diperlukan dan rebuild cache konfigurasi. Login gagal berulang menghasilkan 429; ubah password akan mengakhiri semua sesi. Kontrak akses ada di [README](README.md#keamanan-p0).

## Operasional

```powershell
# Status dan log
docker compose ps
docker compose logs --tail=100 backend frontend

# Terapkan perubahan kode
docker compose up -d --build --wait

# Hentikan container, pertahankan data
docker compose down

# Jalankan lagi
docker compose up -d --wait
```

Jangan tambahkan `--volumes`/`-v` pada `down` jika ingin mempertahankan data. Kode dibundel ke image, jadi perubahan kode membutuhkan rebuild. Dependensi di host (`vendor`, `node_modules`) tidak diperlukan untuk build Docker.

Untuk mengganti port di PowerShell:

```powershell
$env:HEALTHGUARD_PORT = '8081'
docker compose up -d --wait
```

Akses kemudian melalui http://localhost:8081. Port hanya diikat ke loopback komputer lokal.

## Verifikasi integrasi

Setelah container sehat, jalankan smoke test melalui Nginx:

```powershell
docker compose cp ./docker/smoke.php backend:/tmp/healthguard-smoke.php
docker compose exec -T backend php /tmp/healthguard-smoke.php
```

Pemeriksaan mencakup routing SPA, registrasi, login, otorisasi token, klaim, unggah/unduh dokumen, penolakan URL dokumen publik, penolakan queue analis bagi client, penghapusan demo-users, notifikasi, dan logout. Akun, klaim, serta unggahan sementara dibersihkan setelah pemeriksaan.

Jika Docker tidak dapat tersambung, buka Docker Desktop dan tunggu Linux engine siap. Jika build pertama gagal mengunduh image/dependensi, periksa koneksi internet Docker Desktop lalu ulangi perintah build.

Startup memakai healthcheck sebelum menjalankan frontend, mengikuti [panduan Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/).
