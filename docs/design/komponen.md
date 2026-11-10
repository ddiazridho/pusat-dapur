# Komponen

Basis shadcn/ui (Radix) yang di-*restyle* dengan token `tokens.md`. Komponen khusus Pusat Dapur ditandai **[W]**. Lokasi: `src/components/ui/` (shadcn), `src/components/kasir/`, `src/components/pemilik/`, `src/components/bersama/` [W].

## 1. Tombol

| Varian | Tampilan | Pemakaian |
|---|---|---|
| `cta` [W] | `bg-cta text-cta-foreground`, hover `cta-hover` | Hanya penyelesai transaksi: "Konfirmasi ‹Rp42.000›", "Simpan Belanja", "Simpan Opname" |
| `default` | `bg-primary text-primary-foreground` | Aksi utama lain: Simpan, Tambah, Masuk |
| `outline` | Border `--input`, latar putih | Aksi sekunder: Batal, Cetak, Salin |
| `secondary` | `bg-secondary` | Chip/segmen tidak aktif, aksi tersier |
| `ghost` | Transparan, hover `accent` | Ikon di top bar, aksi baris |
| `destructive` | `bg-destructive` | Batalkan transaksi, Nonaktifkan, Arsipkan (selalu lewat dialog konfirmasi) |
| `link` | Teks `primary`, garis bawah saat hover | Link inline |

| Ukuran | Tinggi | Padding X | Teks |
|---|---|---|---|
| `default` | 48 px | 16 px | `text-base font-semibold` |
| `lg` | 56 px | 20 px | `text-lg font-semibold` (CTA kasir) |
| `icon` | 48 × 48 px | — | Ikon 20 px; **wajib** `aria-label` |

Tidak ada ukuran < 48 px. Tombol penuh lebar (`w-full`) di mobile untuk aksi primer.

**State:** hover (gelap), `active` (`scale-[.98]`), fokus (ring 2 px), `disabled` (opacity 50%, `cursor-not-allowed`, tooltip alasan bila `read_only`), **memuat** (spinner 16 px di kiri, teks berubah: "Menyimpan…", "Mengirim…", lebar tidak berubah, tombol `disabled`, `aria-busy`).

## 2. Field Input

| Properti | Nilai |
|---|---|
| Tinggi | 48 px, `rounded-md`, border `--input`, latar putih, teks 16 px |
| Label | Di atas, `text-sm font-medium`, `for` terhubung; wajib tanpa tanda bintang, opsional diberi "(opsional)" |
| Bantuan | Di bawah, `text-sm text-muted-foreground`, `aria-describedby` |
| Error | Border `--destructive`, ikon `CircleAlert` + teks `text-sm text-status-habis`, `aria-invalid`; setelah submit fokus pindah ke field error pertama |
| Disabled/read-only | Latar `muted`, teks `foreground` (tetap terbaca) |

### 2.1 Input Rupiah [W] (`InputRupiah`)

```
Total harga
┌───────────────────────────────────┐
│ Rp │ 60.000                       │
└───────────────────────────────────┘
```

- Prefix "Rp" statis di dalam field; `inputMode="numeric"`, `pattern="[0-9]*"`.
- Pemisah ribuan titik ditambahkan saat mengetik; kursor tetap di posisi yang benar. Nilai internal integer.
- Menolak karakter selain angka; tempel "Rp 60.000,-" dibersihkan menjadi 60000.
- Batas nilai dari skema Zod bersama (contoh `harga_jual` 1–10.000.000), pesan "Maksimal Rp10.000.000".
- Prop `desimal` (`0` default | `2`). `desimal={2}` dipakai **hanya** untuk harga beli per satuan (`numeric(12,2)`, FRD `bahan-baku.md`): `inputMode="decimal"`, koma sebagai pemisah desimal (titik dinormalisasi), maks 2 digit di belakang koma (ketikan ke-3 diabaikan), tampil `Rp14,50`, dikirim ke API sebagai string `"14.50"`. Varian default (integer) untuk semua uang lain (`harga_jual`, `total_harga`, `uang_diterima`).

