# FRD: Restock Bahan Baku

## Otorisasi

`POST /api/restock`: `pemilik` non-`read_only`. Pratinjau dan riwayat (`GET`): `pemilik` termasuk `read_only`. `kasir`: tidak ada akses.

## Routes

| Route | Tujuan |
|---|---|
| `/restock` | Form restock |
| `GET /api/restock/pratinjau` | Pratinjau dampak HPP, tanpa menulis data |
| `POST /api/restock` | Simpan restock |
| `GET /api/restock` | Riwayat restock |

## Fields

| Field | Aturan |
|---|---|
| `bahan_baku_id` | UUID bahan di outlet sesi |
| `jumlah_input` | > 0 dan ≤ 100.000, maks 3 desimal (setelah konversi, `jumlah` ≤ 100.000.000) |
| `satuan_input` | Pilihan pada field jumlah: bahan `gram` → `gram`/`kg`; `ml` → `ml`/`liter`; `buah` → `buah` |
| `total_harga` | Integer Rupiah 0–100.000.000; total yang dibayar untuk seluruh `jumlah_input` |

Form tetap 3 field (bahan, jumlah + satuan, total harga) (`non-functional.md` NFR-07). Pemilik mengisi apa yang tertulis di nota belanja.

## Konversi

| Nilai | Rumus |
|---|---|
| `jumlah` (satuan bahan) | `jumlah_input` × 1000 jika `satuan_input` ∈ {`kg`, `liter`}, selain itu `jumlah_input` |
| `harga_beli_per_satuan` | `total_harga` / `jumlah`, dibulatkan half-up 2 desimal |

- Contoh: 5 kg beras Rp60.000 → `jumlah = 5000` gram, `harga_beli_per_satuan = 12.00`.
- `satuan_input` tidak sesuai `satuan` bahan → 422.
- `harga_beli_per_satuan` hasil > 10.000.000 → 422.
- `stok_saat_ini + jumlah` > `MAKS_STOK` (`non-functional.md` NFR-01) → 422 `STOK_MELEBIHI_BATAS`.

## Pratinjau `GET /api/restock/pratinjau`

Query: `bahan_baku_id`, `jumlah_input`, `satuan_input`, `total_harga` (konversi sama dengan simpan).

Response: `harga_beli_per_satuan_lama`, `harga_beli_per_satuan_baru`, `perubahan_persen` (`null` jika harga lama 0), `stok_sesudah`, dan daftar menu yang resepnya memakai bahan tersebut:

| Field | Isi |
|---|---|
| `menu_id`, `nama` | Menu terdampak |
| `hpp_lama` | `hpp_cached` saat ini |
| `hpp_baru` | HPP dihitung ulang dengan harga baru (`hpp-margin.md`) |
| `margin_persen_lama`, `margin_persen_baru` | Margin sebelum/sesudah |
| `margin_rendah_baru` | `margin_persen_baru < ambang_margin` |

- Tidak ada data yang ditulis. Bahan tidak dipakai resep mana pun → daftar kosong.
- Client wajib menampilkan pratinjau sebelum tombol simpan aktif.

## Action `POST /api/restock`

Satu transaksi DB:

| Langkah | Operasi |
|---|---|
| 1 | Lock baris `bahan_baku` (`FOR UPDATE`) |
| 2 | Insert `restock_log` (`id`, `outlet_id`, `bahan_baku_id`, `user_id`, `jumlah_input`, `satuan_input`, `jumlah`, `total_harga`, `harga_beli_per_satuan`, `harga_beli_sebelumnya`, `created_at`) dan `riwayat_harga_beli` (`sumber = restock`, `bahan-baku.md`) |
| 3 | `stok_saat_ini += jumlah`; `harga_beli_per_satuan` = nilai baru |
| 4 | Insert `stok_mutasi` jenis `restock`, `jumlah = +jumlah`, `ref_id = restock_log.id` (`mutasi-stok.md`) |
| 5 | Hitung ulang `hpp_cached` semua menu yang memakai bahan (`hpp-margin.md`) |
| 5a | Penutupan otomatis alert `stok_menipis` jika status bahan menjadi `aman` (`alert-stok.md`) |
| 6 | Commit; response 201 dengan stok baru dan daftar menu terdampak (format pratinjau) |

- Restock tidak mengubah `detail_transaksi.hpp_snapshot` lama.
- Satu request = satu bahan.
- Bahan diarsipkan → 404.
- `perubahan_persen` > +50% atau < −50% dari harga lama (tidak berlaku jika `perubahan_persen = null`) → pratinjau menampilkan peringatan "Harga berubah jauh, cek lagi angkanya" (tidak memblokir).

## Aturan Query `GET /api/restock`

| Parameter | Aturan |
|---|---|
| `bahan_baku_id` | Filter opsional |
| Rentang | Maks `MAKS_RIWAYAT_LAPORAN_HARI` ke belakang |
| Urutan | `created_at` DESC |
| Paginasi | `limit` 1–100 (default 50), `cursor` |
| Ringkasan | Σ `total_harga` pada rentang (total belanja bahan) |
