# Layar Pemilik

Shell backoffice (`layout-navigasi.md` §1). Semua tombol ubah data nonaktif untuk `read_only` (README aturan 7). Field biaya hanya untuk pemilik.

## 1. Beranda / Dashboard (`/dashboard`)

FRD: `laporan.md`, `alert-stok.md`, `hpp-margin.md`. Pertanyaan utama pemilik (PRD): *untung berapa hari ini, kapan belanja, menu mana paling menguntungkan.* Urutan blok mengikuti urutan pertanyaan itu.

### 1.1 Mobile

```
┌──────────────────────────────────────┐
│ P Pusat Dapur                  🔔³  👤  │ top bar (tab utama: tanpa tombol kembali)
├──────────────────────────────────────┤
│ Halo, Bu Sari                        │ text-xl
│ Selasa, 10 Nov 2026 · diperbarui 12.50 WIB│ muted; jam = waktu client saat respons laporan diterima
│                                      │
│ [ Hari ini ][ 7 hari ][ 30 hari ]    │ Segmented periode (URL ?periode=)
│                                      │
│ ┌────────────────┐┌────────────────┐ │
│ │ Penjualan      ││ Laba kotor     │ │ KartuKPI 2 kolom
│ │ Rp1.014.000    ││ Rp612.300      │ │
│ │ ▲ 8,1% dibanding││ ▲ 12,4% …     │ │
│ │ kemarin        ││ Belum dikurangi│ │
│ │                ││ sewa, gaji,    │ │
│ │                ││ listrik, gas   │ │
│ └────────────────┘└────────────────┘ │
│ ┌────────────────┐┌────────────────┐ │
│ │ Transaksi      ││ HPP terjual    │ │
│ │ 38             ││ Rp401.700      │ │
│ │ Rata-rata      ││ Margin kotor   │ │
│ │ Rp26.684       ││ 60,4%          │ │
│ └────────────────┘└────────────────┘ │
│                                      │
│ PERLU PERHATIAN (3)    Tandai dibaca │ seksi alert, belum dibaca dulu
│ ┌──────────────────────────────────┐ │
│ │ ✕ Stok tidak sinkron             │ │ badge habis
│ │ Stok Telur ayam tidak sinkron,   │ │
│ │ lakukan opname.                  │ │
│ │ [ Mulai Opname ]       [ Dibaca ]│ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ⚠ Stok menipis                   │ │
│ │ Stok Gula pasir tinggal 300 gram,│ │
│ │ segera belanja.                  │ │
│ │ [ Catat Belanja ]      [ Dibaca ]│ │
│ └──────────────────────────────────┘ │
│ Lihat semua pemberitahuan ›          │
│                                      │
│ MARGIN RENDAH (2)                    │ menu_margin_rendah[]
│ ┌──────────────────────────────────┐ │
│ │ Kopi Susu         ✕ Margin 12,5% │ │
│ │ Saran harga minimal Rp9.000    › │ │ → /menu/[id]
│ └──────────────────────────────────┘ │
│                                      │
│ MENU TERLARIS                        │ top_menu[] (BarTopMenu)
│ 1 Nasi Goreng ████████████ 24 porsi  │
│                            Rp360.000 │
│ 2 Es Teh Manis ███████     18 porsi  │
│ …                                    │
│                                      │
│ PALING MENGUNTUNGKAN                 │ laba_per_menu[] (5 teratas)
│ Nasi Goreng   Laba Rp242.400  ›      │
│ Mie Ayam      Laba Rp131.000         │
│ Lihat semua menu ›                   │ → sheet tabel lengkap
│                                      │
│ TREN 7 HARI                          │ hanya 7_hari/30_hari (GrafikTren)
│ ┌──────────────────────────────────┐ │
│ │  ▇ ▅ ▆ ▇ █ ▃ ▆   — laba kotor    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌────────────────┐┌────────────────┐ │
│ │ Cara bayar     ││ Jenis pesanan  │ │ BagiProporsi
│ │ Tunai 24 · Rp612rb│ Makan 27 …   │ │
│ │ QRIS  14 · Rp402rb│ Bungkus 11 … │ │
│ └────────────────┘└────────────────┘ │
│ 2 transaksi dibatalkan · 1 transaksi │ teks muted saja, tanpa link (API riwayat
│ dengan stok dikoreksi                │ tidak punya filter koreksi & rentang)
│                                      │
│ AKSI CEPAT                           │
│ [🧾 Buka Kasir][🛒 Catat Belanja][📋 Opname]│ outline, 3 kolom ikon+label
├──────────────────────────────────────┤
│  ⌂ Beranda  🧾 Kasir  📦 Stok  🍜 Menu  ☰ │
└──────────────────────────────────────┘
```

