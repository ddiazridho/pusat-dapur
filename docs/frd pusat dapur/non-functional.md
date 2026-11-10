# FRD: Kebutuhan Non-Fungsional

Berlaku lintas semua file FRD. File lain merujuk section di sini, tidak mengulang aturannya.

## NFR-01: Konvensi Data

| Aspek | Aturan |
|---|---|
| ID | UUID v4 untuk semua primary key. `client_tx_id` dan `device_id` dibuat di perangkat (UUID v4). |
| Uang | Rupiah, `bigint` (tanpa desimal) untuk `harga_jual` (`menus` dan `detail_transaksi`), `subtotal`, `total`, `uang_diterima`, `kembalian`, `total_harga` restock. Rentang `harga_jual` 1–10.000.000. `total` transaksi dapat mencapai 10.000.000 × 99 × 50 ≈ 49,5 miliar, sehingga `integer` 32-bit tidak dipakai. |
| Harga per satuan dan HPP | `numeric(12,2)` untuk `harga_beli_per_satuan` (maks 10.000.000). `numeric(18,2)` untuk nilai hasil kali harga × kuantitas: `hpp_cached`, `hpp_snapshot`, `nilai_selisih`. Pembulatan half-up ke 2 desimal. Ditampilkan dibulatkan ke Rupiah. |
| Kuantitas bahan | `numeric(12,3)` untuk `stok_saat_ini`, `threshold_min`, `takaran`, `jumlah` (`stok_mutasi`, `restock_log`), `jumlah_input`, `stok_fisik`, `stok_sistem`, `selisih`. Semua input kuantitas maks 3 desimal (lebih → 422 `VALIDASI_GAGAL`), sehingga nilai > 0 tidak pernah terbulatkan menjadi 0. Satuan `buah` boleh pecahan (mis. 0,5 buah). `MAKS_STOK` = 999.999.999,999 (batas kolom); operasi yang membuat `stok_saat_ini` melebihi `MAKS_STOK` → 422 `STOK_MELEBIHI_BATAS`. |
| Satuan | Enum `satuan`: `gram`, `ml`, `buah`. |
| Waktu | `timestamptz`, disimpan UTC. Batas hari ("hari ini", tanggal struk, periode laporan) dihitung dalam zona waktu outlet `outlets.zona_waktu` (`pengaturan-outlet.md`). Istilah "zona waktu outlet" di file lain merujuk field ini. |
| Teks | Di-trim sebelum validasi. Keunikan nama dicek case-insensitive. |
| Scoping | Semua tabel bisnis memiliki `outlet_id NOT NULL` (lihat `auth.md`). |
| Format error API | `{ "error": { "kode": string, "pesan": string, "detail"?: object } }`. `pesan` dalam Bahasa Indonesia sehari-hari; `kode` UPPER_SNAKE_CASE. |

### Kode Status API

| Status | Kapan |
|---|---|
| 200 | Baca/ubah berhasil; pengiriman ulang transaksi dengan `client_tx_id` yang sama |
| 201 | Data baru dibuat |
| 401 `TIDAK_TERAUTENTIKASI` | Tanpa sesi valid |
| 403 `AKSES_DITOLAK` | Peran tidak berhak (matriks di `auth.md`) |
| 403 `READ_ONLY` | Akun `read_only` mengirim request mutasi (`akun-demo.md`) |
| 404 `TIDAK_DITEMUKAN` | Resource tidak ada atau milik outlet lain |
| 409 | Konflik aturan bisnis (kode spesifik di file fitur) |
| 422 | Payload tidak lolos validasi: `VALIDASI_GAGAL` (`detail` berisi error per field) atau kode spesifik di file fitur |
| 429 `TERLALU_BANYAK_REQUEST` | Rate limit (NFR-04), header `Retry-After` dalam detik |

### Batas Nilai

Batas rentang nilai di setiap file FRD (panjang teks, nominal, kuantitas, jumlah item) adalah nilai final MVP. Batas yang sama dipakai di skema Zod client dan server dari satu modul bersama agar tidak berbeda. Perubahan batas cukup di modul tersebut dan FRD terkait.

## NFR-02: Performa

| Metrik | Target | Kondisi uji |
|---|---|---|
| Layar POS interaktif (load pertama) | ≤ 3 detik | Chrome Android, RAM 2 GB, jaringan 3G |
| Layar POS interaktif (setelah cache) | ≤ 1 detik | Sama, aset dari Service Worker |
| `POST /api/transaksi` online | ≤ 2 detik p95 | Sampai `nomor_struk` diterima |
| Pesanan 3 item oleh kasir baru | ≤ 15 detik | Uji pengguna tanpa pelatihan |

