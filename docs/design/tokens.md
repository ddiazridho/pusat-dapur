# Design Tokens

Tailwind CSS v4 (konfigurasi di CSS lewat `@theme`, tanpa `tailwind.config.ts`) + variabel CSS bergaya shadcn/ui. Mode: **light only** di MVP; nama token sudah netral agar dark mode bisa ditambah dengan blok `.dark { … }` tanpa mengubah komponen.

## 1. Warna

### 1.1 Palet Dasar

| Nama | Hex | Pemakaian |
|---|---|---|
| Daun 50 | `#F0FDF4` | Latar sorotan sangat lembut |
| Daun 100 | `#DCFCE7` | Latar badge "Aman", baris terpilih |
| Daun 400 | `#4ADE80` | Indikator item aktif di sidebar gelap |
| Daun 600 | `#16A34A` | Ikon status positif di latar putih (bukan teks kecil) |
| **Daun 700** | `#15803D` | **Primary**: tombol utama, link, fokus. Putih di atasnya 5,0:1 |
| Daun 800 | `#166534` | Hover primary, teks status positif |
| Bata 100 | `#FFEDD5` | Latar sorotan CTA |
| **Bata 700** | `#C2410C` | **CTA**: Konfirmasi/Bayar, Simpan Belanja. Putih di atasnya 5,2:1 |
| Bata 800 | `#9A3412` | Hover CTA |
| Arang 950 | `#15201A` | Sidebar desktop |
| Arang 900 | `#1E2B24` | Header tabel (pola referensi) |
| Arang 800 | `#22332A` | Item sidebar aktif/hover |
| Teks | `#18201B` | Teks utama |
| Teks redup | `#5B6660` | Label sekunder, keterangan (6,0:1 di putih) |
| Garis | `#DDE3DF` | Border kartu, pemisah |
| Garis input | `#8C9790` | Border input (≥ 3:1, WCAG 1.4.11) |
| Kanvas | `#F6F7F5` | Latar halaman backoffice |
| Putih | `#FFFFFF` | Kartu, kasir, struk |

### 1.2 Token Semantik (shadcn)

| Token | Nilai | Pemakaian |
|---|---|---|
| `--background` | `#F6F7F5` | Latar halaman backoffice (kasir & struk memakai `--card`) |
| `--foreground` | `#18201B` | Teks utama |
| `--card` / `--card-foreground` | `#FFFFFF` / `#18201B` | Kartu, sheet, dialog |
| `--popover` / `--popover-foreground` | `#FFFFFF` / `#18201B` | Dropdown, popover |
| `--primary` / `--primary-foreground` | `#15803D` / `#FFFFFF` | Tombol utama non-transaksi |
| `--cta` / `--cta-foreground` | `#C2410C` / `#FFFFFF` | Tombol penyelesai transaksi (Konfirmasi, Simpan Belanja, Simpan Opname) |
| `--secondary` / `--secondary-foreground` | `#EEF2EF` / `#18201B` | Tombol sekunder, chip tidak aktif |
| `--muted` / `--muted-foreground` | `#EEF2EF` / `#5B6660` | Latar redup, teks keterangan |
| `--accent` / `--accent-foreground` | `#E7EFE9` / `#18201B` | Hover baris/ghost (istilah shadcn; **bukan** warna oranye) |
| `--destructive` / `--destructive-foreground` | `#B91C1C` / `#FFFFFF` | Batalkan transaksi, nonaktifkan, arsipkan |
| `--border` | `#DDE3DF` | Border umum |
| `--input` | `#8C9790` | Border input |
| `--ring` | `#15803D` | Focus ring 2 px + offset 2 px |
| `--sidebar` / `--sidebar-foreground` | `#15201A` / `#DCE5DF` | Sidebar desktop |
| `--sidebar-muted` | `#93A39A` | Judul grup sidebar ("STOK") |
| `--sidebar-active` / `--sidebar-indicator` | `#22332A` / `#4ADE80` | Item aktif + garis kiri 3 px |
| `--table-head` / `--table-head-foreground` | `#1E2B24` / `#FFFFFF` | Header tabel desktop |

