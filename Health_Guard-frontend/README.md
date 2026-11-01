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

Playwright memakai server dan database sementara, bukan data lokal aplikasi. Browser terpasang dapat digunakan melalui PLAYWRIGHT_CHANNEL=chrome atau msedge. [QA](../docs/QA.md) dan [status verifikasi](../docs/IMPLEMENTATION.md).
