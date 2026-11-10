# FRD: Offline Sync

## Otorisasi

`GET /api/sync/snapshot`: `pemilik` dan `kasir` (termasuk `read_only`). Pengiriman antrean memakai `POST /api/transaksi` dengan otorisasi di `pos.md`. `POST /api/sync/gagal`: `pemilik` dan `kasir` non-`read_only`. `GET /api/sync/gagal` dan `PATCH /api/sync/gagal/[id]`: `pemilik` (`GET` juga `read_only`).

## Routes

| Route | Tujuan |
|---|---|
| `GET /api/sync/snapshot` | Data untuk operasi offline |
| `POST /api/transaksi` | Kirim transaksi antrean (`pos.md`) |
| `POST /api/sync/gagal` | Laporkan item antrean berstatus `gagal` ke server |
| `GET /api/sync/gagal` | Daftar laporan item gagal (`pemilik`) |
| `PATCH /api/sync/gagal/[id]` | Tandai ditangani (`pemilik`) |

## Identitas Perangkat

- `device_id`: UUID v4 dibuat saat aplikasi pertama dibuka, disimpan di IndexedDB, tidak berubah selama data browser tidak dihapus.
- Jumlah perangkat per outlet tidak dibatasi. Setiap transaksi menyimpan `device_id`.

## Snapshot `GET /api/sync/snapshot`

| Bagian | Field |
|---|---|
| `outlet` | `nama_outlet`, `zona_waktu`, `blokir_stok_kurang` |
| `menu[]` | `id`, `nama`, `harga_jual`, `foto_url`, `jumlah_terjual_7_hari` (hanya `aktif = true`) |
| `resep[]` | `menu_id`, `bahan_baku_id`, `takaran` |
| `bahan[]` | `id`, `nama`, `satuan`, `stok_saat_ini` (hanya `diarsipkan_at IS NULL`) |
| `waktu_server` | `timestamptz` |

- Tidak memuat field biaya (`auth.md`).
- Diambil saat aplikasi dibuka, setelah setiap putaran sinkronisasi yang berhasil mengirim ≥ 1 transaksi, dan setiap 5 menit selama online dan aplikasi terbuka. Hasil menggantikan snapshot lokal sepenuhnya.
- Response membawa header `ETag` (hash isi); client mengirim `If-None-Match` → 304 jika tidak berubah, menghemat kuota data.
- Setelah transaksi online berhasil (201/200), perangkat langsung mengurangi `stok_saat_ini` snapshot lokal sebesar kebutuhan transaksi itu (resep snapshot, minimum 0) sampai snapshot berikutnya menggantikannya (`pos.md`). Tanpa langkah ini stok lokal terlalu tinggi hingga 5 menit dan cek offline meloloskan pesanan yang seharusnya diblokir.
- Snapshot lebih tua dari 24 jam → layar kasir menampilkan peringatan "Data menu dan stok belum diperbarui sejak <waktu>"; penjualan tetap boleh.
- `waktu_sinkron_terakhir` = waktu server dari pengambilan snapshot terakhir yang berhasil (200 atau 304). Respons 200 dan 304 membawa header `X-Waktu-Server`; pada 304 hanya `waktu_sinkron_terakhir` yang diperbarui, `snapshot.waktu_server` tetap.

## Penyimpanan Lokal (IndexedDB)

| Store | Isi |
|---|---|
| `meta` | `device_id`, counter `nomor_struk` per tanggal (`struk.md`) |
| `snapshot` | Snapshot terakhir |
| `antrean_transaksi` | Payload `POST /api/transaksi` (termasuk `dibuat_oleh` = `user_id` pembuat), `outlet_id`, `status_sync`, `synced_at`, `pesan_error`, `jumlah_percobaan`, `jumlah_coba_lagi`, `dilaporkan` (boolean), `nomor_struk` final, `token_struk`, `diterima_server_at` (= `created_at` dari response server) |
| `keranjang` | Keranjang aktif (`pos.md`) |

