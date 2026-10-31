# HealthGuard API

## Perubahan keamanan P0

Registrasi hanya membuat client. Analis dibuat melalui `php artisan healthguard:create-analyst`; hanya analis yang ditugaskan boleh memutuskan klaim. Analis tetap dapat membaca semua klaim/dokumen untuk proses triase. Client hanya dapat mengakses miliknya.

Login dibatasi 5 request/menit per email+IP dan 20/menit per IP, registrasi 5/menit per IP, API terautentikasi 120/menit per pengguna. Token kedaluwarsa setelah 480 menit (`SANCTUM_TOKEN_EXPIRATION`). Password baru mencabut semua token; logout hanya mencabut token aktif.

Dokumen klaim privat, file harus tidak kosong dan MIME sesuai ekstensi. Maksimum dokumen 10 MB dan foto 2 MB. Foto profil tetap publik. Instalasi lama harus menjalankan `php artisan healthguard:privatize-documents` sebelum membuka traffic; panduan upgrade dan kegagalan migrasi ada di [DOCKER.md](../DOCKER.md#upgrade-keamanan-p0).

Jalankan `composer test` untuk tes regresi dan keamanan. Seeder demo tidak berjalan otomatis dan hanya untuk penggunaan lokal. Gunakan `APP_DEBUG=false` untuk produksi. Detail cakupan tahap ini ada di [IMPROVEMENT.md](../IMPROVEMENT.md).

## Tujuan Pembuatan Project

**HealthGuard API** adalah sistem backend untuk manajemen klaim asuransi kesehatan (BPJS). Project ini dibangun untuk memudahkan proses pengajuan, review, dan pengelolaan klaim asuransi kesehatan antara **klien** (peserta asuransi) dan **analis** (petugas verifikator). Sistem ini memungkinkan:

- Klien untuk mengajukan klaim asuransi kesehatan secara digital
- Analis untuk me-review, menyetujui, menolak, atau meminta informasi tambahan atas klaim yang diajukan
- Notifikasi tersimpan di database; frontend melakukan polling setiap 30 detik
- Manajemen dokumen pendukung klaim secara terpusat

---

## Tech Stack & Tools

### Backend

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **PHP** | ^8.3 | Bahasa pemrograman utama yang digunakan untuk membangun backend |
| **Laravel Framework** | ^13.8 | Framework PHP yang menyediakan arsitektur MVC, routing, ORM, middleware, dan berbagai fitur pengembangan web modern |
| **Laravel Sanctum** | ^4.3 | Paket autentikasi API berbasis token (Bearer Token) yang ringan dan aman untuk SPA & mobile app |
| **Laravel Tinker** | ^3.0 | REPL (Read-Eval-Print Loop) untuk berinteraksi dengan aplikasi Laravel melalui command line, berguna untuk debugging dan testing |
| **SQLite** | - | Database utama yang digunakan untuk menyimpan seluruh data aplikasi (users, claims, documents, notifications) |

### Frontend / Asset Building

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Vite** | ^8.0 | Build tool modern untuk bundling dan optimize asset frontend (JS, CSS) dengan kecepatan tinggi menggunakan ES Modules |
| **Tailwind CSS** | ^4.0 | Framework CSS utility-first untuk membangun UI secara cepat dan responsif tanpa menulis CSS konvensional |
| **Laravel Vite Plugin** | ^3.1 | Plugin resmi Laravel untuk mengintegrasikan Vite dengan Laravel, mendukung Hot Module Replacement (HMR) saat development |
| **Concurrently** | ^9.0 | Tool untuk menjalankan beberapa command secara paralel (server, queue, logs, Vite) dalam satu terminal |

### Development Tools

| Tool | Fungsi |
|------|--------|
| **Composer** | Package manager untuk PHP, mengelola dependency backend (Laravel, Sanctum, dll) |
| **NPM** | Package manager untuk JavaScript, mengelola dependency frontend (Vite, Tailwind, dll) |
| **FakerPHP** | ^1.23 - Library untuk generate data palsu (dummy) digunakan dalam testing dan seeder |
| **PHPUnit** | ^12.5 - Framework testing untuk menulis dan menjalankan unit test serta feature test |
| **Laravel Pint** | ^1.27 - Code formatter otomatis yang mengikuti standar PSR-12 untuk menjaga konsistensi style kode |
| **Laravel Pail** | ^1.2.5 - Tool untuk menampilkan log aplikasi secara real-time di terminal saat development |
| **Mockery** | ^1.6 - Library mocking untuk PHP, digunakan dalam testing untuk membuat objek tiruan |
| **Qoder IDE** | IDE berbasis AI yang digunakan untuk membantu pengembangan, debugging, dan percepatan penulisan kode |

---

## Instalasi & Setup

### Prasyarat
- PHP >= 8.3
- Composer
- Node.js & NPM

### Langkah Instalasi

```bash
# 1. Clone repository
git clone <repository-url>
cd healthguard-api

# 2. Install dependency PHP
composer install

# 3. Install dependency JavaScript
npm install

# 4. Copy file environment
copy .env.example .env

# 5. Generate application key
php artisan key:generate

# 6. Jalankan migrasi database
php artisan migrate

# 7. Jalankan development server
composer run dev
```

Atau gunakan perintah setup otomatis:
```bash
composer run setup
```

---

## Arsitektur & Struktur Project

```
healthguard-api/
├── app/
│   ├── Http/
│   │   ├── Controllers/       # Logic handling request & response
│   │   │   ├── AuthController.php
│   │   │   ├── ClaimController.php
│   │   │   ├── DocumentController.php
│   │   │   └── NotificationController.php
│   │   └── Middleware/
│   │       └── RoleMiddleware.php  # Middleware untuk validasi role (client/analyst)
│   ├── Models/                # Eloquent ORM models
│   │   ├── User.php
│   │   ├── Claim.php
│   │   ├── Document.php
│   │   └── Notification.php
│   └── Providers/
└── database/
    └── migrations/            # Schema definisi database
```

### Role Pengguna

| Role | Deskripsi |
|------|-----------|
| **client** | Pengguna yang mengajukan klaim asuransi kesehatan. Hanya bisa melihat dan mengelola klaim miliknya sendiri |
| **analyst** | Petugas verifikator yang me-review klaim, memberikan persetujuan, penolakan, atau meminta informasi tambahan |

---

## Dokumentasi API

Base URL: `/api`

Autentikasi menggunakan **Laravel Sanctum** dengan Bearer Token. Semua endpoint yang dilindungi memerlukan header:
```
Authorization: Bearer <token>
```

---

### 1. Authentication API

#### 1.1 Register
**`POST /api/register`** — Mendaftarkan pengguna baru (client atau analyst).

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| name | string | Ya | Nama lengkap pengguna |
| username | string | Tidak | Username unik |
| email | string (email) | Ya | Alamat email (harus unik) |
| password | string (min 8) | Ya | Password akun |
| role | string (`client`) | Tidak | Default `client`; nilai `analyst` ditolak 422 |
| phone | string | Tidak | Nomor telepon |
| address | string | Tidak | Alamat lengkap |
| date_of_birth | date | Tidak | Tanggal lahir |
| bpjs_number | string | Tidak | Nomor BPJS peserta |

**Cara Kerja:**
1. Validasi data input yang diterima
2. Hash password menggunakan bcrypt
3. Buat record user baru di database
4. Generate Sanctum token untuk autentikasi
5. Return data user beserta token

**Response:** `201 Created`
```json
{
  "user": { "id": 1, "name": "John", "email": "john@example.com", "role": "client" },
  "token": "1|abc123..."
}
```

---

#### 1.2 Login
**`POST /api/login`** — Masuk ke sistem dan mendapatkan token autentikasi.

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| email | string (email) | Ya | Alamat email terdaftar |
| password | string | Ya | Password akun |

**Cara Kerja:**
1. Cari user berdasarkan email
2. Verifikasi password menggunakan `Hash::check()`
3. Jika berhasil, generate Sanctum token baru
4. Return data user dan token

**Response:** `200 OK`
```json
{
  "user": { "id": 1, "name": "John", "email": "john@example.com", "role": "client" },
  "token": "1|abc123..."
}
```

---

#### 1.3 Logout
**`POST /api/logout`** 🔒 — Menghapus token akses yang sedang aktif.

**Cara Kerja:**
1. Ambil token yang sedang digunakan dari request
2. Hapus token tersebut dari database
3. Token tidak bisa digunakan lagi untuk akses API

**Response:** `200 OK`
```json
{ "message": "Logged out successfully" }
```

---

#### 1.4 Get Current User
**`GET /api/user`** 🔒 — Mendapatkan data profil pengguna yang sedang login.

**Cara Kerja:** Return data user yang terautentikasi berdasarkan token yang digunakan.

**Response:** `200 OK`
```json
{ "id": 1, "name": "John", "email": "john@example.com", "role": "client", ... }
```

---

#### 1.5 Update Profile
**`PUT /api/user`** 🔒 — Memperbarui data profil pengguna.

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| name | string | Tidak | Nama baru |
| username | string | Tidak | Username baru (harus unik) |
| email | string (email) | Tidak | Email baru (harus unik) |
| phone | string | Tidak | Nomor telepon baru |
| address | string | Tidak | Alamat baru |
| date_of_birth | date | Tidak | Tanggal lahir baru |
| bpjs_number | string | Tidak | Nomor BPJS baru |
| password | string (min 8) | Tidak | Password baru |
| current_password | string | Kondisional | Wajib diisi jika ingin mengubah password |

**Cara Kerja:**
1. Jika ada perubahan password, verifikasi `current_password` terlebih dahulu
2. Jika `current_password` benar, hash password baru dan update; cabut semua token dalam transaksi yang sama. Response berisi `reauthenticate: true`, sehingga pengguna harus login ulang.
3. Update field lain yang disertakan dalam request
4. Return data user yang sudah diperbarui

---

#### 1.6 Upload Profile Photo
**`POST /api/user/photo`** 🔒 — Mengunggah foto profil pengguna.

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| photo | file (jpg/jpeg/png, max 2MB) | Ya | File foto profil |

**Cara Kerja:**
1. Validasi file harus berupa gambar (jpg/jpeg/png) dengan ukuran maksimal 2MB
2. Hapus foto lama jika ada
3. Simpan foto baru ke `storage/app/public/profile-photos/`
4. Update path foto profil di database

---

#### 1.7 Remove Profile Photo
**`DELETE /api/user/photo`** 🔒 — Menghapus foto profil pengguna.

**Cara Kerja:** Hapus file foto dari storage dan set field `profile_photo` menjadi `null` di database.

---

#### 1.8 Demo Users
**`GET /api/demo-users` telah dihapus** dan menghasilkan 404. Daftar identitas pengguna tidak lagi dipublikasikan. Buat akun analis melalui command interaktif `php artisan healthguard:create-analyst` dari terminal operator tepercaya; password diminta tersembunyi.

---

### 2. Claims API

Klaim adalah inti dari sistem ini. Setiap klaim memiliki ID unik berformat `CLM-{TAHUN}-{NOMOR}` (contoh: `CLM-2026-001`).

#### 2.1 Get All Claims
**`GET /api/claims`** 🔒 — Mendapatkan daftar klaim.

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| per_page | integer | Tidak | Jumlah data per halaman (max 100, default 20) |

**Cara Kerja:**
- **Client:** Hanya melihat klaim miliknya sendiri
- **Analyst:** Melihat semua klaim dari seluruh klien
- Data diurutkan berdasarkan tanggal submit (terbaru dulu)
- Mendukung pagination

---

#### 2.2 Get Unassigned Claims
**`GET /api/claims/unassigned`** 🔒 — Mendapatkan daftar klaim yang belum ditugaskan ke analis manapun.

**Cara Kerja:** Middleware `role:analyst` membatasi akses. Filter klaim dengan status `Pending` dan `assigned_to = null`.

---

#### 2.3 Get My Assignments
**`GET /api/claims/my-assignments`** 🔒 — Mendapatkan daftar klaim yang ditugaskan ke analis yang sedang login.

**Cara Kerja:** Middleware `role:analyst` membatasi akses. Filter klaim berdasarkan `assigned_to = id analis yang login`.

---

#### 2.4 Assign Claim
**`POST /api/claims/{id}/assign`** 🔒 — Menugaskan klaim ke analis yang sedang login.

**Cara Kerja:**
1. Validasi bahwa hanya **analyst** yang bisa assign klaim
2. Update assignment secara atomik hanya jika status `Pending` dan belum ditugaskan; selain itu 409. Penugasan dan notifikasinya berada dalam satu transaksi.
3. Set `assigned_to` ke ID analis yang melakukan assign
4. Buat notifikasi ke pemilik klaim bahwa klaimnya sedang di-review
5. Return data klaim yang sudah di-update

---

#### 2.5 Create Claim
**`POST /api/claims`** 🔒 — Mengajukan klaim asuransi kesehatan baru.

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| client_name | string | Ya | Nama klien/pasien |
| type | string | Ya | Jenis klaim (rawat inap, rawat jalan, dll) |
| provider_name | string | Ya | Nama rumah sakit/fasilitas kesehatan |
| amount | numeric (min 0) | Ya | Jumlah klaim (biaya) |
| bpjs_number | string | Tidak | Nomor BPJS terkait klaim |

**Cara Kerja:**
1. Generate `claim_id` unik otomatis (format: `CLM-2026-XXX`)
2. Set `user_id` ke ID user yang login, status awal: `Pending`
3. Simpan klaim baru ke database
4. **Kirim notifikasi ke SEMUA analyst** bahwa ada klaim baru yang perlu di-review
5. Return data klaim yang baru dibuat

---

#### 2.6 Get Claim Detail
**`GET /api/claims/{id}`** 🔒 — Mendapatkan detail lengkap satu klaim beserta dokumen dan analis yang ditugaskan.

**Cara Kerja:**
1. Cari klaim berdasarkan `claim_id`
2. Load relasi: user pemilik, dokumen terkait, dan analis yang di-assign
3. **Client** hanya bisa melihat klaim miliknya sendiri (403 jika mencoba akses klaim orang lain)
4. Return detail lengkap klaim

---

#### 2.7 Update Claim
**`PUT /api/claims/{id}`** 🔒 — Memperbarui data klaim (resubmission).

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| client_name | string | Tidak | Nama klien baru |
| type | string | Tidak | Jenis klaim baru |
| provider_name | string | Tidak | Nama provider baru |
| amount | numeric | Tidak | Jumlah klaim baru |

**Cara Kerja:**
1. Validasi kepemilikan (hanya pemilik klaim yang bisa mengubah data klaim)
2. Update field yang disertakan
3. **Reset status ke `Pending`** dan **hapus `approved_amount`** (karena klaim di-resubmit dan perlu di-review ulang)

---

#### 2.8 Update Claim Status
**`PATCH /api/claims/{id}/status`** 🔒 — Mengubah status klaim (hanya analyst).

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| status | string | Ya | Status baru: `Pending`, `Approved`, `Rejected`, `Needs Info`, `Partially Approved` |
| notes | string | Tidak | Catatan dari analis |
| approved_amount | numeric | Tidak | Jumlah yang disetujui (untuk Partially Approved) |

**Status Klaim:**
| Status | Deskripsi |
|--------|-----------|
| `Pending` | Klaim baru diajukan, menunggu review |
| `Approved` | Klaim disetujui sepenuhnya |
| `Rejected` | Klaim ditolak |
| `Needs Info` | Analis membutuhkan informasi tambahan dari klien |
| `Partially Approved` | Klaim disetujui sebagian (dengan `approved_amount` tertentu) |

**Cara Kerja:**
1. Policy memvalidasi bahwa pengguna adalah **analyst yang ditugaskan pada klaim tersebut**; analis lain atau klaim tanpa penugasan ditolak 403
2. Update status, notes, dan approved_amount
3. Buat notifikasi ke pemilik klaim tentang perubahan status beserta catatan (jika ada)

---

### 3. Documents API

Dokumen adalah file pendukung yang diunggah klien untuk melengkapi klaim (misalnya: kwitansi RS, surat rujukan, hasil lab).

#### 3.1 Get Documents
**`GET /api/claims/{claimId}/documents`** 🔒 — Mendapatkan daftar dokumen untuk klaim tertentu.

**Cara Kerja:** Return semua dokumen yang terkait dengan klaim berdasarkan `claimId`. Client hanya bisa melihat dokumen klaim miliknya.

---

#### 3.2 Upload Document
**`POST /api/claims/{claimId}/documents`** 🔒 — Mengunggah dokumen pendukung ke klaim.

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| file | file (pdf/jpg/jpeg/png, max 10MB) | Ya | File dokumen yang diunggah |

**Cara Kerja:**
1. Validasi bahwa hanya **pemilik klaim** yang bisa upload dokumen
2. Periksa kecocokan isi MIME dengan ekstensi dan file tidak kosong; simpan ke disk `private` pada `storage/app/private/documents/`
3. Catat metadata dokumen (nama file, path, ukuran, mime type) ke database
4. Return data dokumen yang tersimpan

---

#### 3.3 Download Document
**`GET /api/claims/{claimId}/documents/{documentId}/download`** 🔒 — Mengunduh dokumen tertentu.

**Cara Kerja:**
1. Validasi akses (client hanya bisa download dari klaim miliknya)
2. Cari dokumen berdasarkan ID di dalam klaim yang sesuai
3. Policy mengizinkan client pemilik atau analis untuk membaca dokumen. Stream file privat dengan `Cache-Control: private, no-store` dan `X-Content-Type-Options: nosniff`. URL `/storage/documents/*` tidak dapat digunakan.

---

### 4. Notifications API

Sistem notifikasi internal untuk memberitahu pengguna tentang aktivitas terkait klaim mereka.

#### 4.1 Get Notifications
**`GET /api/notifications`** 🔒 — Mendapatkan daftar notifikasi pengguna yang sedang login.

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| per_page | integer | Tidak | Jumlah data per halaman (max 50, default 20) |

**Cara Kerja:** Return notifikasi milik user yang login, diurutkan dari yang terbaru. Mendukung pagination.

---

#### 4.2 Get Unread Count
**`GET /api/notifications/unread-count`** 🔒 — Mendapatkan jumlah notifikasi yang belum dibaca.

**Cara Kerja:** Hitung semua notifikasi dengan `is_read = false` milik user yang login. Berguna untuk menampilkan badge counter di UI.

**Response:**
```json
{ "count": 5 }
```

---

#### 4.3 Mark as Read
**`POST /api/notifications/{id}/read`** 🔒 — Menandai satu notifikasi sebagai sudah dibaca.

**Cara Kerja:** Update field `is_read` menjadi `true` pada notifikasi yang ditentukan. Validasi bahwa notifikasi milik user yang login.

---

#### 4.4 Mark All as Read
**`POST /api/notifications/read-all`** 🔒 — Menandai SEMUA notifikasi sebagai sudah dibaca.

**Cara Kerja:** Bulk update semua notifikasi milik user yang login dengan `is_read = false` menjadi `is_read = true`.

---

## Alur Kerja Sistem

```
┌─────────┐                          ┌──────────┐
│  Client  │                          │  Analyst  │
└────┬─────┘                          └─────┬────┘
     │                                      │
     │  1. Register / Login                 │
     │──────────────────────►               │
     │                                      │
     │  2. Submit Claim (+ Upload Docs)     │
     │──────────────────────►               │
     │                                      │
     │              3. Notif: New Claim ◄───│
     │                                      │
     │              4. Assign Claim ────────│
     │  5. Notif: Claim Under Review ◄──────│
     │                                      │
     │  6. Resubmit if "Needs Info"         │
     │──────────────────────►               │
     │                                      │
     │              7. Update Status ───────│
     │  8. Notif: Status Changed ◄──────────│
     │     (Approved / Rejected / Partial)  │
     │                                      │
```

### Keterangan Alur:
1. **Client** mendaftar dan login ke sistem
2. **Client** mengajukan klaim baru beserta dokumen pendukung
3. **Semua Analyst** mendapat notifikasi tentang klaim baru
4. **Analyst** mengambil (assign) klaim yang belum ditangani
5. **Client** mendapat notifikasi bahwa klaimnya sedang di-review
6. Jika analyst membutuhkan informasi tambahan (status `Needs Info`), **client** bisa memperbarui klaimnya
7. **Analyst** memutuskan status akhir klaim (Approved / Rejected / Partially Approved)
8. **Client** mendapat notifikasi tentang keputusan akhir beserta catatan

---

## Database Schema

### Users
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | bigint (PK) | ID unik user |
| name | string | Nama lengkap |
| username | string (nullable) | Username unik |
| email | string (unique) | Alamat email |
| password | string | Password (hashed bcrypt) |
| role | string | Role: `client` atau `analyst` |
| phone | string (nullable) | Nomor telepon |
| address | string (nullable) | Alamat |
| profile_photo | string (nullable) | Path foto profil |
| date_of_birth | date (nullable) | Tanggal lahir |
| bpjs_number | string (nullable) | Nomor BPJS |

### Claims
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | bigint (PK) | ID unik internal |
| claim_id | string (unique) | ID klaim publik (CLM-YYYY-XXX) |
| user_id | bigint (FK) | ID pemilik klaim (client) |
| assigned_to | bigint (FK, nullable) | ID analyst yang menangani |
| client_name | string | Nama pasien/klien |
| type | string | Jenis klaim |
| provider_name | string | Nama fasilitas kesehatan |
| amount | decimal | Jumlah klaim |
| approved_amount | decimal (nullable) | Jumlah yang disetujui |
| status | string | Status: Pending/Approved/Rejected/Needs Info/Partially Approved |
| notes | text (nullable) | Catatan analyst |
| date_submitted | datetime | Tanggal pengajuan |
| bpjs_number | string (nullable) | Nomor BPJS terkait |

### Documents
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | bigint (PK) | ID unik dokumen |
| claim_id | bigint (FK) | ID klaim terkait |
| file_name | string | Nama asli file |
| file_path | string | Path file di storage |
| file_size | integer | Ukuran file (bytes) |
| mime_type | string | Tipe MIME file |

### Notifications
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | bigint (PK) | ID unik notifikasi |
| user_id | bigint (FK) | ID user penerima |
| type | string | Tipe: claim_submitted, claim_assigned, status_changed |
| title | string | Judul notifikasi |
| body | text | Isi pesan notifikasi |
| claim_id | string (nullable) | ID klaim terkait |
| is_read | boolean | Status sudah dibaca |

---

## Menjalankan Project

```bash
# Development server (server + queue + logs + Vite secara paralel)
composer run dev

# Atau jalankan server saja
php artisan serve

# Jalankan migrasi database
php artisan migrate

# Reset dan re-migrate database
php artisan migrate:fresh

# Build asset untuk production
npm run build
```

Server akan berjalan di `http://localhost:8000` dan API dapat diakses di `http://localhost:8000/api/*`.
<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