### 2.2 Input Kuantitas [W] (`InputKuantitas`)

```
Jumlah
┌──────────────────────────┬────────┐
│ 2,5                      │ kg  ▾  │   ← satuan input (restock)
└──────────────────────────┴────────┘
Takaran per porsi
┌──────────────────────────┬────────┐
│ 200                      │  gram  │   ← satuan statis (resep, opname)
└──────────────────────────┴────────┘
```

- `inputMode="decimal"`; **koma** sebagai pemisah desimal (titik juga diterima dan dinormalisasi). Maks 3 desimal (FRD NFR-01): ketikan desimal ke-4 diabaikan.
- Suffix satuan: label statis, atau segmented `gram | kg`, `ml | liter` pada restock (satu kontrol, tetap dihitung satu field, NFR-07).
- Nilai dikirim ke API sebagai string desimal titik (`"2.5"`).

### 2.3 Lainnya

| Komponen | Catatan |
|---|---|
| `Select` | Untuk enum ≤ 6 pilihan di desktop; di mobile gunakan `Segmented` (≤ 3) atau `RadioList` di sheet |
| `Combobox` [W] (bahan/menu) | Input cari + daftar; di mobile membuka sheet penuh dengan kotak cari ter-fokus. Item: nama + satuan + badge status stok. Item diarsipkan tidak muncul |
| `Segmented` [W] | Grup tombol 48 px, terpilih `bg-primary text-white`, lainnya `secondary`; `role="radiogroup"` |
| `Switch` | Dengan label di kiri dan teks status "Aktif"/"Nonaktif" di kanan (bukan hanya posisi tuas) |
| `Textarea` | Catatan ≤ 200 karakter dengan penghitung "0/200" |
| `Password` | Tombol mata (aria-label "Tampilkan kata sandi") |
| `Search` | Ikon `Search` kiri, tombol hapus `X` kanan; debounce 250 ms; minimal 2 karakter (FRD) |

## 3. Badge Status [W] (`StatusBadge`)

`rounded-sm px-2 py-0.5 text-sm font-medium inline-flex gap-1` + ikon 14 px. Warna dari `tokens.md` §1.3.

| Konteks | Nilai → label |
|---|---|
| Stok bahan | `aman` "Aman" · `menipis` "Menipis" · `habis` "Habis" |
| Menu | "Margin rendah" (habis) · "HPP belum lengkap" (menipis) · "Resep belum diisi" (netral) · "Nonaktif" (netral) |
| Transaksi server | "Dibatalkan" (netral, nomor struk dicoret) · "Dibuat offline" (info) · "Stok dikoreksi" (menipis) |
| Transaksi lokal | "Belum terkirim" (menipis) · "Gagal terkirim" (habis) · "Mengirim…" (info) |
| Alert | "Stok menipis" (menipis) · "Stok tidak sinkron" (habis) |
| Akun kasir | "Aktif" (aman) · "Nonaktif" (netral) |
| Mutasi | Lihat `layar-pemilik.md` §3 |

Badge **jumlah** (lonceng, tab): lingkaran `bg-destructive text-white text-xs` min 20 px; > 99 → "99+"; `aria-label="3 pemberitahuan belum dibaca"`.

## 4. Kartu

| Varian | Spesifikasi |
|---|---|
| `Card` | Putih, border, `rounded-lg`, `shadow-xs`, padding 16 (mobile) / 24 (desktop). Judul `text-lg font-semibold` + aksi kanan (link "Lihat semua ›") |
| `KartuKPI` [W] | Pola `dashboard 1.png`, lihat §6 |
| `KartuFilter` [W] | `shadow-md`, padding 16, lihat `layout-navigasi.md` §5 |
| `KartuInfo` [W] | Latar `status-info-bg`, ikon `Info`, judul `font-semibold`, isi, tombol tutup `X` (aria-label "Tutup") |
| `KartuPeringatan` [W] | Latar `status-menipis-bg` / `status-habis-bg` sesuai tingkat, tidak dapat ditutup |

