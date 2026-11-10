# Layar Publik, Auth, dan Onboarding

FRD: `auth.md`, `akun-kasir.md`, `struk.md`. Pola visual: `docs/design-reference/opening.png` (satu kolom terpusat, judul + subjudul, field berlabel, tombol penuh lebar di bawah).

Shell publik: latar `--card` (putih) di mobile; di ≥ 768 px latar `--background` dengan kartu putih 440 px di tengah, padding 32 px. Logo Pusat Dapur di atas (48 px dari tepi atas).

## 1. Masuk (`/login`)

```
┌──────────────────────────────────────┐
│             P Pusat Dapur               │
│                                      │
│        Masuk ke Pusat Dapur             │ text-2xl bold center
│  Catat penjualan, stok, dan untung   │ muted center
│  harian warung Anda.                 │
│                                      │
│ Email atau username                  │
│ [                                  ] │ autocomplete="username", autocapitalize="none"
│ Kata sandi                           │
│ [                              👁  ] │ autocomplete="current-password"
│                        Lupa kata sandi?│ link (pemilik)
│                                      │
│ [■■■■■■■■■■■■■ Masuk ■■■■■■■■■■■■■■] │
│                                      │
│ Belum punya akun? Daftar gratis      │ link → /daftar
│                                      │
│ Kasir: masuk dengan username dari    │ text-sm muted
│ pemilik warung.                      │
└──────────────────────────────────────┘
```

| State | Tampilan |
|---|---|
| Memuat | Tombol "Masuk…" + spinner, field terkunci |
| Gagal | Kartu `habis` di atas form: "Email/username atau kata sandi salah" (FRD; tidak membedakan); fokus ke field kata sandi, isi kata sandi dikosongkan |
| Akun nonaktif | Kartu `habis`: "Akun ini sudah dinonaktifkan pemilik" |
| 429 | "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." (Supabase Auth tidak mengembalikan durasi) |
| Offline | Kartu `netral`: "Perlu internet untuk masuk." Tombol nonaktif |
| `?next=` | Setelah masuk diarahkan ke halaman asal bila sesuai peran |

## 2. Daftar (`/daftar`)

```
┌──────────────────────────────────────┐
│             P Pusat Dapur               │
│       Daftar Pusat Dapur gratis         │
│  Satu akun untuk satu warung.        │
│                                      │
│ Nama Anda                            │
│ [Sari Wulandari                    ] │
│ Nama warung                          │
│ [Warung Bu Sari                    ] │ muncul di struk
│ Email                                │
│ [sari@contoh.com                   ] │ inputMode="email"
│ Kata sandi                           │
│ [                              👁  ] │ "Minimal 8 karakter" (bantuan)
│                                      │
│ [■■■■■■■■■■■■ Daftar ■■■■■■■■■■■■■■] │
│ Sudah punya akun? Masuk              │
└──────────────────────────────────────┘
```

- 409 → error di field email: "Email ini sudah terdaftar. Masuk atau pakai email lain." + link Masuk.
- Sukses → langsung `/onboarding` (tanpa verifikasi email, FRD).

## 3. Lupa & Reset Kata Sandi

`/lupa-password`: satu field Email + [Kirim Link Reset]. Setelah kirim **selalu** menampilkan: "Jika email terdaftar, link reset sudah dikirim. Cek kotak masuk atau folder spam." (FRD). Catatan kecil: "Kasir yang lupa kata sandi: minta pemilik meresetnya."

`/reset-password`: Kata sandi baru + Ulangi kata sandi + [Simpan Kata Sandi]. Link kedaluwarsa/terpakai → empty state "Link sudah tidak berlaku" + [Kirim ulang link]. Sukses → toast "Kata sandi diganti. Perangkat lain sudah dikeluarkan." → redirect sesuai peran.

## 4. Onboarding (`/onboarding`)

FRD `auth.md` → Onboarding. Pola "Langkah selanjutnya" dari `dashboard 1.png` (progress bar + langkah bernomor) digabung dengan form satu kolom `opening.png`. Target PRD: ≥ 5 bahan & ≥ 3 menu ber-resep ≤ 10 menit; target **tidak memblokir**.

### 4.1 Langkah 1: Bahan Baku

```
┌──────────────────────────────────────┐
│ P Pusat Dapur                    Lewati │ link ghost → dialog konfirmasi
├──────────────────────────────────────┤
│ Langkah 1 dari 2                     │
│ ██████████████░░░░░░░░░░░░░░░░░░░░░░ │ progress
│                                      │
│ Bahan apa saja yang Anda pakai?      │ text-2xl bold
│ Isi minimal 5 bahan. Bisa ditambah   │
│ nanti.                               │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Cara cepat                       │ │ KartuInfo
│ │ Pilih menu dari template di      │ │
│ │ langkah 2, bahan akan dibuat     │ │
│ │ otomatis.  [Langsung ke langkah 2 ›]│
│ └──────────────────────────────────┘ │
│                                      │
│ 3 dari 5 bahan ✓                     │ hitungan (✓ saat tercapai)
│ ┌──────────────────────────────────┐ │
│ │ Telur ayam · 30 buah · Rp2.000   │ │ daftar ringkas bahan yang sudah ada
│ │ Nasi putih · 5.000 gram · Rp14   │ │
│ │ Minyak goreng · 2.000 ml · Rp18  │ │
│ └──────────────────────────────────┘ │
│ [ + Tambah Bahan ]                   │ sheet §3.2 layar-pemilik.md
│                                      │
│ [■■■■■■■■■■■ Lanjut ■■■■■■■■■■■■■■■] │
└──────────────────────────────────────┘
```

### 4.2 Langkah 2: Menu & Resep