### 1.2 Desktop

Grid 12 kolom, maks 1200 px:

| Baris | Isi |
|---|---|
| 1 | Sapaan + periode (kiri), aksi cepat (kanan) |
| 2 | 4 KartuKPI (3 kolom masing-masing) |
| 3 | "Perlu perhatian" (6 kol) · "Margin rendah" (6 kol) |
| 4 | Tren (8 kol, hanya 7/30 hari; pada `hari_ini` diganti "Menu terlaris") · Menu terlaris / cara bayar (4 kol) |
| 5 | Tabel "Laba per menu" penuh: Menu · Terjual · Penjualan · HPP · Laba kotor (urut laba DESC) |

### 1.3 State

| State | Tampilan |
|---|---|
| Memuat | Skeleton KPI + daftar |
| Tidak ada transaksi di periode | KPI bernilai Rp0 / 0, "Belum ada penjualan ‹hari ini›." + [Buka Kasir] di tempat Menu terlaris; tren tetap tampil dengan nilai 0 |
| Tidak ada alert | Seksi "Perlu perhatian" diganti satu baris `aman`: "Semua stok aman." |
| Tidak ada menu margin rendah | Seksi disembunyikan |
| Alert baru via Realtime | Kartu muncul di atas dengan animasi masuk, badge lonceng bertambah, `aria-live="polite"` "Pemberitahuan baru: stok Gula pasir menipis" |
| Realtime terputus | Teks kecil muted di header seksi: "Pembaruan otomatis terputus, memeriksa tiap menit" |

## 2. Pemberitahuan (Lonceng)

Mobile: sheet penuh; desktop: popover 400 px. Data `GET /api/alert`.

```
┌──────────────────────────────────────┐
│ Pemberitahuan          [Tandai semua dibaca]│
│ [ Belum dibaca (3) ][ Semua ]        │
│ ┌──────────────────────────────────┐ │
│ │ ✕ Stok tidak sinkron · 12.31     │ │
│ │ Stok Telur ayam tidak sinkron,   │ │
│ │ lakukan opname. Sisa 0 buah      │ │
│ │ [ Mulai Opname ]       [ Dibaca ]│ │
│ └──────────────────────────────────┘ │
│ … (sudah dibaca: teks muted, tanpa tombol;                 │
│    "Ditutup otomatis setelah opname/belanja" bila ditutup_otomatis)│
└──────────────────────────────────────┘
```

Urutan & rentang sesuai FRD (belum dibaca dulu, tidak sinkron sebelum menipis, dibaca maks 30 hari). "Mulai Opname" → `/opname?fokus=‹bahan_id›`; "Catat Belanja" → `/restock?bahan=‹bahan_id›`.

## 3. Bahan Baku

FRD: `bahan-baku.md`, `mutasi-stok.md`.

### 3.1 Daftar (`/bahan`)

```
┌──────────────────────────────────────┐
│ ←  Bahan Baku                   [⋮]  │ ⋮: Lihat bahan diarsipkan
├──────────────────────────────────────┤
│ ┌────────┐┌────────┐┌────────┐       │ ringkasan = chip filter cepat
│ │Habis 1 ││Menipis 2││Aman 14 │       │ tap = filter status_stok
│ └────────┘└────────┘└────────┘       │
│ [🔍 Cari bahan              ]         │
│ ┌──────────────────────────────────┐ │
│ │ Telur ayam               ✕ Habis │ │
│ │ Stok 0 buah · Min. 10 buah       │ │
│ │ Rp2.000,00 / buah · 4 menu      ›│ │ baris harga hanya pemilik
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Gula pasir             ⚠ Menipis │ │
│ │ Stok 300 gram · Min. 500 gram    │ │
│ │ Rp16,00 / gram · 4 menu         ›│ │
│ └──────────────────────────────────┘ │
│ …                                    │
├──────────────────────────────────────┤
│ [ Catat Belanja ]  [■ Tambah Bahan ] │ sticky (pemilik)
├──────────────────────────────────────┤
│  bottom nav                          │
└──────────────────────────────────────┘
```