### 1.3 Warna Status

Status **selalu** = warna + label teks (+ ikon). Pasangan teks/latar di bawah memenuhi ≥ 4,5:1.

| Status | Teks | Latar | Ikon (lucide) | Contoh label |
|---|---|---|---|---|
| `aman` / sukses | `#166534` | `#DCFCE7` | `CircleCheck` | "Aman", "Terkirim", "Tersimpan" |
| `menipis` / peringatan | `#92400E` | `#FEF3C7` | `TriangleAlert` | "Menipis", "HPP belum lengkap", "Belum terkirim" |
| `habis` / bahaya | `#991B1B` | `#FEE2E2` | `CircleX` | "Habis", "Margin rendah", "Gagal terkirim", "Stok tidak sinkron" |
| info | `#1E40AF` | `#DBEAFE` | `Info` / `RefreshCw` | "Mengirim…", "Dibuat offline" |
| netral | `#374151` | `#E5E7EB` | `CircleMinus` | "Nonaktif", "Dibatalkan", "Offline", "Resep belum diisi" |
| demo/simulasi | `#5B21B6` | `#EDE9FE` | `Eye` | "Akun demo", "SIMULASI" |

Angka bertanda (selisih, mutasi, perubahan persen): `+` memakai teks `#166534`, `−` memakai `#991B1B`, **selalu** dengan tanda `+`/`−` dan ikon `▲`/`▼` untuk perubahan persen.

## 2. Tipografi