```
┌──────────────────────────────────────┐
│ Langkah 2 dari 2                     │
│ ████████████████████████████████████ │
│ Menu apa yang Anda jual?             │
│ Isi minimal 3 menu lengkap dengan    │
│ resep agar HPP dan stok terhitung.   │
│                                      │
│ 1 dari 3 menu ✓                      │
│ ✓ Nasi Goreng · Rp15.000 · HPP Rp4.900│
│                                      │
│ Pilih dari template                  │
│ ┌────────────────┐┌────────────────┐ │
│ │ Mie Ayam       ││ Es Teh Manis   │ │ kartu template → form menu (layar-pemilik §5.2)
│ │ 2 bahan baru   ││ 3 bahan baru   │ │ dengan field harga jual difokuskan
│ └────────────────┘└────────────────┘ │
│ [ ✎ Buat menu dari awal ]            │
│                                      │
│ [ ‹ Kembali ]   [■■ Selesai ■■■■■■■] │
└──────────────────────────────────────┘
```

- "Selesai" atau "Lewati" → `PATCH /api/pengaturan { onboarding_selesai: true }` → `/dashboard` dengan toast "Warung siap. Coba catat pesanan pertama di Kasir." + [Buka Kasir].
- Dialog "Lewati": "Lewati pengisian? Anda bisa menambah bahan dan menu kapan saja dari menu Stok dan Menu." [Kembali] [■ Lewati].
- Jika ada bahan baru dari template dengan stok 0: setelah selesai, kartu di dashboard "Isi stok ‹2› bahan baru lewat Catat Belanja agar menu bisa dijual."

## 5. Akun Saya (`/akun`)

```
┌──────────────────────────────────────┐
│ ←  Akun Saya                         │
├──────────────────────────────────────┤
│ (S) Sari Wulandari                   │
│     Pemilik · sari@contoh.com        │ kasir: "Kasir · @dimas"
│     Warung Bu Sari                   │
│                                      │
│ GANTI KATA SANDI                     │
│ Kata sandi lama  [            👁 ]   │
│ Kata sandi baru  [            👁 ]   │
│ [■ Ganti Kata Sandi]                 │
│ Perangkat lain akan dikeluarkan.     │
│                                      │
│ [ ↪ Keluar ]                         │ outline destructive-text; diblokir bila antrean (layar-kasir §7)
│                                      │
│ Pusat Dapur v‹1.0.0› · ID HP ‹3FA9C2›   │ text-xs muted (bantu dukungan)
└──────────────────────────────────────┘
```

`read_only`: form ganti kata sandi disembunyikan, diganti teks "Akun demo tidak bisa mengganti kata sandi."

## 6. Struk Publik (`/s/[token]`)

Untuk pelanggan dari link WhatsApp. Tanpa navigasi aplikasi, tanpa nama kasir, `noindex` (FRD).

```
┌──────────────────────────────────────┐
│    ┌────────────────────────────┐    │ latar --background, kertas putih 380 px
│    │   Warung Bu Sari           │    │
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │ No.  261110-3FA9C2-014     │    │
│    │ 10 Nov 2026 12.45 WIB      │
│    │ Makan di tempat            │    │
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │ Nasi Goreng                │    │
│    │ 2 × 15.000          30.000 │    │
│    │ Es Teh Manis               │    │
│    │ 3 × 4.000           12.000 │    │
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │ Total            Rp42.000  │    │
│    │ Tunai            Rp50.000  │    │
│    │ Kembalian         Rp8.000  │    │
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │      Terima kasih          │    │
│    └────────────────────────────┘    │
│          [ 🖨 Cetak / Simpan PDF ]    │
│   Struk dibuat dengan Pusat Dapur       │ text-xs muted, bukan link
└──────────────────────────────────────┘
```

- Dibatalkan: stempel "DIBATALKAN" + waktu pembatalan.
- Token tidak valid/kedaluwarsa: "Struk tidak ditemukan atau sudah lebih dari 90 hari." (satu pesan untuk keduanya, FRD).

## 7. Cetak Struk (`@media print`)

Dipakai `/struk/[id]`, `/s/[token]`, layar hasil transaksi.

| Aturan | Nilai |
|---|---|
| Elemen tercetak | Hanya komponen `Struk`; semua navigasi, banner, tombol `display: none` |
| Lebar | `@page { margin: 0 }`; kertas `width: 100%; max-width: 80mm`. Font 12 px (58 mm) / 13 px (80 mm) via `@media print and (max-width: 60mm)` |
| Warna | Hitam murni pada putih; badge menjadi teks dalam kurung, mis. "(DIBATALKAN)" |
| Pemisah | Garis putus-putus `border-top: 1px dashed #000` |
| Angka | Rata kanan, `tabular-nums` |
| Hindari | Gambar, latar, shadow |

**Teks WhatsApp** (`teks_struk`, FRD): teks polos, satu item per baris, ditulis oleh `shared/format.ts`:

```
Warung Bu Sari
No. 261110-3FA9C2-014
10 Nov 2026 12.45 WIB · Makan di tempat
--------------------------------
2x Nasi Goreng          30.000
3x Es Teh Manis         12.000
--------------------------------
Total                Rp42.000
Tunai                Rp50.000
Kembalian             Rp8.000
Terima kasih!
Struk: https://‹domain›/s/‹token›
```

Baris link hanya jika transaksi sudah tersinkron.

## 8. Halaman Offline (`/offline`)

Fallback Service Worker untuk halaman pemilik saat tidak ada internet.

```
            ┌───────┐
            │  📶✕  │
            └───────┘
   Halaman ini perlu internet
  Kasir tetap bisa dipakai tanpa
  internet. Penjualan dikirim
  otomatis saat tersambung.
        [■ Buka Kasir ]
        [ Coba lagi ]
```
