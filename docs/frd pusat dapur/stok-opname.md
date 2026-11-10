# FRD: Stok Opname

## Otorisasi

`POST /api/opname`: `pemilik` non-`read_only`. Halaman dan `GET` dapat dibaca `read_only`. `kasir`: tidak ada akses.

## Routes

| Route | Tujuan |
|---|---|
| `/opname` | Form input stok fisik per bahan |
| `/opname/[id]` | Detail satu opname |
| `POST /api/opname` | Simpan opname |
| `GET /api/opname` | Riwayat opname |
| `GET /api/opname/[id]` | Detail opname per bahan |

## Payload

| Field | Aturan |
|---|---|
| `items[]` | 1–200 item; `bahan_baku_id` unik dalam array |
| `items[].bahan_baku_id` | UUID bahan di outlet sesi |
| `items[].stok_fisik` | ≥ 0 dan ≤ `MAKS_STOK` (`non-functional.md` NFR-01), dalam `satuan` bahan, maks 3 desimal |
| `items[].alasan` | Opsional, enum `susut`, `tumpah_rusak`, `salah_catat`, `lainnya`; diabaikan jika `selisih = 0` |
| `catatan` | Opsional, 0–200 karakter, untuk seluruh opname |

## Tabel

| Tabel | Field |
|---|---|
| `stok_opname` | `id`, `outlet_id`, `user_id`, `catatan`, `created_at` |
| `stok_opname_detail` | `id`, `outlet_id`, `stok_opname_id`, `bahan_baku_id`, `stok_sistem`, `stok_fisik`, `selisih`, `alasan`, `nilai_selisih` |

`nilai_selisih` = `selisih` × `harga_beli_per_satuan` saat opname, `numeric(18,2)` (nilai Rupiah bahan yang hilang/bertambah).

Alasan opsional agar form tetap cepat; tanpa alasan, selisih tetap tercatat.

`selisih` = `stok_fisik` − `stok_sistem` (negatif = susut/tumpah/salah catat).

## Pratinjau Selisih (client)

- Form menampilkan semua bahan aktif; bahan dengan alert `stok_tidak_sinkron` belum dibaca diletakkan paling atas dan ditandai. Bahan yang tidak diisi tidak ikut payload.
- Sebelum simpan, client menampilkan `selisih` per bahan terhadap `stok_saat_ini` dari `GET /api/bahan-baku`.
- Nilai final `stok_sistem` dan `selisih` diambil server saat simpan dan dikembalikan di response.

## Action `POST /api/opname`

Satu transaksi DB:

| Langkah | Operasi |
|---|---|
| 1 | Lock baris `bahan_baku` terkait, urut `id` ASC |
| 2 | Insert `stok_opname`; insert `stok_opname_detail` per item dengan `stok_sistem` = `stok_saat_ini` saat lock |
| 3 | Untuk `selisih ≠ 0`: set `stok_saat_ini = stok_fisik`; insert `stok_mutasi` jenis `opname`, `jumlah = selisih`, `ref_id = stok_opname.id` |
| 4 | Semua alert `stok_tidak_sinkron` belum dibaca untuk bahan dalam opname (termasuk yang `selisih = 0`): `sudah_dibaca = true`, `dibaca_at = now()`, `ditutup_otomatis = true` (`alert-stok.md`) |
| 5 | Cek alert `stok_menipis` per bahan (`alert-stok.md`) |
| 6 | Commit; response 201 dengan detail per bahan |

## Aturan

- Opname tidak mengubah `harga_beli_per_satuan` dan `hpp_cached`.
- Opname adalah satu-satunya cara mengoreksi stok turun/naik di luar penjualan, restock, dan pembatalan transaksi.
- Bahan diarsipkan → 404.
- Transaksi `pending` di perangkat kasir belum mengurangi stok server, sehingga halaman opname menampilkan saran "Lakukan opname saat semua HP kasir online dan antrean kosong". Transaksi offline yang masuk setelah opname tetap diproses normal (`pengurangan-stok.md`).

## Aturan Query `GET /api/opname`

| Parameter | Aturan |
|---|---|
| Rentang | Maks `MAKS_RIWAYAT_LAPORAN_HARI` ke belakang |
| Urutan | `created_at` DESC |
| Paginasi | `limit` 1–100 (default 50), `cursor` |
| Field | `id`, `created_at`, nama pengguna, jumlah bahan, jumlah bahan dengan selisih, Σ `nilai_selisih` |
