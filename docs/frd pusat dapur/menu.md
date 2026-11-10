# FRD: Menu

## Otorisasi

| Action | `pemilik` | `kasir` | `read_only` |
|---|---|---|---|
| Lihat menu | Ya | Tidak (POS memakai `GET /api/sync/snapshot`, `offline-sync.md`) | Ya |
| Tambah, ubah | Ya | Tidak | Tidak |

## Routes

| Route | Tujuan |
|---|---|
| `/menu` | Daftar menu dengan harga jual, HPP, margin |
| `/menu/baru` | Tambah menu (opsional dari template, `resep.md`) |
| `/menu/[id]` | Ubah menu dan resep |
| `GET /api/menu` | Daftar menu |
| `POST /api/menu` | Tambah menu |
| `GET /api/menu/[id]` | Detail menu + resep |
| `PATCH /api/menu/[id]` | Ubah menu |
| `POST /api/menu/[id]/foto` | Minta signed upload URL foto |
| `PATCH /api/menu/[id]/foto` | Konfirmasi upload selesai (`{ path }`), isi `foto_url` |
| `DELETE /api/menu/[id]/foto` | Hapus foto |

## Fields (`menus`)

| Field | Aturan |
|---|---|
| `nama` | 1–100 karakter; unik per outlet (case-insensitive) |
| `harga_jual` | Integer Rupiah 1–10.000.000 |
| `foto_url` | Opsional; read-only, diisi server setelah upload (lihat Foto Menu) |
| `aktif` | Boolean, default `true` |
| `hpp_cached` | Read-only; dihitung server (`hpp-margin.md`); 0 untuk menu tanpa resep |
| `jumlah_terjual_7_hari` | Bukan kolom; dihitung saat query: Σ `qty` transaksi `selesai` dengan `waktu_transaksi` sejak 00:00 enam hari lalu (zona waktu outlet, sama dengan periode `7_hari` di `laporan.md`). Dipakai urutan POS (`pos.md`) |

## Field Turunan di Response (`pemilik` saja)

| Field | Sumber |
|---|---|
| `margin_persen` | `hpp-margin.md`; `null` jika `resep_kosong` |
| `margin_rendah` | `margin_persen < outlets.ambang_margin`; `false` jika `resep_kosong` |
| `resep_kosong` | Menu belum punya `resep_detail` |
| `hpp_belum_lengkap` | `hpp-margin.md` |

## Actions

| Action | Perilaku server |
|---|---|
| `POST /api/menu` | Validasi; payload boleh memuat `resep[]` opsional (format dan aturan sama dengan `PUT /api/menu/[id]/resep`, `resep.md`). Dalam satu transaksi DB: insert menu, insert resep, hitung `hpp_cached` (`hpp-margin.md`; tanpa resep = 0). Form `/menu/baru` mengirim menu dan resep sekaligus agar tidak ada menu aktif tanpa resep karena request kedua gagal |
| `PATCH /api/menu/[id]` | Field yang boleh: `nama`, `harga_jual`, `aktif`. Ubah `harga_jual` tidak mengubah `detail_transaksi` lama (snapshot, `pos.md`) |
| Nama duplikat | 409 `NAMA_MENU_SUDAH_ADA` |

## Foto Menu

| Aspek | Aturan |
|---|---|
| Penyimpanan | Supabase Storage bucket `menu-foto`, path `{outlet_id}/{menu_id}-{timestamp}.webp`. Bucket baca publik; tulis hanya lewat signed upload URL dari server yang memvalidasi prefix `outlet_id` sesi (`auth.md`) |
| Input | JPEG, PNG, atau WebP, maks 5 MB sebelum kompresi |
| Kompresi client | Diubah ke WebP, sisi terpanjang maks 800 px, hasil maks 300 KB; gagal memenuhi → tolak dengan pesan |
| Alur | `POST /api/menu/[id]/foto` → server mengembalikan signed upload URL (berlaku 5 menit) → client upload → client memanggil `PATCH /api/menu/[id]/foto` dengan `path` dari response `POST` → server memvalidasi `path` cocok dengan pola `{outlet_id sesi}/{menu_id}-{timestamp}.webp` untuk menu tersebut (selain itu 422), memverifikasi file ada, lalu mengisi `foto_url`. Path tidak disimpan di kolom terpisah |
| Ganti/hapus | File lama dihapus dari Storage; `DELETE /api/menu/[id]/foto` set `foto_url = null` |
| Offline | Foto di-cache Service Worker (cache-first, maks 50 MB, LRU); tanpa foto → POS menampilkan inisial nama menu |

## Aturan

- Menu tidak dihapus; dinonaktifkan dengan `aktif = false`.
- Menu `aktif = false` tidak tampil di POS dan ditolak di `POST /api/transaksi` online (422 `MENU_TIDAK_AKTIF`). Transaksi offline lihat `offline-sync.md`.
- `margin_rendah = true` ditandai di `/menu` dan `/dashboard` (`laporan.md`).
- Menu tanpa resep boleh `aktif` dan dijual (mis. produk titipan), dengan `hpp_cached = 0` dan tanpa pengurangan stok. Menu ini ditandai "Resep belum diisi" di `/menu` dan tidak ikut `menu_margin_rendah` di laporan, karena margin 100% menyesatkan.
- Penonaktifan berlaku di POS perangkat setelah snapshot berikutnya; transaksi offline yang sudah terjadi tetap diterima (`offline-sync.md`).

## Aturan Query

- Default urut `nama` ASC; opsi urut `margin_persen` ASC atau `jumlah_terjual_7_hari` DESC.
- Filter opsional `aktif`, `margin_rendah`, `resep_kosong`; pencarian `q` (nama, min 2 karakter).
