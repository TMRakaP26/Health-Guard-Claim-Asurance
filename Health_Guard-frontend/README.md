# HealthGuard Insurance Claims Management System — Frontend

## Tujuan Pembuatan Project

HealthGuard adalah sistem manajemen klaim asuransi kesehatan berbasis web yang dirancang untuk mempermudah proses pengajuan, peninjauan, dan pengelolaan klaim asuransi. Sistem ini menghubungkan dua pihak utama:

- **Client (Nasabah)** — Mengajukan klaim asuransi, melacak status klaim, dan melakukan resubmission jika klaim ditolak atau disetujui sebagian.
- **Analyst (Analis)** — Meninjau klaim yang masuk, menyetujui/menolak/memberi persetujuan parsial, serta mengelola assignment klaim.

Sistem ini bertujuan untuk mendigitalisasi dan mempercepat proses klaim asuransi yang biasanya dilakukan secara manual, sehingga lebih transparan, efisien, dan mudah dipantau oleh kedua belah pihak.

---

## Tech Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **React** | 18.3.1 | Library utama untuk membangun antarmuka pengguna berbasis komponen |
| **TypeScript** | — | Menambahkan type safety pada JavaScript untuk mengurangi bug di waktu development |
| **Vite** | 6.3.5 | Build tool dan development server yang sangat cepat untuk proyek React |
| **Tailwind CSS** | 4.1.12 | Utility-first CSS framework untuk styling yang cepat dan konsisten |
| **React Router** | 7.13.0 | Routing di sisi client untuk navigasi antar halaman (SPA) |
| **Axios** | 1.17.0 | HTTP client untuk berkomunikasi dengan backend API |
| **shadcn/ui (Radix UI)** | — | Komponen UI library berbasis Radix untuk accessible dan reusable components |
| **Lucide React** | 0.487.0 | Library ikon modern yang ringan dan mudah digunakan |
| **Recharts** | 2.15.2 | Library chart untuk visualisasi data pada dashboard analyst |
| **XLSX** | 0.18.5 | Library untuk export data ke format Excel |
| **React Hook Form** | 7.55.0 | Library form management dengan performa tinggi dan validasi built-in |
| **Motion** | 12.23.24 | Library animasi untuk transisi dan interaksi UI yang lebih halus |
| **date-fns** | 3.6.0 | Library utility untuk manipulasi dan format tanggal |

---

## Tools yang Digunakan

| Tool | Fungsi |
|------|--------|
| **Vite Dev Server** | Menjalankan development server dengan hot module replacement (HMR) untuk preview perubahan secara real-time |
| **Vite Build** | Menghasilkan bundle production yang teroptimasi (minified, tree-shaken) |
| **PostCSS** | Memproses CSS dengan plugin Tailwind CSS |
| **Tailwind CSS Vite Plugin** | Integrasi Tailwind langsung ke dalam pipeline Vite |
| **Figma Asset Resolver** | Custom Vite plugin untuk resolve import asset dari Figma Make |
| **npm** | Package manager untuk menginstall dan mengelola dependensi |

---

## Fitur Utama

### Client (Nasabah)
- Registrasi dan login akun
- Quick Sign In (login cepat berbasis cookie untuk akun yang pernah login)
- Pengajuan klaim asuransi multi-step form (data pribadi → detail klaim → upload dokumen → review)
- Dashboard klaim dengan tabel dan detail modal
- Edit & resubmit klaim yang ditolak (Rejected) atau disetujui parsial (Partially Approved)
- Upload dokumen pendukung (PDF, JPG, PNG)
- Notifikasi real-time saat status klaim berubah
- Profil pengguna dengan upload foto profil
- Export data klaim ke Excel

### Analyst (Analis)
- Dashboard analyst dengan tabel semua klaim dan filter
- Unassigned Claims — daftar klaim yang belum di-assign, dengan tombol Manage untuk mengambil assignment
- My Assignments — daftar klaim yang ditangani oleh analyst
- Claim Review — halaman detail klaim dengan document viewer dan keputusan status
- Status klaim: Pending, Approved, Rejected, Needs Info, Partially Approved
- Approved Billed — field khusus untuk memasukkan nilai persetujuan (hanya aktif saat Partially Approved)
- Settings & profil analyst
- Notifikasi real-time saat ada klaim baru