Enum `status_sync` (lokal saja): `pending`, `synced`, `gagal`.

- `status_sync` hanya ada di perangkat. Setiap baris `transaksi` di server sudah pasti tersinkron, sehingga asal transaksi dicatat lewat `transaksi.dibuat_offline`.
- `gagal` ditambahkan untuk transaksi yang ditolak permanen (4xx) agar tidak dikirim ulang tanpa henti dan tetap terlihat.

- Kapasitas minimal 500 transaksi `pending` (`non-functional.md` NFR-03). Gagal tulis IndexedDB → tampilkan error, transaksi tidak tercatat.
- Item `synced` dihapus 24 jam setelah tersinkron.

## Transaksi Offline

1. Hitung stok lokal efektif = `snapshot.bahan.stok_saat_ini` − Σ kebutuhan semua transaksi `pending` dan transaksi `synced` dengan `diterima_server_at` > `snapshot.waktu_server` (resep dari snapshot). Transaksi `synced` ikut dihitung agar stok tidak terlalu tinggi bila snapshot ulang setelah sinkronisasi gagal diambil. Kedua waktu yang dibandingkan berasal dari jam server, sehingga jam perangkat yang salah tidak memengaruhi hasil; `synced_at` (jam perangkat) hanya dipakai untuk penghapusan lokal.
2. Ada kekurangan dan `snapshot.outlet.blokir_stok_kurang = true` → tolak di perangkat dengan pesan format `pengurangan-stok.md`; tidak ada yang disimpan.
3. Selain itu → simpan ke `antrean_transaksi` dengan `status_sync = pending`, `dibuat_offline = true`, `nama_menu` dan `harga_jual` dari snapshot; tampilkan struk berstatus "Belum terkirim".

## Pemicu Sinkronisasi

| Pemicu | Keterangan |
|---|---|
| Background Sync API | Tag `sync-transaksi`, jika browser mendukung |
| Event `online` | Fallback wajib |
| Aplikasi dibuka | Fallback wajib |

Hanya satu putaran sinkronisasi berjalan per perangkat pada satu waktu (dikunci Web Locks API, fallback flag di IndexedDB).

## Proses Sinkronisasi

- Kirim item `pending` satu per satu, urut `waktu_transaksi` ASC.
- Hanya item dengan `outlet_id` = `outlet_id` sesi aktif yang dikirim. Item dibuat kasir yang kini nonaktif tetap dikirim oleh akun lain di outlet sama; `transaksi.user_id` = pengirim, `transaksi.dibuat_oleh` = pembuat asli (`pos.md`).

| Response | Status lokal | Lanjut |
|---|---|---|
| 201 / 200 | `synced`, isi `synced_at`, simpan `nomor_struk` final, `token_struk`, dan `diterima_server_at` dari response | Item berikutnya |
| 429 | Tetap `pending` | Tunggu `Retry-After`, ulangi |
| 401 | Tetap `pending` | Hentikan putaran; minta login ulang |
| 400, 403, 404, 409, 422 | `gagal`, simpan `pesan_error` | Item berikutnya |
| 5xx, error jaringan, timeout 10 detik | Tetap `pending`, `jumlah_percobaan + 1` | Hentikan putaran; coba lagi dengan backoff 5, 10, 20, … detik, maks 300 detik |

## Aturan Server untuk `dibuat_offline = true`

- Selalu diterima walau stok kurang (`pengurangan-stok.md`).
- Diterima walau menu kini `aktif = false`.
- `nama_menu`, `harga_jual` dari payload (`pos.md`).
- `client_tx_id` yang sama tidak pernah membuat transaksi ganda (`UNIQUE (outlet_id, client_tx_id)`); pengiriman ulang → 200.

## Penanganan Item `gagal`