| Token | Nilai |
|---|---|
| Font | `Inter`, fallback `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; `next/font/google` dengan `variable: "--font-inter"` dipasang di `<html>` root layout, subset `latin`, bobot 400/500/600/700, `display: swap` |
| Angka | `font-variant-numeric: tabular-nums` (`tabular-nums`) untuk semua Rupiah, stok, jam, nomor struk |
| Nomor struk / username | `ui-monospace, "SFMono-Regular", Menlo, monospace` |

| Token | Ukuran / line-height | Bobot | Pemakaian |
|---|---|---|---|
| `text-xs` | 12 / 16 | 500 | Hanya meta non-esensial (waktu relatif, catatan kaki). Tidak untuk info penting |
| `text-sm` | 14 / 20 | 400–500 | Label field, sel tabel desktop, badge, keterangan |
| `text-base` | 16 / 24 | 400 | Body, input, item daftar mobile |
| `text-lg` | 18 / 28 | 600 | Judul kartu, nama menu di keranjang |
| `text-xl` | 20 / 28 | 600 | Judul halaman mobile, total keranjang |
| `text-2xl` | 24 / 32 | 700 | Judul halaman desktop, angka KPI mobile |
| `text-3xl` | 30 / 36 | 700 | Angka KPI desktop |
| `text-display` | 36 / 40 | 700 | Total bayar & kembalian di layar hasil transaksi |

- Label field: `text-sm font-medium` Title case ("Nama bahan"), **bukan** huruf kapital semua seperti referensi (lebih mudah dibaca).
- Judul grup sidebar & judul seksi kecil boleh kapital: `text-xs font-semibold tracking-wider uppercase`.
- Panjang baris paragraf maks `65ch`.

## 3. Spacing & Ukuran

Skala Tailwind 4 px.

| Token | Nilai | Pemakaian |
|---|---|---|
| `gap-1`–`gap-2` | 4–8 px | Ikon–teks, badge |
| `p-3` | 12 px | Kartu menu POS, sel tabel |
| `p-4` | 16 px | Padding kartu mobile, gutter halaman mobile |
| `p-6` | 24 px | Padding kartu desktop, jarak antar seksi |
| `gap-8` | 32 px | Jarak antar blok besar desktop |
| `--touch` | 48 px | Tinggi minimum tombol, input, item daftar, tab |
| `--bar` | 56 px | Top bar mobile, bottom nav |
| `--cart-bar` | 64 px | Bar keranjang POS |
| `--topbar-desktop` | 64 px | Top bar desktop |
| `--sidebar-w` | 248 px (diciutkan 72 px) | Sidebar desktop |
| `--cart-panel-w` | 360 px (≥ 768), 400 px (≥ 1280) | Panel keranjang POS |
| Kontainer konten | maks 1200 px, padding 16 (mobile) / 24 (md) / 32 (lg) | Halaman pemilik |
| Kontainer form | maks 560 px | Form tunggal (pengaturan, restock, auth) |
| Kontainer struk | maks 380 px | Struk layar |

Safe area: elemen fixed bawah memakai `padding-bottom: env(safe-area-inset-bottom)`.

## 4. Radius, Border, Shadow

| Token | Nilai | Pemakaian |
|---|---|---|
| `--radius` | 12 px | Kartu, dialog, sheet (atas saja) |
| `rounded-lg` | 12 px | Kartu |
| `rounded-md` | 10 px | Tombol, input, kartu menu POS |
| `rounded-sm` | 6 px | Badge persegi, chip |
| `rounded-full` | — | Avatar inisial, badge jumlah, stepper |
| Border kartu | 1 px `--border` | Semua kartu (referensi: kartu putih dengan border tipis) |
| `shadow-xs` | `0 1px 2px rgb(16 24 20 / .06)` | Kartu default |
| `shadow-md` | `0 4px 12px rgb(16 24 20 / .08)` | Kartu filter (referensi), bar keranjang, popover |
| `shadow-lg` | `0 12px 32px rgb(16 24 20 / .16)` | Dialog, bottom sheet |

## 5. Breakpoint & Mode Input

| Nama | Min-width | Perilaku |
|---|---|---|
| (dasar) | 0 | Target utama 360 × 640. Satu kolom, bottom nav, tabel → kartu |
| `sm` | 640 px | Grid menu POS 4 kolom |
| `md` | 768 px | POS dua panel (grid + keranjang), dialog menggantikan bottom sheet, tabel mulai dipakai untuk daftar ringkas |
| `lg` | 1024 px | Sidebar desktop menggantikan bottom nav; tabel penuh dengan header gelap |
| `xl` | 1280 px | Kontainer maks, panel keranjang 400 px |

Grid menu POS: 2 kolom (< 400 px), 3 kolom (400–639 px), 4 kolom (`sm`), 3 kolom di panel kiri (`md`), 4–5 kolom (`lg`/`xl`).

## 6. Ikon & Gambar

| Aspek | Aturan |
|---|---|
| Set | `lucide-react`, stroke 2 |
| Ukuran | 20 px dalam tombol/daftar, 24 px navigasi, 40 px empty state (di lingkaran `muted` 72 px) |
| Foto menu | Rasio 1:1, `object-cover`, `rounded-md`, `loading="lazy"`, `width`/`height` 400 (file sumber maks 800 px), komponen `FotoMenu` (`<img>`, `frontend-guide.md` §10) |
| Tanpa foto | Avatar inisial (2 huruf pertama kata, mis. "NG"), latar dari 6 warna lembut deterministik berdasarkan `menu_id` (hash), teks `--foreground` |
| Logo | Wordmark "Pusat Dapur" `text-xl font-bold`, kata "Dapur" berwarna `--primary`; ikon app: huruf "P" putih di kotak `--primary` rounded 22% |

## 7. Gerak

| Elemen | Durasi | Easing |
|---|---|---|
| Hover/press | 100 ms | `ease-out` |
| Bottom sheet / dialog masuk | 150 ms | `cubic-bezier(.2,.8,.2,1)` |
| Toast | 150 ms masuk, 4 s tampil (error 6 s) | — |
| Badge qty menu bertambah | Skala 1 → 1.15 → 1 dalam 120 ms | Dimatikan bila `prefers-reduced-motion` |

## 8. CSS Siap Pakai (`src/app/globals.css`)

```css
@import "tailwindcss";

