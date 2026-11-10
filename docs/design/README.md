# Design — Pusat Dapur

Sumber kebenaran tampilan dan interaksi Pusat Dapur untuk development agent. Semua layar diturunkan dari PRD (`docs/prd-pusat-dapur.md`) dan FRD (`docs/frd pusat dapur/*.md`); arsitektur teknis di `docs/architecture/`. Screenshot `docs/design-reference/` (Pawoon) hanya dipakai sebagai acuan **pola layout dan styling**, bukan sumber fitur, teks, aset, atau warna.

> Prioritas jika bertentangan: **FRD/PRD > docs/design > design-reference**. Elemen di referensi yang tidak ada di FRD (kategori produk, SKU, ekspor, pelanggan, multi-outlet, trial/subscription, live chat) **tidak** dibangun.

## Daftar Dokumen

| File | Isi | Baca saat mengerjakan |
|---|---|---|
| `README.md` | Arah visual, aturan tetap, keputusan desain, peta layar | Selalu |
| [`tokens.md`](tokens.md) | Warna, status semantik, tipografi, spacing, radius, shadow, breakpoint, CSS `@theme` siap pakai | Setup proyek, komponen apa pun |
| [`layout-navigasi.md`](layout-navigasi.md) | App shell per peran & ukuran layar, sidebar, bottom nav, top bar, banner global, peta navigasi | Layout, routing halaman |
| [`komponen.md`](komponen.md) | Spesifikasi komponen + state: tombol, input Rupiah/kuantitas, badge, tabel→kartu, KPI, filter, empty state, dialog, sheet, toast, indikator sync | Komponen bersama |
| [`layar-kasir.md`](layar-kasir.md) | POS, keranjang & pembayaran, hasil transaksi, riwayat, struk, gagal terkirim, mode simulasi, state offline | `/kasir`, `/kasir/riwayat`, `/struk/*` |
| [`layar-pemilik.md`](layar-pemilik.md) | Dashboard & alert, bahan baku, mutasi, menu & resep, template, belanja bahan (restock), opname, pengaturan, akun kasir | Semua halaman pemilik |
| [`layar-publik-auth.md`](layar-publik-auth.md) | Login, daftar, lupa/reset kata sandi, onboarding, akun saya, struk publik, cetak struk, halaman offline | Halaman publik & auth |
| [`konten-aksesibilitas.md`](konten-aksesibilitas.md) | Kamus istilah UI, pola pesan, format angka/tanggal, matriks state global, checklist aksesibilitas | Teks UI, review |

## Arah Visual

**"Backoffice rapi ala POS Indonesia, kasir secepat kalkulator."** Pola backoffice mengikuti design-reference (sidebar gelap berkelompok, page header dengan breadcrumb + aksi di kanan, kartu filter, tabel dengan header gelap, kartu ringkasan dengan pembanding, empty state ikon + teks). Pola itu diadaptasi untuk **mobile-first Android 360 px**, karena referensi hanya desktop.

| Permukaan | Arah |
|---|---|
| Kasir (`/kasir`) | Layar penuh, grid menu bergambar besar, satu tombol utama per langkah, angka besar, tanpa chrome backoffice |
| Backoffice pemilik | Padat tapi lega: kartu putih di kanvas abu sangat muda, header tabel gelap (referensi), status selalu berlabel |
| Publik & auth | Satu kolom terpusat, logo di atas, form ≤ 4 field (referensi `opening.png`) |
| Struk | Kertas: putih, garis putus-putus, angka rata kanan, siap cetak 58/80 mm |
| Warna | Hijau daun (primary, "untung", segar) + oranye bata (CTA bayar/konfirmasi). Merah/kuning hanya untuk status |
| Gerak | Transisi ≤ 150 ms (opacity/translate); tanpa animasi dekoratif; hormati `prefers-reduced-motion` |

## Aturan Tetap (Non-negotiable)

1. **Zero-training.** Setiap layar menjawab satu pertanyaan atau satu tugas. Tidak ada istilah akuntansi selain "HPP", "margin", "laba kotor" (NFR-07).
2. **Maks 3 field input per form transaksi** (POS, belanja bahan) (NFR-07).
3. **Touch target ≥ 48 × 48 px** di semua ukuran layar; input tinggi 48 px, font input 16 px.
4. **Status tidak pernah hanya warna**: selalu label teks (+ ikon bila ada) (NFR-07).
5. **Kontras WCAG 2.1 AA** (teks ≥ 4.5:1, komponen UI ≥ 3:1).
6. **Field biaya** (harga beli, HPP, margin) **tidak pernah dirender** untuk kasir; UI mengikuti respons API, bukan sekadar menyembunyikan (FRD `auth.md`).
7. **Tombol ubah data untuk `read_only` dinonaktifkan** dengan tooltip/teks "Akun demo hanya bisa melihat"; server tetap menolak (FRD `akun-demo.md`).
8. **Bahasa Indonesia sehari-hari**; Rupiah `Rp12.500`; tanggal `2 Nov 2026`; jam 24 jam + `WIB/WITA/WIT` (NFR-07).
9. **Bundle POS ringan**: tidak ada grafik, tabel kompleks, atau date picker di `/kasir` (`docs/architecture/offline-pwa.md`).
10. **Satu tombol primer per layar/sheet.** Aksi lain `outline`/`ghost`.

## Anti-pattern

