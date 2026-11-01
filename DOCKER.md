# Docker, migrasi, backup dan pemulihan

## Instalasi baru

1. Salin root `.env.example` ke `.env`. Untuk produksi, set `APP_ENV=production`, `PUBLIC_URL=https://nama-host`, password DB/root unik dan kuat (minimal 16 karakter untuk DB).
2. `docker compose up -d --build --wait`.
3. Buat admin: `docker compose exec backend php artisan healthguard:create-admin admin@example.test --name="Administrator"`.
4. Buka localhost:8080. Port hanya bind loopback; gunakan reverse proxy TLS untuk akses publik.

Volume: `dbdata` (MySQL), `appdata` (APP_KEY), `storage` (dokumen/foto). APP_KEY dibuat sekali dan dipertahankan saat restart. APP_KEY eksplisit yang berbeda dengan key tersimpan menyebabkan startup ditolak. Jangan membuat key baru saat memulihkan database dengan data 2FA terenkripsi.

Backend memasang pdo_mysql dan pdo_sqlite (untuk import/test), tetapi Compose memakai MySQL 8.4. DB healthcheck menjalankan SELECT 1 dengan akun aplikasi; backend `/health/ready` memeriksa koneksi database. `/up` adalah liveness dan frontend `/healthz` hanya liveness Nginx.

## Upgrade dari SQLite lama

Jangan jalankan `down -v` atau menghapus volume `healthguard_database`. Siapkan maintenance window dan verifikasi backup terlebih dahulu.

1. Hentikan penulisan melalui deployment lama (`php artisan down`). Ambil snapshot SQLite yang konsisten setelah koneksi penulis berhenti; jangan hanya menyalin database ketika WAL masih aktif. Gunakan SQLite backup API atau salin database bersama WAL/SHM dalam keadaan berhenti.
2. Simpan key lama dari volume database, seluruh storage, dan salinan DB di lokasi backup berakses terbatas. Catat checksum dan jumlah record.
3. Mulai stack **terpisah**, misalnya `docker compose -p healthguard-migration --env-file .env.migration up -d --build --wait`, dengan port berbeda. Isi APP_KEY menggunakan key lama; jangan menaruh key di command line/log.
4. Salin backup DB ke backend baru:
   `docker compose -p healthguard-migration cp backups/legacy.sqlite backend:/tmp/legacy.sqlite`.
5. Jalankan `docker compose -p healthguard-migration exec backend php artisan healthguard:import-sqlite /tmp/legacy.sqlite`.
   Import menolak tujuan yang sudah berisi record, mempertahankan ID/hash password/relasi dan memakai transaksi. Sumber dibuka query-only. API token, reset token, cache, dan sesi tidak dipindahkan: pengguna harus login kembali. Backfill mencatat snapshot historis tanpa mengarang keputusan yang tidak tersedia.
6. Pulihkan storage lama ke volume storage baru; jalankan `php artisan healthguard:privatize-documents` di backend baru. Command memeriksa checksum dan memindahkan dokumen dari public ke private secara idempoten.
7. Bandingkan jumlah users/claims/documents, ID klaim dan FK. Login klien/analis, download dokumen, cek histori, buat klaim baru. Jalankan smoke.
8. Alihkan reverse proxy setelah verifikasi. Pertahankan backup/deployment lama dalam keadaan tidak menerima penulisan selama periode rollback.

Rollback sebelum cutover: hentikan stack baru dan arahkan traffic ke deployment lama. Setelah data baru ditulis, jangan sekadar mengalihkan ke SQLite lama: rekonsiliasi perubahan dan lakukan pemulihan sesuai insiden.

## Backup dan restore (PowerShell)

```powershell
./docker/backup.ps1 -Project healthguard
./docker/restore.ps1 -Project healthguard-restore -BackupDirectory backups/20261101-120000 -ConfirmRestore
```

Backup sementara mengaktifkan maintenance, menjalankan mysqldump, mengarsipkan storage/app dan key, lalu membuat checksum. SQL tidak dialirkan melalui encoding PowerShell. Restore menolak nama project produksi default, memerlukan konfirmasi eksplisit, dan ditujukan ke stack disposable yang telah dijalankan dengan konfigurasi/key kompatibel. Kegagalan restore membiarkan maintenance aktif untuk investigasi.

Gunakan backup set lengkap dari deployment yang sama. Jangan restore ke storage yang sudah berisi file lain: gunakan volume kosong untuk menghindari berkas sisa. SQL dump dapat mengganti tabel; hanya gunakan project tujuan yang benar. APP_KEY dalam env tujuan harus kosong atau sama dengan key backup sebelum restart. Setelah restore, jalankan smoke dan bandingkan jumlah record, hash dokumen, serta login 2FA. Backup mengandung data privat dan key: enkripsi salinan offsite, batasi akses, serta tetapkan rotasi harian dan uji restore berkala menurut kebutuhan organisasi. Script belum menggantikan layanan backup terkelola.

## Smoke dan pengujian terisolasi

```sh
docker compose -p healthguard-check cp docker/smoke.php backend:/tmp/healthguard-smoke.php
docker compose -p healthguard-check exec -T backend php /tmp/healthguard-smoke.php
```

Smoke mengharuskan MySQL, memakai HTTP melalui Nginx, memeriksa histori, menolak public URL dokumen, lalu membersihkan hanya data yang dibuatnya. Jalankan pada stack terisolasi dengan port/env berbeda sebelum upgrade deployment aktif.

## Produksi

- TLS di reverse proxy; set PUBLIC_URL sama dengan origin browser agar link verifikasi bertanda tangan benar.
- Set TRUSTED_PROXIES hanya IP/CIDR proxy tepercaya dan TRUSTED_HOSTS daftar hostname dipisah koma. Jangan mempercayai semua sumber.
- APP_DEBUG=false; Compose menolak password DB contoh pada APP_ENV=production.
- Batasi akses backup, Docker daemon, key, dan storage. MySQL tidak dipublish ke host.
- Log API terstruktur memuat request ID, metode, template route, status, durasi; tidak mencatat body/token. Log container dirotasi 10 MB × 3. Hubungkan stderr ke observabilitas organisasi; jangan menyalakan debug request/SQL pada data medis.
- Apache master memerlukan root untuk port/permission; worker berjalan sebagai www-data. Volume aplikasi tertentu harus writable. Deployment ini belum memakai filesystem read-only menyeluruh.
- Jalankan purge dengan scheduler organisasi hanya setelah kebijakan retensi disetujui; default tidak menjadwalkan penghapusan.
- FEATURE_EMAIL + SMTP diperlukan untuk reset/verifikasi email. MAIL_MAILER=array untuk pengembangan tidak mengirim email nyata. Profile mail-dev menyediakan Mailpit lokal port8025; atur MAIL_MAILER=smtp, MAIL_HOST=mailpit, MAIL_PORT=1025, FEATURE_EMAIL=true.
- FEATURE_REALTIME=false mempertahankan polling30detik. SSE opsional memakai autentikasi bearer di header dan koneksi berdurasi pendek. Kapasitas worker harus ditinjau sebelum mengaktifkannya untuk banyak pengguna.