## 5. Daftar Data: Tabel → Kartu [W] (`DaftarData`)

Satu komponen dengan dua render berdasarkan breakpoint `lg`. Definisi kolom sama; setiap kolom punya prioritas mobile (`judul`, `subjudul`, `kanan`, `meta`, `sembunyi`).

**Desktop (≥ 1024 px)**: pola `produk.png`

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Nama bahan              Stok          Status     Batas min.   Harga/satuan  ⋮ │ ← --table-head, putih, 48 px
├───────────────────────────────────────────────────────────────────────────────┤
│ Telur ayam              4 buah        ⚠ Menipis  10 buah      Rp2.000,00    ⋮ │ 56 px
│ Nasi putih              12.400 gram   ✓ Aman     2.000 gram   Rp14,00       ⋮ │
└───────────────────────────────────────────────────────────────────────────────┘
Menampilkan 17 data
```

- Header: `bg-table-head text-table-head-foreground text-sm font-semibold`, sudut atas `rounded-t-lg`.
- Baris 56 px, border bawah, hover `accent`, seluruh baris klik → detail (link pada sel nama; `⋮` terpisah).
- Angka rata kanan, `tabular-nums`. Kolom urut dapat diklik (ikon `ArrowUpDown`, `aria-sort`).

**Mobile (< 1024 px)**: kartu baris

```
┌──────────────────────────────────────┐
│ Telur ayam                 ⚠ Menipis │ judul · badge
│ Stok 4 buah · Min. 10 buah           │ subjudul
│ Rp2.000,00 / buah    Dipakai 3 menu ›│ meta · kanan
└──────────────────────────────────────┘
```

- Kartu penuh lebar, min 72 px, gap 8 px; seluruh kartu adalah satu link (tanpa tombol bersarang); aksi tambahan di halaman detail.

**State:** memuat (5 skeleton baris/kartu), kosong (§9), error (kartu peringatan + [Coba lagi]), "Tampilkan lebih banyak" (tombol outline penuh lebar, memuat inline).

## 6. Kartu KPI [W]

Pola `dashboard 1.png`, disesuaikan agar angka utama paling menonjol.

```
┌──────────────────────────────┐
│ Laba kotor                   │ text-sm font-medium muted
│ Rp1.245.000                  │ text-2xl/3xl bold tabular
│ ▲ 12,4% dibanding kemarin    │ status-aman / status-habis + ikon
│ Belum dikurangi sewa, gaji,  │ text-sm muted (khusus laba kotor, FRD laporan.md)
│ listrik, gas                 │
└──────────────────────────────┘
```

- Perubahan: `▲` naik (aman), `▼` turun (habis), `—` tidak berubah (netral), "Belum ada pembanding" bila `perubahan_persen = null`. Untuk **HPP**, warna dibalik (naik = habis).
- Label pembanding: `hari_ini` "dibanding kemarin", `7_hari` "dibanding 7 hari sebelumnya", `30_hari` "dibanding 30 hari sebelumnya".
- Mobile: grid 2 kolom, angka `text-2xl`; desktop: 4 kolom, `text-3xl`.

## 7. Overlay

| Komponen | Mobile (< 768) | ≥ 768 | Pemakaian |
|---|---|---|---|
| `Dialog` konfirmasi | Dialog tengah, maks 400 px | Sama | Konfirmasi destruktif, "Harga berubah", "Stok kurang" |
| `Sheet` bawah [W] | Bottom sheet dengan handle, tinggi sesuai isi hingga 90 vh, sudut atas 12 px | Dialog tengah / sheet kanan 480 px | Keranjang (mobile), filter, pilih bahan, "Lainnya", detail alert |
| `Popover` | — (pakai sheet) | Popover | Daftar alert dari lonceng (desktop) |
| `Tooltip` | Tidak dipakai untuk info penting | Hover/focus | Sidebar ciut, alasan tombol disabled |

Aturan: fokus terkunci di overlay, `Esc`/tombol kembali Android menutup (riwayat `history.pushState` untuk sheet), fokus kembali ke pemicu. Dialog destruktif: tombol destruktif di kanan, "Batal" outline di kiri; fokus awal pada "Batal".

## 8. Toast (Sonner)

Posisi: atas-tengah di mobile (tidak menutupi bar keranjang), kanan bawah di desktop. Maks 3. Selalu dengan ikon + teks.

| Jenis | Contoh |
|---|---|
| Sukses | "Belanja bahan tersimpan. Stok Telur ayam jadi 34 buah." |
| Error | "Gagal menyimpan. Periksa internet lalu coba lagi." + [Coba lagi] |
| Info | "Data menu diperbarui." |

Error validasi field **tidak** memakai toast (tampil di field). Transaksi kasir tidak memakai toast sukses (layar hasil sudah menjadi umpan balik).

## 9. Empty State [W]

Pola `dashboard 2.png` diperjelas (teks tegak, ada aksi).

```
            ┌───────┐
            │  📦   │     lingkaran muted 72 px, ikon 40 px
            └───────┘
       Belum ada bahan baku             text-base font-semibold
   Tambahkan bahan yang dipakai di      text-sm muted, maks 2 baris
   resep agar stok terhitung otomatis.
           [■ Tambah Bahan]             opsional, sesuai hak akses
