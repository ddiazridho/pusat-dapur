# FRD: Kalkulator HPP dan Margin

## Otorisasi

Nilai HPP dan margin hanya dikembalikan ke `pemilik` (termasuk `read_only`). Tidak pernah ke `kasir` (`auth.md`).

## Rumus

| Nilai | Rumus | Penyimpanan |
|---|---|---|
| `hpp_cached` | Σ (`bahan_baku.harga_beli_per_satuan` × `resep_detail.takaran`) untuk semua bahan resep menu | Kolom `menus.hpp_cached`, `numeric(18,2)` |
| `margin_persen` | (`harga_jual` − `hpp_cached`) / `harga_jual` × 100, dibulatkan 1 desimal | Tidak disimpan; dihitung saat response |
| `margin_rendah` | `margin_persen < outlets.ambang_margin` | Tidak disimpan |
| `hpp_belum_lengkap` | Ada bahan di resep dengan `harga_beli_per_satuan = 0` | Tidak disimpan |
| `harga_jual_minimum` | `ceil(hpp_cached / (1 − ambang_margin/100))` dibulatkan ke atas ke kelipatan Rp500; `null` jika `ambang_margin = 100`, `resep_kosong`, atau hasilnya > 10.000.000 (batas `harga_jual`, `menu.md`; UI menampilkan "HPP terlalu tinggi untuk batas harga jual") | Tidak disimpan |

- Menu tanpa resep (`resep_kosong`): `hpp_cached = 0`, `margin_persen = null`, `margin_rendah = false`.
- `hpp_belum_lengkap = true` → margin ditampilkan dengan label "HPP belum lengkap, isi harga bahan lewat restock"; menu tetap dapat `margin_rendah`.
- `harga_jual_minimum` ditampilkan sebagai saran saat `margin_rendah = true`; tidak pernah mengubah `harga_jual` otomatis.
- `margin_persen` boleh negatif (HPP > harga jual).
- Dasar harga = harga beli per satuan **terakhir** (bukan rata-rata).

## Pemicu Hitung Ulang `hpp_cached`

| Pemicu | Menu yang dihitung ulang | Referensi |
|---|---|---|
| `PUT /api/menu/[id]/resep` | Menu tersebut | `resep.md` |
| `POST /api/menu` dengan `resep[]` | Menu yang dibuat | `menu.md` |
| `POST /api/restock` | Semua menu yang resepnya memakai bahan yang di-restock | `restock.md` |
| Koreksi `harga_beli_per_satuan` via `PATCH /api/bahan-baku/[id]` | Semua menu yang resepnya memakai bahan tersebut | `bahan-baku.md` |
| `POST /api/resep-template/[kode]/terapkan` | Menu yang dibuat | `resep.md` |

- Hitung ulang terjadi dalam transaksi DB yang sama dengan pemicunya.
- Stok opname, penjualan, dan perubahan `harga_jual` tidak mengubah `hpp_cached`.
- Perubahan `hpp_cached` tidak mengubah `detail_transaksi.hpp_snapshot` yang sudah ada.

## Kriteria Uji

- Setelah setiap restock, `hpp_cached` setiap menu = Σ(harga beli terakhir × takaran), 100%.
- Contoh: resep 200 g beras @ Rp14,00/g + 1 buah telur @ Rp2.000,00 → `hpp_cached = 4800.00`; `harga_jual = 15000` → `margin_persen = 68.0`.
- Contoh `harga_jual_minimum`: `hpp_cached = 4800.00`, `ambang_margin = 20` → 4800 / 0,8 = 6000 → Rp6.000.
- Hitung ulang memakai satu query agregat per menu terdampak (`idx_resep_bahan`, `non-functional.md` NFR-02), bukan loop per bahan di aplikasi.
