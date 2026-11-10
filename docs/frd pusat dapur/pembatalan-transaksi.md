# FRD: Pembatalan Transaksi

Koreksi transaksi yang salah input atau batal setelah dikonfirmasi. Transaksi tidak dihapus; statusnya diubah dan stok dikembalikan, sehingga riwayat tetap dapat ditelusuri.

## Otorisasi

Hanya `pemilik` non-`read_only`. `kasir` tidak dapat membatalkan (PRD BR-12 membatasi kasir pada pencatatan); kasir meminta pemilik. `read_only` → 403 `READ_ONLY`.

## Routes

| Route | Tujuan |
|---|---|
| `/kasir/riwayat` | Tombol "Batalkan" per transaksi `selesai` (khusus `pemilik`) |
| `POST /api/transaksi/[clientTxId]/batal` | Batalkan transaksi |

## Payload

| Field | Aturan |
|---|---|
| `alasan_batal` | Enum `salah_input`, `pelanggan_batal`, `lainnya` |
| `catatan_batal` | 0–200 karakter; wajib ≥ 5 karakter jika `alasan_batal = lainnya` |

## Syarat

| Kondisi | Hasil |
|---|---|
| Transaksi tidak ada / outlet lain | 404 |
| `status = dibatalkan` | 409 `SUDAH_DIBATALKAN` |
| Tanggal `waktu_transaksi` **dan** tanggal `created_at` (diterima server), zona waktu outlet, keduanya ≠ hari ini | 409 `BATAS_PEMBATALAN_LEWAT` |
| Transaksi masih `pending` di perangkat | Tidak dapat dibatalkan sampai tersinkron (tombol nonaktif) |

Batas hari yang sama menjaga rekap kas yang sudah ditutup tidak berubah karena pembatalan. Satu pengecualian disengaja: transaksi offline bertanggal lampau yang baru tersinkron hari ini (`offline-sync.md`) masuk laporan tanggal `waktu_transaksi`-nya, sehingga rekap tanggal itu memang sudah berubah hari ini saat transaksi masuk. Karena `created_at`-nya hari ini, pemilik masih dapat membatalkannya pada hari yang sama, dan rekap tanggal lampau itu ikut berubah lagi.

## Action

Satu transaksi DB:

| Langkah | Operasi |
|---|---|
| 1 | `SELECT ... FOR UPDATE` baris `transaksi`; cek syarat |
| 2 | Set `status = dibatalkan`, `dibatalkan_at = now()`, `dibatalkan_oleh = user_id` sesi, `alasan_batal`, `catatan_batal` |
| 3 | Per bahan: `jumlah_kembali` = −Σ `stok_mutasi.jumlah` dengan `ref_id = transaksi.id` dan `jenis IN (penjualan, koreksi_sync)`, yaitu pengurangan bersih yang benar-benar terjadi (`mutasi-stok.md`). Pengecualian: bahan yang sudah masuk stok opname setelah transaksi diterima (`stok_opname.created_at` > `transaksi.created_at`) memakai `jumlah_kembali = 0`, karena stok fisiknya sudah dihitung ulang dan mengembalikan stok akan menghitungnya dua kali. Bahan ini dicantumkan di response sebagai `bahan_tidak_dikembalikan[]` |
| 4 | Lock `bahan_baku` urut `id` ASC; `stok_saat_ini += jumlah_kembali`; insert `stok_mutasi` jenis `pembatalan`, `ref_id = transaksi.id` (`mutasi-stok.md`) untuk `jumlah_kembali > 0` |
| 5 | Jalankan penutupan otomatis alert `stok_menipis` (`alert-stok.md`) |
| 6 | Commit; response 200 transaksi terbaru |

## Efek

- Transaksi `dibatalkan` dikeluarkan dari semua metrik laporan (`laporan.md`) dan dari ringkasan riwayat (`pos.md`).
- Struk menampilkan label "DIBATALKAN" beserta waktu pembatalan (`struk.md`).
- `hpp_cached` dan harga tidak berubah.
- Koreksi pesanan = batalkan lalu buat transaksi baru di `/kasir`.