---

## Struktur Folder

```
src/
├── app/
│   ├── api/
│   │   └── client.ts          # Konfigurasi Axios & fungsi API call
│   ├── components/
│   │   ├── figma/             # Komponen asset dari Figma
│   │   ├── ui/                # Komponen shadcn/ui (button, dialog, dll)
│   │   ├── Header.tsx         # Header aplikasi
│   │   ├── Sidebar.tsx        # Sidebar navigasi client
│   │   ├── AnalystSidebar.tsx # Sidebar navigasi analyst
│   │   ├── Layout.tsx         # Layout wrapper client
│   │   ├── AnalystLayout.tsx  # Layout wrapper analyst
│   │   ├── NotificationBell.tsx # Komponen bell notifikasi
│   │   └── ProtectedRoute.tsx # Route guard berdasarkan role
│   ├── pages/
│   │   ├── Login.tsx          # Halaman login
│   │   ├── Register.tsx       # Halaman registrasi
│   │   ├── Dashboard.tsx      # Dashboard client
│   │   ├── ClientClaimForm.tsx # Form pengajuan klaim
│   │   ├── AnalystDashboard.tsx # Dashboard analyst
│   │   ├── AnalystReview.tsx  # Halaman review klaim
│   │   ├── UnassignedClaims.tsx # Daftar klaim belum di-assign
│   │   ├── MyAssignments.tsx  # Klaim yang ditangani analyst
│   │   ├── Profile.tsx        # Halaman profil
│   │   ├── Settings.tsx       # Halaman settings
│   │   ├── Guide.tsx          # Panduan penggunaan
│   │   └── EmptyState.tsx     # Placeholder kosong
│   ├── state/
│   │   ├── AuthContext.tsx    # Context autentikasi (user, token, login/logout)
│   │   └── ClaimContext.tsx   # Context data klaim (CRUD, filter)
│   ├── utils/
│   │   └── cookies.ts        # Utility cookie untuk Quick Sign In
│   ├── App.tsx               # Root component
│   └── routes.tsx            # Definisi routing aplikasi
├── styles/
│   ├── index.css             # Entry point CSS
│   ├── tailwind.css          # Import Tailwind
│   ├── fonts.css             # Konfigurasi font
│   └── theme.css             # Tema dan warna kustom
└── main.tsx                  # Entry point React
```

---

## Cara Menjalankan

### Development
```bash
npm install
npm run dev
```
Server akan berjalan di `http://localhost:5173`

### Build Production
```bash
npm run build
```
Hasil build akan berada di folder `dist/`

---

## API yang Digunakan

Semua API call dilakukan melalui Axios client yang dikonfigurasi di `src/app/api/client.ts`. Base URL di-proxy ke backend Laravel di `http://localhost:8000` melalui konfigurasi Vite.

### Autentikasi

| Method | Endpoint | Fungsi | Cara Kerja |
|--------|----------|--------|------------|
| POST | `/api/register` | Mendaftarkan akun baru | Mengirim data registrasi (name, email, password, role), server mengembalikan user object dan token Sanctum |
| POST | `/api/login` | Login ke sistem | Mengirim email dan password, server memverifikasi dengan bcrypt hash dan mengembalikan token |
| POST | `/api/logout` | Logout dari sistem | Menghapus token Sanctum yang sedang aktif (requires auth) |
| GET | `/api/user` | Mendapatkan data user yang sedang login | Mengembalikan data user berdasarkan token yang dikirim di header Authorization (requires auth) |
| GET | `/api/demo-users` | Mendapatkan daftar user untuk Quick Sign In | Mengembalikan list user (id, name, email, role) untuk ditampilkan di halaman login |

### Profil Pengguna

