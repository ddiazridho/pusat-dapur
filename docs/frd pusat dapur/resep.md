# FRD: Resep

## Otorisasi

Baca dan ubah: `pemilik`. `read_only`: baca. `kasir`: tidak ada akses langsung; takaran resep hanya dikirim lewat `GET /api/sync/snapshot` untuk cek stok lokal (`offline-sync.md`).

## Routes

| Route | Tujuan |
|---|---|
| `/menu/[id]` | Form resep menu |
| `PUT /api/menu/[id]/resep` | Ganti seluruh resep menu |
| `GET /api/resep-template` | Daftar template resep beserta status kecocokan bahan dengan outlet |
| `POST /api/resep-template/[kode]/terapkan` | Buat menu + bahan yang belum ada + resep dari template dalam satu transaksi |

## Fields (`resep_detail`)

| Field | Aturan |
|---|---|
| `id` | UUID |
| `outlet_id` | FK `outlets.id`, dari sesi (`non-functional.md` NFR-01) |
| `menu_id` | FK `menus.id`, outlet sama |
| `bahan_baku_id` | FK `bahan_baku.id`, outlet sama |
| `takaran` | > 0 dan ≤ 100.000, maks 3 desimal, dalam `satuan` bahan |

Constraint: `UNIQUE (menu_id, bahan_baku_id)`.

## Action `PUT /api/menu/[id]/resep`

Payload: `{ items: [{ bahan_baku_id, takaran }] }`, 0–30 item.

| Langkah | Perilaku |
|---|---|
| 1 | Validasi Zod; `bahan_baku_id` duplikat dalam payload → 422 `BAHAN_DUPLIKAT` |
| 2 | Semua `bahan_baku_id` harus milik outlet sesi dan tidak diarsipkan → jika tidak, 404 |
| 3 | Dalam satu transaksi DB: hapus `resep_detail` lama menu, insert baru, hitung ulang `hpp_cached` (`hpp-margin.md`) |
| 4 | Response 200: resep baru + `hpp_cached`, `margin_persen`, `margin_rendah`, `hpp_belum_lengkap` |

- Mengubah resep tidak mengubah `detail_transaksi` lama dan tidak mengubah stok.
- Form resep menampilkan pratinjau HPP dan margin dari input saat ini sebelum disimpan (dihitung client dari harga bahan yang sudah dimuat; nilai final dari server).
- Perubahan resep berlaku di POS offline setelah snapshot berikutnya (`offline-sync.md`).

## Template Resep

| Aspek | Aturan |
|---|---|
| Sumber | Data statis di kode (bukan tabel), sama untuk semua outlet |
| Isi per template | `nama_menu`, daftar `{ nama_bahan, satuan, takaran }` |
| Identitas | `kode` kebab-case, unik |
| Perubahan | Lewat rilis kode; template tidak memengaruhi menu yang sudah dibuat |

### Daftar Template MVP

Takaran = titik awal porsi warung, selalu dapat diubah pemilik.

| `kode` | `nama_menu` | Bahan (`takaran` `satuan`) |
|---|---|---|
| `nasi-goreng` | Nasi Goreng | Nasi putih 200 gram; Telur ayam 1 buah; Kecap manis 15 ml; Minyak goreng 15 ml; Bawang merah 10 gram; Bawang putih 5 gram; Garam 2 gram |
| `mie-ayam` | Mie Ayam | Mie basah 150 gram; Daging ayam 50 gram; Sawi hijau 30 gram; Kecap manis 10 ml; Minyak goreng 10 ml; Bawang putih 5 gram |
| `mie-goreng-telur` | Mie Goreng Telur | Mi instan 1 buah; Telur ayam 1 buah; Sawi hijau 20 gram; Minyak goreng 10 ml |
| `nasi-telur-dadar` | Nasi Telur Dadar | Nasi putih 200 gram; Telur ayam 2 buah; Minyak goreng 15 ml; Garam 1 gram |
| `es-teh-manis` | Es Teh Manis | Teh celup 1 buah; Gula pasir 20 gram; Es batu 150 gram |
| `teh-manis-panas` | Teh Manis Panas | Teh celup 1 buah; Gula pasir 20 gram |
| `es-jeruk` | Es Jeruk | Jeruk peras 2 buah; Gula pasir 20 gram; Es batu 150 gram |
| `kopi-susu` | Kopi Susu | Kopi bubuk 15 gram; Susu kental manis 30 ml; Gula pasir 10 gram; Es batu 150 gram |

### Pencocokan Bahan

- Bahan template cocok dengan `bahan_baku` outlet jika bahan tidak diarsipkan (`diarsipkan_at IS NULL`), `nama` sama (case-insensitive, spasi di-trim), dan `satuan` sama. Karena nama unik di antara bahan aktif, kandidat selalu maksimal satu.
- Nama sama tetapi `satuan` beda → tidak cocok; ditampilkan sebagai konflik dan pemilik memilih bahan pengganti atau mengganti nama bahan baru.
- `GET /api/resep-template` mengembalikan per bahan: `cocok_dengan` (`bahan_baku_id` atau `null`).

### Action `POST /api/resep-template/[kode]/terapkan`

| Field payload | Aturan |
|---|---|
| `nama` | Opsional, default `nama_menu` template; aturan `menu.md` |
| `harga_jual` | Wajib; aturan `menu.md` |
| `items[]` | 1–30 item. Resep final setelah disesuaikan: `{ bahan_baku_id }` atau `{ nama_bahan_baru, satuan }`, plus `takaran`. Aturan `takaran`, duplikat, dan bahan diarsipkan sama dengan `PUT /api/menu/[id]/resep` |

Satu transaksi DB:

1. Buat bahan baru untuk item `nama_bahan_baru` dengan `stok_saat_ini = 0`, `harga_beli_per_satuan = 0`, `threshold_min = 0` (tanpa mutasi `stok_awal` karena stok 0; dengan `riwayat_harga_beli` `sumber = awal`, `bahan-baku.md`). Aturan nama bahan sama dengan `bahan-baku.md`.
2. Buat menu (`menu.md`).
3. Simpan resep dan hitung `hpp_cached`.
4. Response 201: menu, resep, dan `bahan_baru[]` yang perlu diisi lewat restock.

- Bahan baru berstatus `habis`; jika `blokir_stok_kurang = true`, menu belum bisa dijual sampai bahan di-restock. Pesan sukses menyebut hal ini dan mengarahkan ke `/restock`.
- Menu dengan bahan berharga 0 ditandai `hpp_belum_lengkap` (`hpp-margin.md`).