Index wajib:

| Index | Kolom |
|---|---|
| `idx_transaksi_outlet_date` | `transaksi (outlet_id, waktu_transaksi DESC)` |
| `idx_alert_unread` | `stok_alert (outlet_id, sudah_dibaca) WHERE sudah_dibaca = false` |
| `idx_resep_menu` | `resep_detail (menu_id)` |
| `idx_mutasi_bahan` | `stok_mutasi (bahan_baku_id, seq DESC)` |
| `idx_detail_transaksi` | `detail_transaksi (transaksi_id)` |
| `idx_resep_bahan` | `resep_detail (bahan_baku_id)` (hitung ulang HPP saat restock) |

## NFR-03: Offline

| Aspek | Aturan |
|---|---|
| Durasi | POS, daftar menu, dan stok lokal berfungsi tanpa koneksi minimal 1 hari operasional. |
| Kapasitas antrean | Minimal 500 transaksi `pending` di IndexedDB. |
| PWA | Installable (manifest + Service Worker); aset statis di-cache. |
| Data offline | Menu, resep, stok, dan pengaturan outlet dari `GET /api/sync/snapshot`. |

Perilaku detail di `offline-sync.md`.

## NFR-04: Keamanan

| Risiko | Mitigasi |
|---|---|
| Input tidak valid | Semua payload divalidasi Zod di server; validasi client hanya bantuan. |
| Pencurian sesi | Sesi Supabase Auth di cookie httpOnly, `Secure`, `SameSite=Lax` (`@supabase/ssr`). |
| Akses lintas outlet | Lapis 1: setiap query Prisma wajib memfilter `outlet_id` dari sesi. Lapis 2: RLS aktif di semua tabel untuk akses via Supabase client. Detail di `auth.md`. |
| Penyalahgunaan endpoint | Rate limit via Upstash Redis (sliding window); lewat batas → 429. |
| Akun demo diubah | `read_only` ditegakkan di middleware server (`akun-demo.md`). |
| Kredensial bocor | Kredensial demo dan secret hanya di environment variable, tidak di repository. |
| SQL injection | Hanya query parameterized (Prisma); tidak ada konkatenasi string SQL. |
| XSS | Output di-escape React; tidak ada `dangerouslySetInnerHTML`. Teks pengguna di link WhatsApp di-`encodeURIComponent`. |
| CSRF | Cookie `SameSite=Lax`; Route Handler mutasi hanya menerima `Content-Type: application/json` dan memvalidasi header `Origin` = domain aplikasi. Berlaku juga untuk request tanpa data (mis. `DELETE`, `POST /api/alert/baca-semua`): client tetap mengirim header tersebut dengan body `{}`. Pengecualian: route cron (`GET`, diautentikasi `CRON_SECRET`). |
| Header keamanan | `Content-Security-Policy` (sumber script hanya domain sendiri), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`. |
| Struk publik | Token acak 128 bit, halaman `noindex` (`struk.md`). |
| Audit | Perubahan stok tercatat di `stok_mutasi`; perubahan harga beli di `riwayat_harga_beli`; pembatalan transaksi menyimpan pelaku dan alasan. |

### Rate Limit

| Endpoint | Batas | Kunci |
|---|---|---|
| `POST /api/transaksi` | 10 request/detik | `outlet_id` |
| `POST /api/auth/daftar` | 5 request/jam | IP |
| `/s/[token]` (struk publik) | 30 request/menit | IP |
| Endpoint mutasi lain (selain `POST /api/transaksi`) | 60 request/menit | `user_id` |

Rate limit dijalankan di middleware untuk semua route di tabel ini, termasuk route publik yang melewati cek sesi (`auth.md`).

Login dan email reset kata sandi memakai rate limit bawaan Supabase Auth. Batas kirim email baru bisa diubah setelah SMTP kustom terpasang: prod (Brevo, H5/#14) dikonfigurasi maks 3 email/jam, dihitung per project (bukan per alamat email); dev memakai bawaan Supabase, 2 email/jam.

## NFR-05: Integritas Data

| Constraint | Mekanisme | Level |
|---|---|---|
| Stok tidak negatif | `CHECK (stok_saat_ini >= 0)` di `bahan_baku` | Database |
| Transaksi atomik | Transaksi, detail, pengurangan stok, mutasi, alert dalam satu transaksi DB (`pengurangan-stok.md`); sama untuk restock, opname, pembatalan | Database |
| Nomor struk unik | `UNIQUE (outlet_id, nomor_struk)` | Database |
| Alert tidak ganda | Partial unique `stok_alert (bahan_baku_id, jenis) WHERE sudah_dibaca = false` | Database |
| Idempotensi | `UNIQUE (outlet_id, client_tx_id)` di `transaksi` | Database |
| Bahan unik per resep | `UNIQUE (menu_id, bahan_baku_id)` di `resep_detail` | Database |
| Nama bahan unik | Unique index `bahan_baku (outlet_id, lower(nama)) WHERE diarsipkan_at IS NULL`; pelanggaran → 409 `NAMA_BAHAN_SUDAH_ADA` | Database |
| Nama menu unik | Unique index `menus (outlet_id, lower(nama))`; pelanggaran → 409 `NAMA_MENU_SUDAH_ADA` | Database |
| Username unik | Unique index `users (lower(username)) WHERE username IS NOT NULL`; pelanggaran → 409 `USERNAME_SUDAH_ADA` | Database |
| Stok dapat ditelusuri | `stok_saat_ini` = Σ `stok_mutasi.jumlah` per bahan, 100% (`mutasi-stok.md`) | Aplikasi + uji |
| Histori tidak berubah | Snapshot di `detail_transaksi` (`pos.md`) | Database |

## NFR-06: Runtime

| Komponen | Runtime |
|---|---|
| Route Handlers yang memakai Prisma | Node.js runtime (`export const runtime = 'nodejs'`) |
| Middleware (cek sesi, `read_only`) | Edge, tanpa akses Prisma |

## NFR-07: Aksesibilitas dan Bahasa

| Aspek | Aturan |
|---|---|
| Bahasa UI dan pesan error | Bahasa Indonesia sehari-hari; tanpa istilah akuntansi selain "HPP", "margin", "laba kotor". |
| Format | Rupiah `Rp12.500`; tanggal `2 Nov 2026`; jam 24 jam dengan label zona (`WIB`, `WITA`, `WIT`) sesuai zona waktu outlet. |
| Touch target | ≥ 48 × 48 px. |
| Kontras | WCAG 2.1 AA (≥ 4.5:1 teks normal). |
| Status | Tidak hanya dibedakan warna; selalu ada label teks (mis. "Menipis", "Margin rendah"). |
| Form transaksi | Maksimal 3 field input per form transaksi (POS, restock). |

## NFR-08: Browser

| Target | Keterangan |
|---|---|
| Utama | Chrome Android versi terbaru, RAM 2–3 GB |
| Pendukung | Chrome, Edge, Firefox, Safari desktop/mobile versi terbaru |
| Background Sync | Opsional; fallback wajib (`offline-sync.md`) |

## NFR-09: Observability dan Backup

| Aspek | Aturan |
|---|---|
| Log server | Error Route Handler dicatat JSON terstruktur (`level`, `route`, `outlet_id`, `user_id`, `kode`, pesan dalam bahasa Inggris); tanpa password, token, atau isi struk publik. |
| Health check | `GET /api/health` publik, mengembalikan 200 `{ "status": "ok" }` jika DB terjangkau, 503 jika tidak. |
| Backup | Backup harian otomatis Supabase; uji restore sekali sebelum demo. |
| Job harian | Pemeriksaan invarian stok (`mutasi-stok.md`) berjalan sebagai Vercel Cron tersendiri, terpisah dari reset demo (`akun-demo.md`). |

## NFR-10: Biaya dan Kuota

| Aspek | Aturan |
|---|---|
| Infrastruktur | Berjalan di free tier Vercel, Supabase, Upstash untuk skala demo. |
| Kuota (konstanta konfigurasi) | `MAKS_AKUN_KASIR = 3` (kasir `aktif`), `MAKS_RIWAYAT_LAPORAN_HARI = 90`. Tidak ada billing di MVP. |
| Konstanta non-kuota | `MASA_BERLAKU_STRUK_HARI = 90` (link struk publik, `struk.md`). Sengaja dipisah dari kuota paket agar perubahan paket gratis/berbayar tidak mengubah masa berlaku link struk pelanggan. |
| Batas kuota riwayat | Data lebih lama dari 90 hari tetap disimpan (tidak dihapus), hanya tidak dapat diakses di paket gratis; siap dibuka di paket berbayar v2. |
