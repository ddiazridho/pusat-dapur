# FRD: Dashboard Laporan

## Otorisasi

`pemilik` termasuk `read_only`. `kasir`: tidak ada akses.

## Routes

| Route | Tujuan |
|---|---|
| `/dashboard` | Ringkasan laporan, top 5 menu, menu margin rendah, alert (`alert-stok.md`) |
| `GET /api/laporan` | Data laporan per periode |

- `/dashboard` adalah halaman awal pemilik (`auth.md`); laporan terbuka ≤ 3 tap dari beranda.

## Parameter

| Parameter | Nilai | Rentang waktu (zona waktu outlet) |
|---|---|---|
| `periode` | `hari_ini` (default) | 00:00 hari ini s.d. sekarang |
| | `7_hari` | 00:00 enam hari lalu s.d. sekarang |
| | `30_hari` | 00:00 dua puluh sembilan hari lalu s.d. sekarang |

Nilai lain → 422.

Setiap response menyertakan `pembanding`: metrik yang sama untuk periode sebelumnya dengan panjang sama (`hari_ini` → kemarin s.d. jam yang sama; `7_hari` → 7 hari sebelumnya; `30_hari` → 30 hari sebelumnya), dan `perubahan_persen` per metrik (`null` jika pembanding 0).

## Metrik

| Field | Rumus |
|---|---|
| `total_penjualan` | Σ `detail_transaksi.subtotal` |
| `total_hpp` | Σ (`detail_transaksi.hpp_snapshot` × `qty`), dibulatkan ke Rupiah |
| `laba_kotor` | `total_penjualan` − `total_hpp` |
| `margin_kotor_persen` | `laba_kotor` / `total_penjualan` × 100, 1 desimal; `null` jika penjualan 0 |
| `jumlah_transaksi` | Count transaksi |
| `rata_rata_transaksi` | `total_penjualan` / `jumlah_transaksi`, dibulatkan ke Rupiah |
| `per_metode_bayar[]` | Per `tunai`/`qris`: jumlah transaksi dan Σ `total` (cocokkan uang laci dan mutasi QRIS) |
| `per_tipe_pesanan[]` | Per `dine_in`/`takeaway`: jumlah transaksi dan Σ `total` |
| `per_hari[]` | Hanya `7_hari`/`30_hari`: per tanggal `total_penjualan`, `total_hpp`, `laba_kotor` (grafik tren); tanggal tanpa transaksi bernilai 0 |
| `jumlah_dibatalkan` | Count transaksi `dibatalkan` di periode (informasi, tidak masuk metrik lain) |
| `jumlah_transaksi_koreksi_stok` | Count transaksi dengan `koreksi_stok = true` (`pengurangan-stok.md`) |
| `top_menu[]` | Maks 5 menu, dikelompokkan `menu_id`: `menu_id`, `nama_menu` (snapshot terbaru di periode), `qty`, `penjualan`. Urut `qty` DESC, `penjualan` DESC, `nama_menu` ASC |
| `menu_margin_rendah[]` | Menu `aktif = true` dengan `margin_rendah = true` saat ini: `menu_id`, `nama`, `margin_persen`, `harga_jual_minimum` (`hpp-margin.md`); urut `margin_persen` ASC |
| `laba_per_menu[]` | Semua menu terjual di periode: `menu_id`, `nama_menu`, `qty`, `penjualan`, `hpp`, `laba_kotor`; urut `laba_kotor` DESC (menjawab "menu mana paling menguntungkan") |

## Aturan

- Hanya transaksi `status = selesai` yang sudah tersimpan di server dengan `waktu_transaksi` dalam rentang; transaksi `dibatalkan` dan transaksi `pending` di perangkat tidak terhitung.
- Pusat Dapur hanya menyajikan laba kotor karena biaya operasional tidak dicatat (PRD BR-03). Dashboard menampilkan keterangan "Belum dikurangi sewa, gaji, listrik, gas" di bawah angka laba kotor.
- Data laporan di-cache per (`outlet_id`, `periode`) maksimal 60 detik. Cache outlet dihapus oleh transaksi baru, pembatalan, dan semua perubahan yang memengaruhi `menu_margin_rendah[]`: restock, koreksi harga beli, perubahan resep, tambah/ubah menu, penerapan template, dan perubahan `ambang_margin` atau `zona_waktu`.
- Semua angka penjualan dan HPP dari snapshot `detail_transaksi`, bukan nilai `menus` saat ini.
- Label metrik "Laba kotor"; istilah "laba bersih" tidak dipakai di mana pun.
- Tidak ada transaksi di periode → semua metrik 0, `top_menu` kosong.
