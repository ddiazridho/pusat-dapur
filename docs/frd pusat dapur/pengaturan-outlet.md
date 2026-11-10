# FRD: Pengaturan Outlet

## Otorisasi

`GET`: `pemilik` (termasuk `read_only`). `PATCH`: `pemilik` non-`read_only`. Kasir menerima nilai pengaturan hanya lewat `GET /api/sync/snapshot` (`offline-sync.md`).

## Routes

| Route | Tujuan |
|---|---|
| `/pengaturan` | Form pengaturan outlet |
| `GET /api/pengaturan` | Baca pengaturan outlet sesi |
| `PATCH /api/pengaturan` | Ubah sebagian field |

## Fields (`outlets`)

| Field | Tipe | Default | Aturan |
|---|---|---|---|
| `nama_outlet` | text | dari registrasi | 1–100 karakter. Tampil di struk (`struk.md`) |
| `zona_waktu` | enum | `Asia/Jakarta` | `Asia/Jakarta` (WIB), `Asia/Makassar` (WITA), `Asia/Jayapura` (WIT). Dasar batas hari (`non-functional.md` NFR-01) |
| `ambang_margin` | integer (persen) | 20 | 0–100. Dipakai di `hpp-margin.md` |
| `blokir_stok_kurang` | boolean | `true` | Dipakai di `pengurangan-stok.md` |
| `onboarding_selesai` | boolean | `false` | Hanya boleh diubah `false` → `true` (`auth.md`); `true` → `false` → 422 |

## Aturan

- `PATCH` hanya menerima field di atas; field lain → 422.
- Perubahan `nama_outlet` tidak mengubah struk lama yang sudah dikirim, tetapi tampilan `/struk/[clientTxId]` dan `/s/[token]` memakai nama terbaru.
- Perubahan `zona_waktu` berlaku untuk perhitungan berikutnya; `nomor_struk` yang sudah terbit tidak berubah.
- Perubahan `ambang_margin` langsung memengaruhi flag `margin_rendah` di semua response berikutnya; tidak ada data yang dihitung ulang/disimpan.
- Perubahan `blokir_stok_kurang` berlaku di server sejak commit. Perangkat kasir memakai nilai baru setelah snapshot berikutnya (`offline-sync.md`).
- Tidak ada override `blokir_stok_kurang` per transaksi oleh kasir.
- Halaman `/pengaturan` menampilkan penjelasan singkat dampak `blokir_stok_kurang` nonaktif: penjualan tetap tercatat, stok dikoreksi ke 0, alert opname dikirim.