```

Varian "hasil filter kosong": ikon `SearchX`, "Tidak ada yang cocok dengan filter", tombol [Hapus filter].

## 10. Skeleton & Memuat

- Skeleton `bg-muted` `animate-pulse` mengikuti bentuk konten (kartu KPI, baris, kartu menu).
- Muncul hanya jika memuat > 300 ms (hindari kedip).
- Navigasi antarhalaman backoffice memakai `loading.tsx` dengan skeleton halaman.

## 11. Komponen Khusus Kasir [W]

Spesifikasi visual lengkap di `layar-kasir.md`; ringkasan kontrak:

| Komponen | Isi |
|---|---|
| `KartuMenuPos` | Foto 1:1 / avatar inisial, nama (2 baris), harga, badge qty di keranjang (pojok kanan atas, `bg-primary`), label "Stok kurang" (menipis). Seluruh kartu = `button`, aria-label "Tambah ‹Nasi Goreng›, ‹Rp15.000›, ‹2› di keranjang" |
| `BarKeranjang` | Jumlah item + total + tombol "Lihat Pesanan ›"; tersembunyi bila keranjang kosong |
| `BarisKeranjang` | Nama, harga satuan, stepper `[−] 2 [+]` (48 px), subtotal; qty 1 lalu `−` → tanya hapus via ikon tong sampah |
| `PilihanUangCepat` | Chip "Uang pas", lalu pecahan Rp10.000/20.000/50.000/100.000 **di atas total** (FRD `pos.md`), maks 5 chip |
| `IndikatorSinkron` | Titik + teks status koneksi, waktu sinkron relatif, hitungan antrean & gagal, spinner saat mengirim |
| `Struk` | Komponen kertas yang dipakai `/struk`, `/s`, hasil transaksi, simulasi, dan cetak |

## 12. Komponen Grafik (Dashboard saja)

| Komponen | Implementasi |
|---|---|
| `BarTopMenu` | Daftar 5 baris: peringkat, nama, bar horizontal CSS (lebar ∝ qty, `bg-primary/80`), teks "‹24› porsi · ‹Rp360.000›". Tidak memakai library |
| `GrafikTren` | Recharts (lazy, `next/dynamic` ssr false): batang penjualan per hari + garis laba kotor; sumbu Y format "Rp1,2 jt"; tooltip tanggal "Sen, 9 Nov"; legenda berlabel. Tabel data tersembunyi (`sr-only`) sebagai alternatif aksesibel |
| `BagiProporsi` | Dua baris Tunai/QRIS (atau Makan di tempat/Bawa pulang): bar bertumpuk + jumlah transaksi + total Rupiah |
