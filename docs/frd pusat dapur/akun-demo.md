# FRD: Akun Demo Juri

## Identitas

| Aspek | Aturan |
|---|---|
| Akun | `users.peran = pemilik`, `users.read_only = true`, outlet demo tersendiri |
| Kredensial | Environment variable `DEMO_EMAIL`, `DEMO_PASSWORD`; tidak pernah di repository. `DEMO_EMAIL` memakai domain yang tidak menerima email agar reset kata sandi tidak dapat dipakai |
| Distribusi | Hanya di formulir pengumpulan GTNIC |
| Dibuat oleh | Skrip seed; tidak bisa dibuat lewat `/daftar` |

## Otorisasi

- Dapat membaca semua modul pemilik (matriks `auth.md`).
- Middleware menolak setiap request dengan method selain `GET`/`HEAD` → 403 `READ_ONLY` (urutan cek di `auth.md`).
- Tombol ubah data di UI nonaktif; penolakan server tetap wajib.
- Tidak ada antrean offline untuk akun ini.

## Mode Simulasi POS

Agar juri dapat mencoba alur kasir tanpa mengubah data:

| Aspek | Aturan |
|---|---|
| Aktif | Otomatis di `/kasir` untuk sesi `read_only`; banner "Mode simulasi, data tidak disimpan" |
| Konfirmasi | Dijalankan di client saja: cek stok terhadap snapshot (aturan `pengurangan-stok.md`), hitung total dan kembalian, tampilkan struk berlabel "SIMULASI" |
| Server | Tidak ada request mutasi; `POST /api/transaksi` tetap 403 `READ_ONLY` jika dipanggil |
| Penyimpanan | Tidak ditulis ke IndexedDB `antrean_transaksi`; hilang saat halaman ditutup |

## Routes

| Route | Tujuan |
|---|---|
| `GET /api/demo/reset` | Reset data demo (dipanggil Vercel Cron, yang memakai method GET); dikecualikan dari cek sesi, wajib header `Authorization: Bearer <CRON_SECRET>`; selain itu → 401 |

## Data Contoh

| Aspek | Aturan |
|---|---|
| Rentang | 30 hari terakhir termasuk hari ini: 29 hari sebelum hari ini ditulis saat reset; hari ini dimaterialisasi bertahap (lihat baris "Transaksi hari ini") |
| Isi | Bahan baku, menu dengan resep, transaksi, restock, mutasi, alert, sesuai aturan semua file FRD |
| Konsistensi | Invarian `mutasi-stok.md` dan rumus `hpp-margin.md` terpenuhi |
| Determinisme | Generator memakai seed PRNG tetap, sehingga setiap reset menghasilkan pola sama dengan tanggal bergeser |

### Komposisi

| Data | Jumlah |
|---|---|
| Outlet | 1, `nama_outlet = "Warung Demo Pusat Dapur"`, `zona_waktu = Asia/Jakarta`, `ambang_margin = 20`, `blokir_stok_kurang = true`, `onboarding_selesai = true` |
| Akun | 1 pemilik `read_only`, 2 kasir dengan `aktif = false` (tidak dapat login, tidak dihitung kuota; hanya sebagai `dibuat_oleh` transaksi) |
| Bahan baku | 17, yaitu semua bahan unik dari 8 template `resep.md` (nama dan satuan sama persis); semua satuan terwakili |
| Menu | 8 dari template `resep.md`; 2 menu `margin_rendah`, 1 menu `aktif = false` |
| Transaksi | 25–45 per hari kerja, +30% Sabtu–Minggu; jam 07:00–21:00; ±60% `tunai`, 40% `qris`; ±70% `dine_in` |
| Transaksi khusus | 3 transaksi `dibuat_offline = true`, 1 dengan `koreksi_stok = true`; 2 transaksi `dibatalkan` |
| Restock | 3–4 per minggu, termasuk 1 kenaikan harga yang membuat menu menjadi `margin_rendah` |
| Opname | 1 per minggu |
| Alert | 2 `stok_menipis` belum dibaca, 1 `stok_tidak_sinkron` belum dibaca |
| Transaksi hari ini | Tidak ditulis saat reset. Rencana transaksi hari ini (jam 07:00–21:00) dibuat deterministik dari seed PRNG, lalu **dimaterialisasi bertahap**: setiap request `GET` dari sesi outlet demo menjalankan `materialisasiDemo()` di server (maks sekali per 5 menit, dikunci advisory lock per outlet) yang memasukkan transaksi rencana dengan jam ≤ sekarang lewat fungsi inti transaksi yang sama dengan `POST /api/transaksi` (`pengurangan-stok.md`: kebutuhan, stok, mutasi, alert, snapshot, hapus cache laporan). Dengan begitu stok, mutasi, alert, dan laporan hari ini selalu konsisten dengan jam saat ini. Penulisan ini dilakukan server dengan service role, bukan oleh akun `read_only`, sehingga aturan 403 `READ_ONLY` tetap berlaku untuk request pengguna |
| Parameter materialisasi | `dibuat_offline = false`; `waktu_transaksi` = jam rencana (fungsi inti menerima waktu dari pemanggil server ini, bukan waktu server; aturan penggantian waktu di `pos.md` hanya untuk payload HTTP); `user_id` = `dibuat_oleh` = salah satu kasir demo; `device_id` tetap per kasir demo; `client_tx_id` = UUID v4 yang dibangkitkan dari seed PRNG + tanggal + urutan (pengulangan aman lewat idempotensi); `nomor_struk` dibuat server dengan format `struk.md` dari prefiks `device_id` dan urutan rencana; `nama_menu` dan `harga_jual` dari `menus` saat ini |
| Lokasi pemanggilan | Helper server yang dipanggil di awal setiap Route Handler `GET` dan render halaman server untuk sesi outlet demo (runtime Node.js). Tidak dijalankan di middleware karena middleware berjalan di Edge tanpa Prisma (`non-functional.md` NFR-06) |
| Stok tidak cukup | Generator rencana mensimulasikan stok dan restock sehingga normalnya selalu cukup. Jika tetap 409 `STOK_TIDAK_CUKUP`, transaksi rencana itu dilewati dan dicatat log `warn`; materialisasi transaksi lain tetap berjalan |

## Reset Harian

| Aspek | Aturan |
|---|---|
| Jadwal | Vercel Cron setiap hari 00:05 `Asia/Jakarta` (`5 17 * * *` UTC) |
| Lingkup | Hanya data dengan `outlet_id` outlet demo |
| Proses | Satu transaksi DB dengan service role: hapus data bisnis outlet demo (termasuk tabel append-only `stok_mutasi` dan `riwayat_harga_beli`, sebagai satu-satunya pengecualian aturan append-only, `mutasi-stok.md`, `bahan-baku.md`), seed ulang dengan tanggal digeser relatif hari ini. Baris `outlets` dan `users` demo (termasuk 2 kasir) **tidak** dihapus, agar ID akun dan sesi juri tetap berlaku dan aturan "akun kasir tidak dihapus" (`akun-kasir.md`) terjaga |
| Gagal | Rollback; data hari sebelumnya tetap |