| Aspek | Aturan |
|---|---|
| Laporan otomatis | Setiap item menjadi `gagal`, perangkat mengirim `POST /api/sync/gagal` (`client_tx_id`, `device_id`, payload, `pesan_error`); sukses → `dilaporkan = true`. Gagal kirim laporan → dicoba di putaran sinkronisasi berikutnya. Endpoint bersifat upsert per (`outlet_id`, `client_tx_id`): laporan ulang memperbarui `pesan_error`, mengosongkan `ditangani_at`, dan menyet `ditangani_otomatis = false` |
| Tabel server | `transaksi_gagal` (`id` UUID, dipakai di `PATCH /api/sync/gagal/[id]`; `outlet_id`, `client_tx_id`, `device_id`, `user_id`, `payload` jsonb, `pesan_error`, `created_at`, `ditangani_at`, `ditangani_otomatis`); `UNIQUE (outlet_id, client_tx_id)` |
| Kasir | Melihat daftar item `gagal` dengan pesan; aksi "Coba lagi" mengubah ke `pending` (maks 3 kali per item, dicatat di `jumlah_coba_lagi`) |
| Berhasil setelah coba lagi | `POST /api/transaksi` yang sukses (201/200), dalam transaksi DB yang sama (`pengurangan-stok.md` langkah 1 dan 8a), menandai baris `transaksi_gagal` dengan `client_tx_id` sama sebagai ditangani (`ditangani_at = now()`, `ditangani_otomatis = true`), agar pemilik tidak mencatat ulang transaksi yang sudah masuk |
| Pemilik | Melihat `transaksi_gagal` di `/kasir/riwayat` (tab "Gagal terkirim") dan menandai ditangani (`PATCH /api/sync/gagal/[id]`), mis. setelah mencatat ulang transaksi secara manual |
| Hapus lokal | Item `gagal` tetap di perangkat (agar bisa "Coba lagi") sampai `dilaporkan = true` **dan** jatah coba lagi habis atau sudah 7 hari sejak menjadi `gagal` |

Tujuannya: tidak ada transaksi yang uangnya sudah diterima hilang tanpa jejak.

## Logout dan Pergantian Akun

- Logout diblokir di UI selama ada item `pending` atau item `gagal` dengan `dilaporkan = false`; pesan "Masih ada <n> transaksi belum terkirim. Sambungkan internet dulu."
- Sesi kedaluwarsa (401) tidak menghapus antrean; setelah login ulang ke outlet sama, antrean dikirim.
- Login ke outlet berbeda di perangkat yang masih punya antrean outlet lain → antrean tidak dikirim dan tidak dihapus; layar menampilkan "Ada transaksi outlet lain di HP ini".

## Indikator di `/kasir`

| Indikator | Sumber |
|---|---|
| Status koneksi | `navigator.onLine` + hasil request terakhir |
| Jumlah antrean | Count `pending` |
| Jumlah gagal | Count `gagal` |
| Waktu sinkron terakhir | `waktu_sinkron_terakhir` (relatif, mis. "2 menit lalu") |
| Status sedang mengirim | Tampil selama putaran sinkronisasi berjalan |

## Service Worker

- Aset statis dan app shell `/kasir`, `/kasir/riwayat`, `/struk/[clientTxId]`: cache-first, tersedia offline. Untuk `/struk/[clientTxId]`, Service Worker melayani **satu** shell generik untuk semua ID (navigasi ke ID apa pun dijawab dari cache yang sama), lalu halaman membaca data dari IndexedDB atau API di client. Dengan begitu struk transaksi yang baru dibuat saat offline tetap bisa dibuka.
- Response `/api/*` tidak di-cache Service Worker; data offline hanya dari IndexedDB.

## Kriteria Uji

- 0 transaksi ganda dan 0 transaksi offline hilang setelah sinkronisasi.
- 500 transaksi `pending` tersimpan dan terkirim tanpa kehilangan.
