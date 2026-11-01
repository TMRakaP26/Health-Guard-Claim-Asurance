# Retensi dan penghapusan

Default: FEATURE_RETENTION=false dan RETENTION_DAYS=0. Tidak ada penghapusan otomatis.

Pengelola harus menetapkan masa simpan klaim, dokumen, histori, salinan backup, alasan penahanan, dan siapa yang menyetujui permintaan berdasarkan kebutuhan organisasi. Nilai tidak diisi dengan asumsi hukum. Aturan pada aplikasi ini adalah mekanisme pelaksanaan, bukan penetapan kewajiban hukum.

- Pengguna mengajukan deletion request; admin menyetujui/menolak dengan catatan dan konfirmasi.
- Persetujuan membutuhkan feature retention aktif dan tidak boleh menyisakan klaim Pending/Needs Info. Akun admin memerlukan pengelolaan operator.
- Penghapusan menghapus claim, child records/histori, file private/public lama, foto, token dan akun. Identitas aktor pada histori milik pihak lain menjadi null sesuai FK; catatan permintaan tetap menjadi bukti review dengan user_id null.
- Purge: aktifkan flag dan durasi positif, jalankan `php artisan healthguard:purge-expired` untuk melihat jumlah, lalu `--apply` setelah review dan backup. Hanya klaim Approved/Rejected/Partially Approved lebih tua dari updated_at yang memenuhi syarat.
- Kegagalan menghapus byte mempertahankan record untuk retry. Database dan filesystem tidak menyediakan transaksi bersama; berkas yang sudah terhapus sebelum kegagalan tidak dapat di-rollback otomatis. Gunakan backup terenkripsi dan maintenance window.
- Backup dapat tetap berisi data yang sudah dihapus sampai siklus retensinya berakhir. Batasi akses dan terapkan penghapusan backup secara terpisah.
- Jangan memakai query SQL langsung untuk mengedit histori. Batasi kredensial operator dan akses Docker daemon.
