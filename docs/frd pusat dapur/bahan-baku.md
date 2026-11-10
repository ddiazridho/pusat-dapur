# FRD: Bahan Baku

## Otorisasi

| Action | `pemilik` | `kasir` | `read_only` |
|---|---|---|---|
| Lihat daftar dan detail | Ya | Ya, tanpa `harga_beli_per_satuan`, `riwayat_harga_beli`, dan riwayat mutasi | Ya |
| Tambah, ubah, koreksi harga, arsipkan | Ya | Tidak | Tidak (403 `READ_ONLY`) |

## Routes

| Route | Tujuan |
|---|---|
| `/bahan` | Daftar bahan dengan stok dan status |
| `/bahan/[id]` | Detail bahan + riwayat mutasi (`mutasi-stok.md`) |
| `GET /api/bahan-baku` | Daftar bahan outlet |
| `POST /api/bahan-baku` | Tambah bahan |
| `GET /api/bahan-baku/[id]` | Detail bahan |
| `PATCH /api/bahan-baku/[id]` | Ubah field yang boleh diubah |
| `DELETE /api/bahan-baku/[id]` | Arsipkan bahan (soft delete) |

## Fields (`bahan_baku`)

| Field | Aturan | Dapat diubah via `PATCH` |
|---|---|---|
| `nama` | 1–100 karakter; unik per outlet (case-insensitive) di antara bahan yang tidak diarsipkan | Ya |
| `satuan` | Enum `gram`, `ml`, `buah` | Tidak |
| `stok_saat_ini` | Stok awal saat tambah: ≥ 0 dan ≤ 100.000.000 (sama dengan batas satu restock, `restock.md`); setelahnya dibatasi `MAKS_STOK` (`non-functional.md` NFR-01) | Tidak (hanya via `restock.md`, `stok-opname.md`, `pengurangan-stok.md`) |
| `threshold_min` | ≥ 0 dan ≤ `MAKS_STOK` | Ya |
| `harga_beli_per_satuan` | ≥ 0 dan ≤ 10.000.000, Rupiah per 1 `satuan` | Ya, sebagai koreksi harga (lihat Actions); harga baru dari belanja via `restock.md` |
| `diarsipkan_at` | `timestamptz`, `null` = aktif | Hanya via `DELETE` |

## Actions

| Action | Perilaku server |
|---|---|
| `POST /api/bahan-baku` | Validasi; insert bahan; insert `riwayat_harga_beli` (`sumber = awal`); jika `stok_saat_ini > 0` insert `stok_mutasi` jenis `stok_awal` (`mutasi-stok.md`); jika `stok_saat_ini < threshold_min` buat alert `stok_menipis` (`alert-stok.md`). Semua dalam satu transaksi DB |
| `PATCH /api/bahan-baku/[id]` | Hanya `nama`, `threshold_min`, `harga_beli_per_satuan`; field lain → 422. Perubahan `threshold_min` menjalankan cek alert `stok_menipis` (`alert-stok.md`) |
| Koreksi `harga_beli_per_satuan` | Untuk salah ketik harga. Satu transaksi DB: update harga, insert `riwayat_harga_beli` (`sumber = koreksi`), hitung ulang `hpp_cached` menu terdampak (`hpp-margin.md`). Response menyertakan daftar menu terdampak (format pratinjau `restock.md`). Tidak mengubah stok |
| `DELETE /api/bahan-baku/[id]` | Bahan masih dipakai `resep_detail` mana pun → 409 `BAHAN_DIPAKAI_RESEP` dengan `detail.menu[]`. Selain itu set `diarsipkan_at = now()`; alert belum dibaca bahan ini ditutup (`sudah_dibaca = true`, `dibaca_at = now()`, `ditutup_otomatis = true`, `alert-stok.md`). Riwayat mutasi tetap tersimpan |
| Nama duplikat | 409 `NAMA_BAHAN_SUDAH_ADA` |

## Riwayat Harga Beli (`riwayat_harga_beli`)

| Field | Aturan |
|---|---|
| `bahan_baku_id`, `outlet_id` | FK |
| `harga_lama`, `harga_baru` | `numeric(12,2)`; `harga_lama = null` untuk `sumber = awal` |
| `sumber` | Enum `awal`, `restock`, `koreksi` |
| `ref_id` | `restock_log.id` untuk `restock`; `null` untuk `awal` dan `koreksi` |
| `user_id`, `created_at` | Pelaku dan waktu |

- Ditulis saat bahan dibuat (`sumber = awal`), oleh restock (`restock.md`), dan koreksi harga. Append-only, kecuali reset harian outlet demo (`akun-demo.md`).
- `GET /api/bahan-baku/[id]` untuk `pemilik` menyertakan 10 entri terakhir.

## Status Stok (turunan, tidak disimpan)

| `status_stok` | Kondisi | Indikator |
|---|---|---|
| `habis` | `stok_saat_ini = 0` | Merah + label "Habis" |
| `menipis` | `0 < stok_saat_ini < threshold_min` | Kuning + label "Menipis" |
| `aman` | `stok_saat_ini >= threshold_min` dan `stok_saat_ini > 0` | Hijau + label "Aman" |

- `threshold_min = 0` → bahan hanya pernah `aman` atau `habis`.

## Aturan Query

- Default hanya bahan dengan `diarsipkan_at IS NULL`; parameter `arsip=true` menampilkan bahan diarsipkan (hanya `pemilik`).
- Default urut `status_stok` (`habis`, `menipis`, `aman`) lalu `nama` ASC. Filter opsional `status_stok`, pencarian `q` (nama, case-insensitive, min 2 karakter).
- Response menyertakan `status_stok` dan `dipakai_di_menu` (jumlah menu yang resepnya memakai bahan).
- Bahan diarsipkan tidak dapat dipilih di resep, restock, atau opname, dan tidak masuk snapshot (`offline-sync.md`).