- Urutan default: Habis → Menipis → Aman, lalu nama (FRD).
- Kasir: tanpa harga dan tanpa tombol aksi. Kartu tetap membuka `/bahan/[id]` versi kasir: hanya kartu stok (stok, batas minimum, status, dipakai di menu), tanpa harga, tanpa tab riwayat, tanpa tombol (FRD matriks akses).
- Desktop: tabel Nama · Stok · Status · Batas minimum · Harga beli/satuan · Dipakai di · ⋮ (Ubah, Riwayat, Catat belanja, Arsipkan).
- Kosong: "Belum ada bahan baku" + [Tambah Bahan] + link "Atau mulai dari template menu".

### 3.2 Tambah Bahan (sheet mobile / dialog desktop)

```
┌──────────────────────────────────────┐
│ Tambah Bahan                         │
│ Nama bahan                           │
│ [Telur ayam                        ] │
│ Satuan                               │
│ [ gram ][ ml ][ buah ]               │ Segmented; keterangan: "Tidak bisa diubah setelah disimpan"
│ Stok sekarang                        │
│ [10                       ] buah     │
│ Ingatkan jika stok di bawah          │
│ [10                       ] buah     │
│ Harga beli per buah                  │ InputRupiah desimal={2}
│ [Rp │ 2.000                        ] │ bantuan: "Isi 0 jika belum tahu; nanti terisi saat catat belanja"
│                                      │
│ [ Batal ]           [■ Simpan Bahan] │
└──────────────────────────────────────┘
```

Harga per satuan menerima 2 desimal untuk gram/ml ("Rp14,50 per gram"); bantuan dinamis: "Contoh: beras Rp14.000/kg = Rp14 per gram". Nama duplikat → error field "Nama bahan sudah ada".

### 3.3 Detail Bahan (`/bahan/[id]`)

