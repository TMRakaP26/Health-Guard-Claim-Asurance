# HealthGuard di Docker Desktop

Gunakan Docker Desktop dengan Linux containers. Jalankan perintah dari folder `C:\RAKA\Healtguard`:

```powershell
docker compose up -d --build --wait
```

Buka **http://localhost:8080**. Stack `healthguard` juga muncul di tab Containers Docker Desktop.

Frontend React dibangun dengan Node 22 lalu dilayani Nginx. Backend menggunakan PHP 8.4/Apache dan Laravel. Nginx meneruskan `/api/` dan `/storage/` ke backend sehingga frontend dan API memakai origin yang sama. Laravel menjalankan migrasi otomatis saat backend dimulai. Queue menggunakan `sync`, sesuai fitur saat ini yang tidak membutuhkan worker terpisah.

## Database dan akun

Database SQLite, kunci aplikasi, dan file unggahan disimpan di named volumes `healthguard_database` dan `healthguard_storage`. Database container dimulai kosong; database, `.env`, dan unggahan di folder lokal tidak disalin atau diubah. Buat akun melalui **Create Account**.

Opsional, pada database baru yang belum memiliki akun demo, jalankan seeder sekali:

```powershell
docker compose exec backend php artisan db:seed --force
```

Seeder bawaan menyediakan `analyst@healthguard.com` dan `client@healthguard.com`, keduanya dengan password `password`. Seeder tidak idempotent; jangan dijalankan berulang pada data yang sama.

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

Pemeriksaan mencakup routing SPA, registrasi, login, otorisasi token, klaim, unggah/unduh dokumen, akses storage, notifikasi, dan logout. Akun, klaim, serta unggahan sementara dibersihkan setelah pemeriksaan.

Jika Docker tidak dapat tersambung, buka Docker Desktop dan tunggu Linux engine siap. Jika build pertama gagal mengunduh image/dependensi, periksa koneksi internet Docker Desktop lalu ulangi perintah build.

Startup memakai healthcheck sebelum menjalankan frontend, mengikuti [panduan Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/).