- Menyalin logo, ikon, ilustrasi, warna cyan, atau teks Pawoon.
- Banner trial/subscription, tombol telepon/"Cara Pakai" melayang, chat bubble.
- Tabel horizontal-scroll di HP untuk data utama (gunakan pola tabel → kartu, `komponen.md`).
- Modal di atas modal; form panjang dalam dialog di HP (gunakan halaman atau bottom sheet penuh).
- Ikon tanpa label pada navigasi utama.
- Teks miring abu-abu untuk empty state (referensi) karena sulit dibaca; gunakan teks normal `muted-foreground`.
- Spinner layar penuh untuk aksi kasir; gunakan state tombol.

## Keputusan Desain

| # | Keputusan | Alasan |
|---|---|---|
| D-01 | Tanpa Stitch; dokumen ini + wireframe ASCII menjadi acuan langsung coding | Keputusan pemilik proyek |
| D-02 | Tema hijau daun + oranye bata, **light only** di MVP (token siap untuk dark) | Keputusan pemilik proyek; kontras AA |
| D-03 | Pemilik di HP: **bottom nav** 4 tab + "Lainnya"; desktop: sidebar gelap (pola referensi) | Satu jempol; laporan ≤ 3 tap (US-12) |
| D-04 | `/kasir` tanpa bottom nav; navigasi kasir lewat top bar | Ruang grid maksimal di layar 640 px |
| D-05 | Default POS: `Makan di tempat` + `Tunai`, reset setiap transaksi baru | Target pesanan 3 item ≤ 15 detik (±6 tap) |
| D-06 | Keranjang di HP = bar bawah + bottom sheet; ≥ 768 px = panel kanan tetap | Pola POS umum, sesuai perangkat warung |
| D-07 | Label menu: "Belanja Bahan" untuk restock, "Stok Opname" + subjudul "Hitung stok fisik" | Bahasa sehari-hari (PRD zero-training) |
| D-08 | Grafik hanya di dashboard; top 5 menu memakai bar CSS, tren memakai Recharts (lazy) | Ringan; grafik tren butuh sumbu |
| D-09 | Font Inter (next/font, 400/500/600/700) dengan angka tabular untuk uang & stok | Keterbacaan angka di layar kecil |
| D-10 | Ikon `lucide-react` (bawaan shadcn), stroke 2, ukuran 20/24 px | Konsisten, tree-shakable |
| D-11 | Nama produk "Pusat Dapur" (wordmark teks, ikon huruf "P" di kotak hijau) | Sesuai PRD; tanpa aset berlisensi |

## Model Konten Demo

Dipakai di semua contoh wireframe dan data seed tampilan (selaras dengan template `resep.md` dan `akun-demo.md`).

| Field | Nilai |
|---|---|
| Outlet | Warung Demo Pusat Dapur (`Asia/Jakarta`, WIB) |
| Pemilik | Bu Sari |
| Kasir | Dimas, Rina |
| Menu | Nasi Goreng Rp15.000 · Mie Ayam Rp13.000 · Mie Goreng Telur Rp12.000 · Nasi Telur Dadar Rp10.000 · Es Teh Manis Rp4.000 · Teh Manis Panas Rp3.000 · Es Jeruk Rp6.000 · Kopi Susu Rp8.000 |
| Bahan | Telur ayam (buah), Nasi putih (gram), Minyak goreng (ml), Gula pasir (gram), … |
| Nomor struk | `261110-3FA9C2-014` |
| Tanggal | 10 Nov 2026 · 12.45 WIB (struk & daftar); "Selasa, 10 Nov 2026" hanya di sapaan dashboard & judul tanggal riwayat |

## Peta Layar

| Route | Peran | Spesifikasi |
|---|---|---|
| `/login`, `/daftar`, `/lupa-password`, `/reset-password` | Publik | `layar-publik-auth.md` |
| `/onboarding` | Pemilik | `layar-publik-auth.md` |
| `/akun` | Semua | `layar-publik-auth.md` |
| `/s/[token]` | Publik | `layar-publik-auth.md` |
| `/offline` | Semua | `layar-publik-auth.md` |
| `/kasir`, `/kasir/riwayat`, `/struk/[clientTxId]` | Pemilik, kasir | `layar-kasir.md` |
| `/dashboard` | Pemilik | `layar-pemilik.md` |
| `/bahan`, `/bahan/[id]` | Pemilik, kasir (terbatas) | `layar-pemilik.md` |
| `/menu`, `/menu/baru`, `/menu/[id]` | Pemilik | `layar-pemilik.md` |
| `/restock` | Pemilik | `layar-pemilik.md` |
| `/opname`, `/opname/[id]` | Pemilik | `layar-pemilik.md` |
| `/pengaturan`, `/pengaturan/kasir` | Pemilik | `layar-pemilik.md` |

## Cara Membaca Wireframe

- Lebar acuan mobile **360 px** (± 40 karakter monospace), desktop **1280 px** (diringkas).
- `[ Teks ]` tombol · `[■ Teks]` tombol primer · `( ) ( • )` radio/segmented · `[ … ▾]` select/combobox · `[_____]` input · `▲▼` indikator naik/turun · `⟳` memuat · `⋮` menu aksi.
- Teks di wireframe adalah **copy final**, kecuali di dalam `‹…›` (data dinamis).
- Ukuran dan spacing mengikuti token di `tokens.md`; wireframe menunjukkan struktur & urutan, bukan pixel.

## Definition of Done UI

Setiap layar dianggap selesai jika:

1. Struktur & copy sesuai wireframe dan FRD terkait.
2. Semua state di matriks (`konten-aksesibilitas.md`) ada: default, memuat, kosong, error, offline (jika relevan), `read_only`.
3. Lolos `@axe-core/playwright` tanpa pelanggaran serius; navigasi keyboard berfungsi.
4. Tampil benar di 360 × 640 (Chrome Android) dan 1280 × 800.
5. Field biaya tidak muncul di sesi kasir (uji kunci respons + snapshot UI).
