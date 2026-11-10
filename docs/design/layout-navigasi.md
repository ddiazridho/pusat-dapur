# Layout dan Navigasi

Empat shell. Pemilihan shell ditentukan oleh route group (`docs/architecture/struktur-kode.md`): `(publik)`, `(pemilik)`, `(kasir)`, plus `/akun` yang memakai shell sesuai peran.

| Shell | Route | Ringkas |
|---|---|---|
| **Publik/Auth** | `/login`, `/daftar`, `/lupa-password`, `/reset-password`, `/onboarding`, `/offline` | Satu kolom terpusat, logo di atas, tanpa navigasi |
| **Backoffice** | `/dashboard`, `/bahan*`, `/menu*`, `/restock`, `/opname*`, `/pengaturan*`, `/kasir/riwayat`, `/akun` | Mobile: top bar + bottom nav. Desktop: sidebar gelap + top bar |
| **Kasir** | `/kasir` | Layar penuh: status bar + grid + keranjang |
| **Struk** | `/struk/[clientTxId]`, `/s/[token]` | Kertas di tengah; internal punya top bar kembali |

## 1. Shell Backoffice

### 1.1 Mobile (< 1024 px)

```
┌──────────────────────────────────────┐
│ ‹banner global bila ada›             │  lihat §3
├──────────────────────────────────────┤
│ ←  Bahan Baku              🔔³  [⋮]  │  top bar 56 px, sticky
├──────────────────────────────────────┤
│                                      │
│  ‹konten halaman, padding 16 px›     │  scroll
│                                      │
│                                      │
├──────────────────────────────────────┤
│ [■ Catat Belanja ]                   │  aksi primer halaman (opsional), sticky di atas nav
├──────────────────────────────────────┤
│  ⌂       🧾       📦       🍜      ☰  │  bottom nav 56 px + safe area
│ Beranda Kasir   Stok    Menu  Lainnya│
└──────────────────────────────────────┘
```

| Elemen | Spesifikasi |
|---|---|
| Top bar | Kiri: tombol kembali (`ArrowLeft`, aria-label "Kembali") jika bukan halaman tab utama; judul `text-xl font-semibold` 1 baris (ellipsis). Kanan: lonceng alert (pemilik saja) dengan badge jumlah belum dibaca; menu `⋮` untuk aksi sekunder halaman |
| Bottom nav | 5 item, ikon 24 px + label `text-xs font-medium` (wajib ada label). Aktif: ikon & label `--primary`, garis atas 2 px. Tinggi 56 px, latar putih, border atas |
| Aksi primer sticky | Opsional per halaman; tombol penuh lebar di atas bottom nav, latar putih + shadow atas |
| Konten | `pb` cukup agar tidak tertutup bar sticky |

**Bottom nav pemilik**

| Tab | Ikon | Route | Aktif juga untuk |
|---|---|---|---|
| Beranda | `House` | `/dashboard` | — |
| Kasir | `ReceiptText` | `/kasir` | `/kasir/riwayat`, `/struk/*` |
| Stok | `Package` | `/bahan` | `/bahan/*`, `/restock`, `/opname*` |
| Menu | `UtensilsCrossed` | `/menu` | `/menu/*` |
| Lainnya | `Menu` | buka sheet | `/pengaturan*`, `/akun` |

Sheet "Lainnya" (bottom sheet, daftar 56 px/baris, ikon + label + keterangan):

```
┌──────────────────────────────────────┐
│ ▬                                    │
│ Lainnya                              │
│ 🛒 Belanja Bahan                    › │
│    Catat belanja sesuai nota          │
│ 📋 Stok Opname                      › │
│    Hitung stok fisik                  │
│ 🧾 Riwayat Transaksi                › │
│ ⚙  Pengaturan Outlet                › │
│ 👥 Akun Kasir                       › │
│ 👤 Akun Saya                        › │
│ ──────────────────────────────────── │
│ ↪  Keluar                             │
└──────────────────────────────────────┘
```

**Bottom nav kasir** (di `/kasir/riwayat`, `/bahan`, `/akun`):

| Tab | Route |
|---|---|
| Kasir | `/kasir` |
| Riwayat | `/kasir/riwayat` |
| Stok | `/bahan` (baca, tanpa biaya) |
| Akun | `/akun` |

