# HealthGuard frontend

React 18, TypeScript strict, React Router, Axios, Vite. UI bisnis berada di src/app/portal; API client dan authentication provider dipakai bersama. Scaffold komponen dan PHP _gen yang tidak dipakai sudah dihapus.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:security
npm run build
npx playwright install chromium
npm run test:e2e
```

Vite meneruskan /api dan /storage ke http://127.0.0.1:8000; override dengan VITE_BACKEND_URL. Production Nginx memakai service backend Compose.

Routes: /claims, /claims/new, /claims/:claimId, /claims/:claimId/edit, /drafts, /notifications, /profile, /analytics, /admin. Link lama /client dan /analyst tetap dialihkan. Halaman detail mengambil record dari API, tidak bergantung pada daftar yang telah dimuat.

Draf berisi data formulir di server; berkas tidak disimpan di browser. Unggahan gagal mempertahankan claim ID dan daftar unggahan berhasil selama halaman terbuka. Setelah reload, lanjutkan unggahan pada detail klaim; jangan membuat pengajuan baru.

Formulir menampilkan ringkasan kesalahan, pesan per field, dan memfokuskan input invalid pertama.
Saat maju/mundur, fokus menuju judul langkah baru; Tab berikutnya menuju input pertama.
Pada langkah dokumen/konfirmasi, periksa nama berkas dan hapus pilihan yang tidak diperlukan.
Jika unggahan terputus, tombol retry per berkas melanjutkan berkas tersebut tanpa mengirim ulang
berkas yang sudah berhasil. Navigasi keluar tetap memunculkan peringatan selama unggahan belum selesai.

Playwright memakai server dan database sementara, bukan data lokal aplikasi. Browser terpasang dapat digunakan melalui PLAYWRIGHT_CHANNEL=chrome atau msedge. [QA](../docs/QA.md) dan [status verifikasi](../docs/IMPLEMENTATION.md).

Storage unggahan E2E juga ditempatkan di direktori sementara yang sama dengan database melalui
`LARAVEL_STORAGE_PATH`. Suite tambahan mencakup matriks klaim/otorisasi dan alur keyboard
client/analis beserta dialog. Lihat [peta cakupan tes](../docs/TEST-COVERAGE.md) untuk hubungan
antara tiket, tes otomatis, dan pemeriksaan manual yang masih diperlukan.

`upload-recovery.spec.ts` memutus satu unggahan sebelum mencapai server dan memeriksa retry,
dialog navigasi, serta tidak adanya duplikasi klaim/dokumen setelah reload.
`profile-admin.spec.ts` memeriksa persistensi profil/provider dan aksesibilitas halaman tambahan.
Pagination pengguna dan permintaan penghapusan pada Administrasi memiliki label berbeda di ID/EN.
Di PowerShell yang memblokir `npm.ps1`, gunakan `npm.cmd` tanpa mengubah execution policy.
Untuk Chrome lokal: `$env:PLAYWRIGHT_CHANNEL='chrome'; npm.cmd run test:e2e`.