:root {
  --radius: 0.75rem;

  --background: #F6F7F5;
  --foreground: #18201B;
  --card: #FFFFFF;
  --card-foreground: #18201B;
  --popover: #FFFFFF;
  --popover-foreground: #18201B;
  --primary: #15803D;
  --primary-hover: #166534;
  --primary-foreground: #FFFFFF;
  --cta: #C2410C;
  --cta-hover: #9A3412;
  --cta-foreground: #FFFFFF;
  --secondary: #EEF2EF;
  --secondary-foreground: #18201B;
  --muted: #EEF2EF;
  --muted-foreground: #5B6660;
  --accent: #E7EFE9;
  --accent-foreground: #18201B;
  --destructive: #B91C1C;
  --destructive-foreground: #FFFFFF;
  --border: #DDE3DF;
  --input: #8C9790;
  --ring: #15803D;

  --sidebar: #15201A;
  --sidebar-foreground: #DCE5DF;
  --sidebar-muted: #93A39A;
  --sidebar-active: #22332A;
  --sidebar-indicator: #4ADE80;
  --table-head: #1E2B24;
  --table-head-foreground: #FFFFFF;

  --status-aman: #166534;       --status-aman-bg: #DCFCE7;
  --status-menipis: #92400E;    --status-menipis-bg: #FEF3C7;
  --status-habis: #991B1B;      --status-habis-bg: #FEE2E2;
  --status-info: #1E40AF;       --status-info-bg: #DBEAFE;
  --status-netral: #374151;     --status-netral-bg: #E5E7EB;
  --status-demo: #5B21B6;       --status-demo-bg: #EDE9FE;
}

@theme inline {
  --font-sans: var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, monospace;
  --text-display: 2.25rem;
  --text-display--line-height: 2.5rem;

  --radius-sm: calc(var(--radius) - 6px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);

  --spacing-touch: 3rem;
  --spacing-bar: 3.5rem;
  --spacing-cart-bar: 4rem;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-foreground: var(--primary-foreground);
  --color-cta: var(--cta);
  --color-cta-hover: var(--cta-hover);
  --color-cta-foreground: var(--cta-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-muted: var(--sidebar-muted);
  --color-sidebar-active: var(--sidebar-active);
  --color-sidebar-indicator: var(--sidebar-indicator);
  --color-table-head: var(--table-head);
  --color-table-head-foreground: var(--table-head-foreground);
  --color-status-aman: var(--status-aman);
  --color-status-aman-bg: var(--status-aman-bg);
  --color-status-menipis: var(--status-menipis);
  --color-status-menipis-bg: var(--status-menipis-bg);
  --color-status-habis: var(--status-habis);
  --color-status-habis-bg: var(--status-habis-bg);
  --color-status-info: var(--status-info);
  --color-status-info-bg: var(--status-info-bg);
  --color-status-netral: var(--status-netral);
  --color-status-netral-bg: var(--status-netral-bg);
  --color-status-demo: var(--status-demo);
  --color-status-demo-bg: var(--status-demo-bg);
}

@layer base {
  * { @apply border-border; }
  html { -webkit-tap-highlight-color: transparent; }
  body { @apply bg-background text-foreground font-sans antialiased; }
  input, select, textarea { font-size: 16px; } /* cegah zoom otomatis di mobile */
  :focus-visible { @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}
```

Kelas utilitas yang sering dipakai: `bg-cta text-cta-foreground hover:bg-cta-hover`, `bg-status-habis-bg text-status-habis`, `min-h-touch`, `h-bar`, `tabular-nums`.