Jumlah ketukan ke laporan (US-12): Beranda **adalah** laporan (`/dashboard`). Dari mana pun: 1 tap (tab Beranda) + 1 tap filter periode = 2 tap.

### 1.2 Desktop (≥ 1024 px)

Mengikuti pola referensi (`dashboard 1.png`, `produk.png`): sidebar gelap kiri, top bar putih, page header dengan breadcrumb di kiri dan aksi di kanan.

```
┌────────────┬─────────────────────────────────────────────────────────────────┐
│  P Pusat Dapur│ ‹banner global bila ada›                                        │
│            ├─────────────────────────────────────────────────────────────────┤
│ ⌂ Beranda  │                         ● Online   🔔³   Bu Sari ▾  (Pemilik)   │ top bar 64
│            ├─────────────────────────────────────────────────────────────────┤
│ PENJUALAN  │ 📦 Stok › Bahan Baku                [ Catat Belanja ] [■ Tambah Bahan] │ page header
│ 🧾 Kasir   ├─────────────────────────────────────────────────────────────────┤
│ 📄 Riwayat │                                                                 │
│            │   ‹konten, maks 1200 px, padding 32›                           │
│ STOK       │                                                                 │
│▌📦 Bahan   │                                                                 │
│ 🛒 Belanja │                                                                 │
│ 📋 Opname  │                                                                 │
│            │                                                                 │
│ MENU       │                                                                 │
│ 🍜 Menu &  │                                                                 │
│    Resep   │                                                                 │
│            │                                                                 │
│ OUTLET     │                                                                 │
│ ⚙ Pengaturan                                                                 │
│ 👥 Akun Kasir                                                                │
│            │                                                                 │
│ « Ciutkan  │                                                                 │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

| Elemen | Spesifikasi |
|---|---|
| Sidebar | Lebar 248 px, `--sidebar`. Logo 64 px tinggi. Judul grup `text-xs uppercase tracking-wider --sidebar-muted`. Item 48 px, ikon 20 + label `text-sm font-medium`. Aktif: latar `--sidebar-active`, garis kiri 3 px `--sidebar-indicator`, teks putih. Tombol "Ciutkan" → 72 px (ikon saja + tooltip; label tetap ada sebagai `aria-label`). Status ciut disimpan di `localStorage` |
| Top bar | 64 px putih, border bawah. Kanan: indikator koneksi (teks + titik), lonceng alert + badge, menu pengguna (nama, peran, "Akun Saya", "Keluar") |
| Page header | 64 px, border bawah. Kiri: ikon modul + breadcrumb (`text-sm`, halaman aktif `font-medium`). Kanan: maks 1 tombol primer + 2 sekunder |
| Konten | Latar `--background`; kartu putih |

**Grup sidebar pemilik**

| Grup | Item | Route |
|---|---|---|
| — | Beranda | `/dashboard` |
| PENJUALAN | Kasir · Riwayat Transaksi | `/kasir` · `/kasir/riwayat` |
| STOK | Bahan Baku · Belanja Bahan · Stok Opname | `/bahan` · `/restock` · `/opname` |
| MENU | Menu & Resep | `/menu` |
| OUTLET | Pengaturan · Akun Kasir | `/pengaturan` · `/pengaturan/kasir` |

Kasir di desktop: sidebar berisi Kasir, Riwayat, Stok Bahan; tanpa grup.

## 2. Shell Kasir (`/kasir`)

Tidak memakai sidebar/bottom nav (D-04). Top bar kasir menampilkan status sinkronisasi (FRD `offline-sync.md` → "Indikator di `/kasir`"). Wireframe lengkap di `layar-kasir.md`.

```
┌──────────────────────────────────────┐
│ ‹banner: simulasi / offline / outlet lain / sesi berakhir›
├──────────────────────────────────────┤
│ ☰  Warung Demo   ● Online · 2 mnt lalu│ 56 px
│                  ⬆ 2 antrean  ✕ 1 gagal│ baris kedua hanya jika > 0
├──────────────────────────────────────┤
│ grid menu                            │
├──────────────────────────────────────┤
│ bar keranjang                        │ 64 px
└──────────────────────────────────────┘
```

- `☰` membuka drawer kiri: nama outlet, nama pengguna & peran, link **Riwayat**, **Stok Bahan**, (pemilik: **Kembali ke Beranda**), **Akun Saya**, **Keluar**.
- Di desktop ≥ 1024 px pemilik tetap melihat shell kasir layar penuh; drawer berisi link kembali ke backoffice.

## 3. Banner Global

Ditumpuk di atas top bar, maksimal 2 terlihat sekaligus (prioritas di bawah, sisanya dirangkum "+1 pemberitahuan"). Tinggi minimal 40 px, teks `text-sm`, ikon kiri, aksi opsional kanan. Tidak bisa ditutup kecuali disebut.

| Prioritas | Banner | Kondisi | Warna | Copy | Aksi |
|---|---|---|---|---|---|
| 1 | Sesi berakhir | 401 saat ada antrean (FRD `pos.md` 4a) | habis | "Sesi berakhir. Masuk lagi untuk mengirim transaksi." | [Masuk] |
| 2 | Outlet lain | Antrean berisi `outlet_id` lain (FRD `offline-sync.md`) | menipis | "Ada transaksi outlet lain di HP ini. Masuk ke akun outlet itu untuk mengirimnya." | — |
| 3 | Offline | `navigator.onLine = false` atau request terakhir gagal jaringan | netral | "Tidak ada internet. Penjualan tetap dicatat dan dikirim otomatis nanti." (kasir) · "Tidak ada internet. Data mungkin belum terbaru." (backoffice) | — |
| 4 | Data lama | Snapshot > 24 jam (FRD) | menipis | "Data menu dan stok belum diperbarui sejak ‹2 Nov, 08.15 WIB›." | — |
| 5 | Akun demo | `read_only = true` (semua halaman) | demo | "Akun demo: Anda bisa melihat semua fitur, tetapi tidak bisa mengubah data." | — |
| 5 | Simulasi | `read_only` di `/kasir` (menggantikan banner demo) | demo | "Mode simulasi: pesanan tidak disimpan." | — |
| 6 | Versi baru | SW baru menunggu (architecture `offline-pwa.md`) | info | "Versi baru Pusat Dapur tersedia." | [Perbarui] (aktif hanya saat keranjang kosong & tidak sinkron) · bisa ditutup |

## 4. Peta Navigasi & Redirect

```
/login ──(kasir)────────────→ /kasir ⇄ /kasir/riwayat → /struk/[id]
   │                              ↑         ↘ /bahan (baca)
   ├─(pemilik, onboarding)──→ /onboarding ──Selesai/Lewati──→ /dashboard
   └─(pemilik)──────────────→ /dashboard
                                 ├→ alert "Stok menipis"      → /restock?bahan=‹id›
                                 ├→ alert "Stok tidak sinkron" → /opname?fokus=‹id›
                                 ├→ menu margin rendah         → /menu/[id]
                                 └→ tombol cepat: Buka Kasir · Catat Belanja · Stok Opname