| Method | Endpoint | Fungsi | Cara Kerja |
|--------|----------|--------|------------|
| PUT | `/api/user` | Update profil user | Mengirim field yang ingin diubah (name, phone, address, date_of_birth, bpjs_number). Jika mengubah password, wajib menyertakan current_password (requires auth) |
| POST | `/api/user/photo` | Upload foto profil | Mengirim file gambar (max 2MB, jpg/png), server menyimpan ke storage dan update field profile_photo (requires auth) |
| DELETE | `/api/user/photo` | Hapus foto profil | Menghapus file foto dari storage dan mengosongkan field profile_photo (requires auth) |

### Klaim Asuransi

| Method | Endpoint | Fungsi | Cara Kerja |
|--------|----------|--------|------------|
| GET | `/api/claims` | Mendapatkan daftar klaim | Client: hanya klaim miliknya. Analyst: semua klaim. Mendukung pagination dengan parameter `per_page` (requires auth) |
| POST | `/api/claims` | Mengajukan klaim baru | Mengirim data klaim (client_name, type, provider_name, amount, bpjs_number). Server generate claim_id otomatis dengan format `CLM-YYYY-XXX`. Otomatis mengirim notifikasi ke semua analyst (requires auth) |
| GET | `/api/claims/{id}` | Detail klaim tertentu | Mengembalikan data klaim lengkap dengan dokumen dan assigned analyst. Client hanya bisa mengakses klaim miliknya (requires auth) |
| PUT | `/api/claims/{id}` | Edit & resubmit klaim | Digunakan client untuk mengedit klaim yang Rejected/Partially Approved. Otomatis mereset status ke Pending dan approved_amount ke null (requires auth) |
| PATCH | `/api/claims/{id}/status` | Update status klaim | Hanya analyst yang bisa menggunakan. Mengirim status (Pending/Approved/Rejected/Needs Info/Partially Approved), notes, dan approved_amount. Otomatis mengirim notifikasi ke pemilik klaim (requires auth) |
| GET | `/api/claims/unassigned` | Daftar klaim belum di-assign | Mengembalikan klaim Pending yang belum punya assigned analyst (requires auth) |
| GET | `/api/claims/my-assignments` | Klaim yang di-assign ke analyst | Mengembalikan klaim yang assigned_to-nya sama dengan ID analyst yang login (requires auth) |
| POST | `/api/claims/{id}/assign` | Assign klaim ke analyst | Analyst mengambil assignment klaim. Mengecek apakah klaim sudah di-assign sebelumnya. Otomatis mengirim notifikasi ke pemilik klaim (requires auth) |

### Dokumen

| Method | Endpoint | Fungsi | Cara Kerja |
|--------|----------|--------|------------|
| GET | `/api/claims/{claimId}/documents` | Daftar dokumen klaim | Mengembalikan semua dokumen yang terkait dengan klaim tertentu (requires auth) |
| POST | `/api/claims/{claimId}/documents` | Upload dokumen | Mengirim file (max 10MB, pdf/jpg/png). Hanya pemilik klaim yang bisa upload. File disimpan di storage/documents (requires auth) |
| GET | `/api/claims/{claimId}/documents/{documentId}/download` | Download dokumen | Mendownload file dokumen dari storage (requires auth) |

### Notifikasi

| Method | Endpoint | Fungsi | Cara Kerja |
|--------|----------|--------|------------|
| GET | `/api/notifications` | Daftar notifikasi user | Mengembalikan notifikasi milik user yang sedang login, diurutkan dari terbaru. Mendukung pagination (requires auth) |
| GET | `/api/notifications/unread-count` | Jumlah notifikasi belum dibaca | Mengembalikan jumlah notifikasi dengan is_read = false. Digunakan untuk badge pada bell icon (requires auth) |
| POST | `/api/notifications/{id}/read` | Tandai notifikasi sebagai dibaca | Mengubah is_read menjadi true pada notifikasi tertentu (requires auth) |
| POST | `/api/notifications/read-all` | Tandai semua notifikasi sebagai dibaca | Mengubah is_read menjadi true pada semua notifikasi user (requires auth) |

---

## Autentikasi

Sistem menggunakan **Bearer Token** dari Laravel Sanctum. Setiap request yang memerlukan autentikasi menyertakan header:
```
Authorization: Bearer {token}
```

Token disimpan di `localStorage` setelah login berhasil dan dihapus saat logout.
