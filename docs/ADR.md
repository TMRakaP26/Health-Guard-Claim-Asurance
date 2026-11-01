# Keputusan arsitektur

| Keputusan | Implementasi dan alasan |
|---|---|
| MySQL8.4 | Service DB terpisah, transaksi/row locks, decimal(10,2), indeks query. SQLite hanya untuk lokal/test/import. |
| Key terpisah | Volume appdata terpisah dari dbdata. Key dipertahankan saat migrasi karena 2FA terenkripsi. |
| Dokumen privat | Disk private; endpoint download menjalankan policy. Public storage/documents ditolak Nginx/Apache. Foto profil tetap public sesuai kebijakan awal. |
| Otorisasi | Client melihat miliknya; analis/admin dapat membaca klaim untuk operasional. Hanya assigned analyst dapat memutuskan. Admin tidak diberi override keputusan. |
| Histori | Perubahan status/assignment/resubmit/dokumen/pesan/pembayaran dicatat dalam transaksi yang sama. Tidak ada endpoint edit/delete. Parent cascade hanya untuk penghapusan/retensi berizin. SQL operator tetap harus dibatasi. |
| Resubmit | Pertahankan assignment dan notes; previous snapshot disimpan, approved_amount direset, status Pending. |
| ID klaim | Sequence per tahun dikunci dalam transaksi, termasuk inisialisasi dari ID hasil import. |
| Nominal | Decimal(10,2), lebih dari nol, maksimal99.999.999,99 IDR, partial approval tidak melebihi nominal klaim termasuk validasi ulang setelah lock. |
| Pembayaran | Catatan manual paid kemudian settled dengan amount/reference tetap. Tidak mengintegrasikan bank/gateway. Paid claim terkunci terhadap resubmit/keputusan ulang. |
| Polis | Registry provider dan kategori menyimpan diagnosis, limit dan aturan yang dikonfigurasi pengelola. Aturan teks adalah panduan peninjauan; tidak ada mesin penilaian medis/polis otomatis. |
| Notifikasi | Polling default30detik; SSE opt-in, email opt-in. Payload email generik tanpa rincian medis. |
| Draf | Server menyimpan data parsial; browser tidak menyimpan dokumen/PHI draft dalam localStorage. Token tetap localStorage untuk kompatibilitas Sanctum bearer. |
| Retensi | Disabled default, operator memilih durasi; purge dry run dan deletion requests diperiksa admin. Histori mengikuti masa retensi klaim induk. |
| UI | Shared typed API hooks, server pagination/filter/stats, explicit resources. Native dialog menyediakan focus trap dan Escape. ID/EN, IDR, zona waktu Asia/Jakarta. |

SLA menggunakan waktu pengajuan asli + CLAIM_SLA_HOURS(default72), bukan waktu resubmit. Approval rate = klaim Approved/Partially Approved dibagi seluruh klaim sesuai filter. Turnaround = rata-rata jam dari pengajuan awal ke setiap keputusan final yang tercatat; pengajuan ulang dapat menghasilkan beberapa keputusan. Data migrasi snapshot tidak dianggap keputusan asli.