/bahan → /bahan/[id] (mutasi, harga) → [Catat Belanja] /restock?bahan=‹id›
/menu → /menu/baru (template | manual) → /menu/[id]
/menu/baru (template, bahan baru) → toast + [Catat Belanja] /restock
```

Parameter query (`?bahan=`, `?fokus=`) hanya mempra-isi form; tidak mengubah perilaku server.

## 5. Pola Halaman Backoffice

Urutan blok standar setiap halaman daftar (pola referensi `produk.png`, `inventory-kartu stok.png`):

1. **Page header** (desktop) / top bar (mobile) dengan aksi.
2. **Info/tips** (opsional, kartu `status-info`, dapat ditutup, disimpan per pengguna di `localStorage`).
3. **Ringkasan** (opsional, 2–4 kartu angka).
4. **Kartu filter** (`shadow-md`, rounded-lg): di desktop field berjajar dengan label di atas; di mobile hanya kotak cari + tombol `[⚙ Filter (2)]` yang membuka bottom sheet filter. **Filter diterapkan langsung** (tanpa tombol "Terapkan" seperti referensi) dan disinkronkan ke query URL.
5. **Daftar**: tabel (≥ 1024) / kartu (< 1024), lihat `komponen.md` §5.
6. **Paginasi**: "Tampilkan lebih banyak" (cursor) + teks "Menampilkan ‹50› data".

Halaman form: kontainer 560 px, seksi dengan judul `text-lg`, tombol simpan sticky di bawah pada mobile, di kanan bawah kartu pada desktop.