```
┌──────────────────────────────────────┐
│ ←  Telur ayam                   [⋮]  │ ⋮: Arsipkan bahan
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Stok sekarang          ✕ Habis   │ │
│ │ 0 buah                           │ │ text-2xl
│ │ Ingatkan di bawah 10 buah        │ │
│ │ Harga beli Rp2.000,00 / buah     │ │
│ │ Dipakai di 4 menu                │ │ jumlah saja (`dipakai_di_menu`, FRD)
│ │                                  │ │
│ │ [ Ubah ]        [■ Catat Belanja]│ │
│ └──────────────────────────────────┘ │
│ [ Riwayat stok ][ Riwayat harga ]    │ tab
│ [⚙ Filter jenis]  10 Okt – 10 Nov    │
│ ┌──────────────────────────────────┐ │
│ │ 10 Nov 12.31 · Penjualan         │ │
│ │ 261110-3FA9C2-014 · Dimas        │ │
│ │ − 3 buah            Sisa 0 buah  │ │ jumlah merah dg tanda
│ ├──────────────────────────────────┤ │
│ │ 10 Nov 12.31 · Koreksi stok      │ │
│ │ 261110-3FA9C2-014 · Dimas        │ │
│ │ + 2 buah            Sisa 3 buah  │ │
│ ├──────────────────────────────────┤ │
│ │ 9 Nov 07.10 · Belanja            │ │
│ │ Belanja Rp60.000 · Bu Sari       │ │
│ │ + 30 buah           Sisa 31 buah │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Label jenis mutasi** (bahasa sehari-hari):

| `jenis` | Label | Ikon |
|---|---|---|
| `stok_awal` | Stok awal | `PackagePlus` |
| `penjualan` | Penjualan | `ShoppingCart` |
| `restock` | Belanja | `ShoppingBag` |
| `opname` | Opname | `ClipboardCheck` |
| `koreksi_sync` | Koreksi stok | `RefreshCcw` |
| `pembatalan` | Transaksi dibatalkan | `Undo2` |

Desktop: tabel ala "Kartu Stok" referensi: Waktu · Jenis · Rujukan · Oleh · Jumlah · Stok berjalan. `ref_label` struk menjadi link ke `/struk/[clientTxId]`.

**Riwayat harga**: 10 entri terakhir: tanggal, sumber ("Awal"/"Belanja"/"Koreksi"), `Rp2.000,00 → Rp2.200,00`, perubahan %, oleh.

**Ubah bahan** (sheet): Nama, Ingatkan jika di bawah, Harga beli per satuan (`InputRupiah desimal={2}`). Mengubah harga memunculkan kartu `menipis`: "Ubah harga hanya untuk memperbaiki salah ketik. Untuk harga belanja baru, pakai Catat Belanja." Hasil simpan menampilkan daftar menu terdampak (format pratinjau §6).

**Arsipkan** (dialog destruktif): "Arsipkan Telur ayam? Bahan tidak muncul lagi di resep, belanja, dan opname. Riwayat tetap tersimpan." Error 409 → dialog "Masih dipakai di resep: Nasi Goreng, Mie Goreng Telur. Hapus dari resep dulu." dengan link ke tiap menu.

## 4. Menu (`/menu`)

FRD: `menu.md`, `hpp-margin.md`.

```
┌──────────────────────────────────────┐
│ ←  Menu & Resep                      │
├──────────────────────────────────────┤
│ [🔍 Cari menu ] [⚙ Filter (1)]       │ filter: Aktif/Nonaktif, Margin rendah, Resep belum diisi; urut: Nama/Margin/Terlaris
│ ┌──────────────────────────────────┐ │
│ │ (foto) Kopi Susu                 │ │
│ │        Jual Rp8.000 · HPP Rp7.000│ │
│ │        ✕ Margin rendah 12,5%    ›│ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ (NG)   Nasi Goreng               │ │
│ │        Jual Rp15.000 · HPP Rp4.900│ │
│ │        Margin 67,3%             ›│ │ teks netral bila aman
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ (KR)   Kerupuk titipan           │ │
│ │        Jual Rp2.000              │ │
│ │        ○ Resep belum diisi      ›│ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [■■■■■■■■■ Tambah Menu ■■■■■■■■■■■■] │
└──────────────────────────────────────┘
```

- "HPP belum lengkap" ditampilkan sebagai badge `menipis` tambahan (FRD).
- Menu nonaktif: avatar & teks redup + badge "Nonaktif".
- Desktop: tabel Menu (foto+nama) · Harga jual · HPP · Margin · Status · Terjual 7 hari · ⋮.

## 5. Tambah / Ubah Menu & Resep

FRD: `menu.md`, `resep.md`.

### 5.1 `/menu/baru`: Pilih Cara

```
┌──────────────────────────────────────┐
│ ←  Tambah Menu                       │
├──────────────────────────────────────┤
│ Mulai dari template                  │
│ Resep umum warung, takaran bisa diubah.│
│ ┌────────────────┐┌────────────────┐ │
│ │ Nasi Goreng    ││ Mie Ayam       │ │ kartu template
│ │ 7 bahan        ││ 6 bahan        │ │
│ │ ✓ 5 cocok · 2 baru│ ✓ 6 cocok    │ │ status kecocokan
│ └────────────────┘└────────────────┘ │
│ … 8 template                         │
│                                      │
│ ─────────────── atau ─────────────── │
│ [ ✎ Buat dari awal ]                 │
└──────────────────────────────────────┘
```

Memilih template → form §5.2 terisi (nama, bahan, takaran); bahan template diberi label: "✓ Cocok: Telur ayam (stok 10 buah)", "+ Bahan baru (stok 0)", atau "⚠ Satuan beda: Gula pasir (ml) — pilih bahan lain atau ganti nama" (FRD konflik satuan).

### 5.2 Form Menu + Resep

```
┌──────────────────────────────────────┐
│ ←  Nasi Goreng                  [⋮]  │ ⋮ (ubah): Nonaktifkan menu
├──────────────────────────────────────┤
│ INFO MENU                            │
│ ┌──────┐ Foto (opsional)             │
│ │  NG  │ [ Pilih Foto ]  [Hapus]     │ kompresi client, maks 5 MB sebelum kompres
│ └──────┘ JPG/PNG/WebP                │
│ Nama menu                            │
│ [Nasi Goreng                       ] │
│ Harga jual                           │
│ [Rp │ 15.000                       ] │
│ Dijual di kasir        [● Aktif ]    │ Switch (ubah saja)
│                                      │
│ RESEP PER PORSI                      │
│ ┌──────────────────────────────────┐ │
│ │ Nasi putih             [🗑]       │ │ baris resep
│ │ [200          ] gram   Rp2.800   │ │ biaya baris (pemilik)
│ ├──────────────────────────────────┤ │
│ │ Telur ayam             [🗑]       │ │
│ │ [1            ] buah   Rp2.000   │ │
│ ├──────────────────────────────────┤ │
│ │ Kecap manis  ⚠ harga belum diisi │ │
│ │ [15           ] ml     Rp0       │ │
│ └──────────────────────────────────┘ │
│ [ + Tambah bahan ]                   │ Combobox bahan (yang sudah dipakai tidak muncul)
│                                      │
├──────────────────────────────────────┤ panel HPP sticky (mobile: di atas tombol)
│ HPP Rp4.900 · Margin 67,3%           │
│ ⚠ HPP belum lengkap — isi harga bahan│ bila ada harga 0
│   lewat Catat Belanja                │
│ [■■■■■■■■■■ Simpan Menu ■■■■■■■■■■■] │
└──────────────────────────────────────┘
```

| Aturan | Spesifikasi |
|---|---|
| Pratinjau HPP | Dihitung client dari harga bahan termuat (FRD); diganti nilai server setelah simpan |
| Margin rendah | Panel berlatar `status-habis-bg`: "Margin 12,5% di bawah batas 20%. Saran harga minimal Rp9.000." + [Pakai Rp9.000] (mengisi field harga, tidak otomatis) |
| Resep kosong | Panel: "Tanpa resep, stok tidak berkurang saat terjual. Cocok untuk produk titipan." |
| Validasi | Takaran > 0, maks 3 desimal; bahan duplikat tidak mungkin (combobox menyembunyikan) |
| Satu request | Menu baru + resep dikirim sekaligus (FRD) |
| Dari template dengan bahan baru | Toast sukses + kartu: "Menu tersimpan. 2 bahan baru (Kecap manis, Garam) masih stok 0, jadi menu belum bisa dijual. [Catat Belanja]" (FRD) |
| Desktop | Dua kolom: form (kiri 7 kol), panel HPP sticky (kanan 5 kol) |

## 6. Belanja Bahan (`/restock`)

FRD: `restock.md`. **Tepat 3 field** (NFR-07).

```
┌──────────────────────────────────────┐
│ ←  Belanja Bahan                     │
├──────────────────────────────────────┤
│ Catat sesuai nota belanja.           │
│                                      │
│ 1. Bahan                             │
│ [Telur ayam · stok 0 buah        ▾ ] │ Combobox
│ 2. Jumlah dibeli                     │
│ [30                     ] buah       │ (gram→ [gram|kg], ml→ [ml|liter])
│ 3. Total harga di nota               │
│ [Rp │ 66.000                       ] │
│                                      │
│ ┌──────────────────────────────────┐ │ pratinjau (wajib muncul sebelum simpan)
│ │ Harga per buah                   │ │
│ │ Rp2.000,00 → Rp2.200,00  ▲ 10,0% │ │
│ │ Stok jadi 30 buah                │ │
│ │ ──────────────────────────────── │ │
│ │ Dampak ke 4 menu                 │ │
│ │ Nasi Goreng                      │ │
│ │ HPP Rp4.900 → Rp5.100            │ │
│ │ Margin 67,3% → 66,0%             │ │
│ │ Mie Goreng Telur                 │ │
│ │ HPP Rp5.600 → Rp5.800            │ │
│ │ Margin 53,3% → 51,7%             │ │
│ │ Nasi Telur Dadar                 │ │
│ │ HPP Rp8.600 → Rp9.000            │ │
│ │ Margin 14,0% → 10,0% ✕ Margin rendah│
│ └──────────────────────────────────┘ │
│                                      │
│ [■■■■■■■■■ Simpan Belanja ■■■■■■■■■] │ cta; nonaktif sampai pratinjau termuat
│                                      │
│ RIWAYAT BELANJA        Total Rp1,2 jt│ GET /api/restock, ringkasan Σ
│ 9 Nov · Telur ayam · 30 buah · Rp60.000│
│ …                                    │
└──────────────────────────────────────┘
```

| Aturan | Spesifikasi |
|---|---|
| Pratinjau | Diperbarui otomatis 400 ms setelah ketiga field valid (debounce) |
| Perubahan > ±50% | Kartu `menipis` di atas pratinjau: "Harga berubah jauh, cek lagi angkanya." (tidak memblokir) |
| Harga lama 0 | "Harga per buah: Rp2.200,00 (pertama kali diisi)" tanpa persen |
| Tidak dipakai menu | "Bahan ini belum dipakai di resep menu mana pun." |
| `?bahan=` | Field bahan terisi; fokus ke Jumlah |
| Sukses | Toast "Belanja tersimpan. Stok Telur ayam jadi 30 buah." Form dikosongkan kecuali bahan, fokus ke Bahan untuk belanja berikutnya |
| Desktop | Form (kiri 5 kol) + pratinjau (kanan 7 kol); riwayat di bawah sebagai tabel |

## 7. Stok Opname

FRD: `stok-opname.md`.

### 7.1 Form (`/opname`)

```
┌──────────────────────────────────────┐
│ ←  Stok Opname                       │
│    Hitung stok fisik                 │
├──────────────────────────────────────┤
│ ℹ Lakukan opname saat semua HP kasir │ KartuInfo (FRD)
│   online dan antrean kosong.         │
│ [🔍 Cari bahan ]                      │
│                                      │
│ PERLU DICEK (1)                      │ bahan ber-alert stok_tidak_sinkron
│ ┌──────────────────────────────────┐ │
│ │ Telur ayam    ✕ Stok tidak sinkron│ │
│ │ Di sistem 0 buah                 │ │
│ │ Hitungan fisik [12        ] buah │ │
│ │ Selisih + 12 buah                │ │ hijau/merah + tanda
│ │ Alasan [Salah catat ▾] (opsional)│ │ hanya jika selisih ≠ 0
│ └──────────────────────────────────┘ │
│ SEMUA BAHAN                          │
│ ┌──────────────────────────────────┐ │
│ │ Gula pasir                       │ │
│ │ Di sistem 300 gram               │ │
│ │ Hitungan fisik [250       ] gram │ │
│ │ Selisih − 50 gram                │ │
│ │ Alasan [Susut ▾]                 │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Minyak goreng                    │ │
│ │ Di sistem 1.850 ml               │ │
│ │ Hitungan fisik [          ] ml   │ │ kosong = tidak ikut
│ └──────────────────────────────────┘ │
│ Catatan (opsional) [______] 0/200    │
├──────────────────────────────────────┤
│ 2 bahan diisi · 2 ada selisih        │ sticky
│ [■■■■■■■■ Tinjau & Simpan ■■■■■■■■■] │ cta; nonaktif jika 0 diisi
└──────────────────────────────────────┘
```

- `?fokus=‹id›` menggulir ke bahan & memfokuskan input.
- Draf input disimpan di `sessionStorage` agar tidak hilang saat berpindah tab.
- Desktop: tabel Bahan · Di sistem · Hitungan fisik (input) · Selisih · Alasan.

**Dialog tinjau**:

```
┌──────────────────────────────────────┐
│ Simpan hasil opname?                 │
│ Telur ayam    0 → 12 buah   + 12     │
│ Gula pasir  300 → 250 gram  − 50     │
│ Stok di sistem akan diganti dengan   │
│ hitungan fisik.                      │
│ [ Periksa Lagi ]  [■ Simpan Opname]  │
└──────────────────────────────────────┘
```

Respons server (nilai final `stok_sistem` bisa berbeda bila ada penjualan saat mengisi) → halaman `/opname/[id]` dengan toast "Opname tersimpan".

### 7.2 Riwayat & Detail

- `/opname` punya dua tab: "Hitung Stok" (form §7.1, default) dan "Riwayat": daftar tanggal · oleh · "‹5› bahan · ‹2› selisih" · nilai selisih Rupiah (merah bila negatif).
- `/opname/[id]`: header (tanggal, oleh, catatan) + tabel/kartu per bahan: di sistem, fisik, selisih, alasan, nilai selisih; total nilai selisih di bawah ("Nilai bahan hilang Rp12.400").

## 8. Pengaturan Outlet (`/pengaturan`)

FRD: `pengaturan-outlet.md`. Kontainer 560 px.

```
┌──────────────────────────────────────┐
│ ←  Pengaturan Outlet                 │
├──────────────────────────────────────┤
│ Nama outlet                          │
│ [Warung Demo Pusat Dapur              ] │
│ Muncul di struk.                     │
│                                      │
│ Zona waktu                           │
│ ( • ) WIB  (   ) WITA  (   ) WIT     │ Segmented
│ Dipakai untuk batas "hari ini" dan jam struk.│
│                                      │
│ Batas margin rendah                  │
│ [20       ] %                        │
│ Menu dengan margin di bawah angka ini ditandai merah.│
│                                      │
│ Tolak penjualan saat stok kurang  [● Aktif]│ Switch
│ ┌──────────────────────────────────┐ │
│ │ Jika dimatikan: penjualan tetap  │ │ KartuInfo selalu tampil (FRD)
│ │ tercatat, stok dikoreksi ke 0,   │ │
│ │ dan Anda mendapat pemberitahuan  │ │
│ │ untuk opname. Berlaku di HP kasir│ │
│ │ setelah tersambung internet.     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [■■■■■■■■■■ Simpan ■■■■■■■■■■■■■■■■] │ aktif hanya jika ada perubahan
└──────────────────────────────────────┘
```

Mematikan switch membuka dialog konfirmasi berisi teks yang sama. Simpan mengirim hanya field yang berubah (`PATCH`).

## 9. Akun Kasir (`/pengaturan/kasir`)

FRD: `akun-kasir.md`.

```
┌──────────────────────────────────────┐
│ ←  Akun Kasir                        │
├──────────────────────────────────────┤
│ 2 dari 3 kasir aktif                 │ kuota (gratis)
│ ┌──────────────────────────────────┐ │
│ │ (D) Dimas                ✓ Aktif │ │
│ │     @dimas · Masuk 10 Nov 07.02  │ │
│ │ [ Ubah ] [ Reset Sandi ] [ ⋮ ]   │ │ ⋮: Nonaktifkan
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ (R) Rina                 ✓ Aktif │ │
│ │     @rina · Belum pernah masuk   │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ (A) Andi              ○ Nonaktif │ │
│ │     @andi        [ Aktifkan ]    │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [■■■■■■■■■ Tambah Kasir ■■■■■■■■■■■] │ nonaktif + teks "Kuota 3 kasir aktif penuh" bila penuh
└──────────────────────────────────────┘
```

**Tambah Kasir** (sheet): Nama · Username (prefix "@", huruf kecil/angka/titik/garis bawah, 3–30, bantuan "Dipakai untuk masuk. Tidak bisa diubah.") · Kata sandi (8–72, tombol [Buat acak]). Sukses → kartu ringkasan sekali tampil:

```
┌──────────────────────────────────────┐
│ ✓ Akun kasir dibuat                  │
│ Berikan ke kasir:                    │
│ Username   dimas                     │
│ Kata sandi ••••••••  [Tampilkan]     │
│ [ 📋 Salin ] [ 💬 Kirim via WhatsApp ]│
│ Kata sandi tidak bisa dilihat lagi.  │
└──────────────────────────────────────┘
```

**Reset sandi**: dialog input sandi baru + catatan "Kasir akan keluar dari semua HP." **Nonaktifkan**: dialog destruktif "Dimas tidak bisa masuk lagi. Transaksi yang belum terkirim di HP Dimas tetap bisa dikirim lewat akun lain di outlet ini."
