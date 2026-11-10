# FRD: Pengurangan Stok Otomatis

Dijalankan oleh `POST /api/transaksi` (`pos.md`). Tidak ada endpoint terpisah.

## Kebutuhan Bahan

- `kebutuhan[bahan]` = Σ (`items[].qty` × `resep_detail.takaran`) untuk semua item yang resepnya memakai bahan tersebut, memakai resep saat request diproses server.
- Menu tanpa resep tidak mengurangi stok.
- `kekurangan[bahan]` = `kebutuhan − stok_saat_ini` jika `stok_saat_ini < kebutuhan`.

## Keputusan Saat Stok Kurang

| `dibuat_offline` | `outlets.blokir_stok_kurang` | Ada `kekurangan` | Hasil |
|---|---|---|---|
| any | any | Tidak | Diterima, stok dikurangi normal |
| `false` | `true` | Ya | **Ditolak** 409 `STOK_TIDAK_CUKUP`; rollback; tidak ada data tersimpan |
| `false` | `false` | Ya | Diterima dengan koreksi |
| `true` | any | Ya | **Selalu diterima** dengan koreksi |

"Diterima dengan koreksi" untuk setiap bahan yang kurang:

- `stok_saat_ini` diset ke 0 (tidak pernah negatif).
- Mutasi `penjualan` dengan `jumlah = −kebutuhan` dan mutasi `koreksi_sync` dengan `jumlah = +kekurangan` (`mutasi-stok.md`).
- Alert `stok_tidak_sinkron` untuk bahan tersebut (`alert-stok.md`).
- `transaksi.koreksi_stok = true` (kolom boolean, default `false`) dan dikembalikan di response.
- Jenis mutasi tetap `koreksi_sync` (istilah PRD BR-07) untuk transaksi offline maupun online dengan `blokir_stok_kurang = false`; asal kejadian dibedakan lewat `transaksi.dibuat_offline`.

## Transaksi Database

Urutan dalam satu transaksi DB (ACID):

| Langkah | Operasi |
|---|---|
| 1 | Cek `client_tx_id` (`outlet_id`, `client_tx_id`); sudah ada → tandai baris `transaksi_gagal` dengan `client_tx_id` sama sebagai ditangani jika belum (`offline-sync.md`), commit, return 200 transaksi lama. Tidak ada operasi stok, mutasi, atau alert |
| 2 | Muat menu dan resep item; hitung `kebutuhan` |
| 3 | `SELECT ... FOR UPDATE` baris `bahan_baku` terkait, urut `id` ASC (mencegah deadlock) |
| 4 | Hitung `kekurangan`; terapkan tabel keputusan |
| 5 | Insert `transaksi` + `detail_transaksi` (snapshot, `pos.md`) |
| 6 | Update `stok_saat_ini` = max(0, `stok_saat_ini` − `kebutuhan`) per bahan |
| 7 | Insert `stok_mutasi` per bahan (`penjualan`, dan `koreksi_sync` jika kurang) |
| 8 | Insert alert `stok_menipis` / `stok_tidak_sinkron` sesuai `alert-stok.md` |
| 8a | Tandai baris `transaksi_gagal` dengan `client_tx_id` sama sebagai ditangani jika ada (`offline-sync.md`) |
| 9 | Commit; error di langkah mana pun → rollback penuh |

- Pelanggaran unik `client_tx_id` karena request paralel → ulangi langkah 1, kembalikan 200.

## Response 409 `STOK_TIDAK_CUKUP`

`detail.kekurangan[]`:

| Field | Isi |
|---|---|
| `bahan_baku_id` | UUID |
| `nama` | Nama bahan |
| `dibutuhkan` | `kebutuhan` |
| `tersedia` | `stok_saat_ini` |
| `satuan` | Enum `satuan` |

`pesan` dalam bahasa sehari-hari, menyebut semua bahan kurang, contoh: "Stok Telur kurang: butuh 3 buah, sisa 1 buah."

## Cek Stok Lokal (offline)

Aturan sama dengan tabel keputusan baris `blokir_stok_kurang`, dihitung di perangkat terhadap salinan stok lokal; detail di `offline-sync.md`.

## Mitigasi Penyalahgunaan `dibuat_offline`

`dibuat_offline` dikirim client, sehingga client yang dimodifikasi dapat melewati blokir stok. Dampaknya hanya pada akurasi stok (uang tetap tercatat), dan pelakunya akun internal outlet. Kontrol MVP:

- Setiap transaksi menyimpan `user_id` (pengirim), `dibuat_oleh` (pembuat), `device_id`, `dibuat_offline`, `koreksi_stok`; tidak dapat diubah.
- Setiap koreksi memicu alert `stok_tidak_sinkron` ke pemilik (`alert-stok.md`).
- Riwayat transaksi dapat difilter `dibuat_offline` dan menampilkan `koreksi_stok` (`pos.md`).
- Laporan menampilkan `jumlah_transaksi_koreksi_stok` per periode (`laporan.md`) sebagai sinyal audit.
