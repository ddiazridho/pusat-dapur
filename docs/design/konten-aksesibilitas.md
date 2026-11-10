# Konten, State, dan Aksesibilitas

## 1. Kamus Istilah UI

Istilah teknis/FRD (kolom kiri) **tidak** ditampilkan ke pengguna; gunakan label UI.

| Istilah FRD/kode | Label UI | Catatan |
|---|---|---|
| `transaksi` | Pesanan (di kasir) · Transaksi (di riwayat/laporan) | |
| `restock` | Belanja bahan / Catat belanja | Route tetap `/restock` |
| `stok opname` | Stok opname (subjudul "Hitung stok fisik") | "Opname" boleh setelah pertama kali dijelaskan |
| `threshold_min` | Ingatkan jika stok di bawah · "Min." di daftar | |
| `harga_beli_per_satuan` | Harga beli per ‹satuan› | |
| `hpp_cached` | HPP | Diizinkan PRD |
| `margin_persen` | Margin | Diizinkan PRD |
| `laba_kotor` | Laba kotor | Selalu dengan keterangan "Belum dikurangi sewa, gaji, listrik, gas". **Jangan** pernah "laba bersih"/"untung bersih" |
| `total_hpp` | HPP terjual | |
| `dine_in` / `takeaway` | Makan di tempat / Bawa pulang | Struk & POS (FRD `struk.md`) |
| `tunai` / `qris` | Tunai / QRIS | |
| `koreksi_sync` | Koreksi stok | |
| `stok_tidak_sinkron` | Stok tidak sinkron | Dari FRD |
| `pending` / `synced` / `gagal` | Belum terkirim / Terkirim / Gagal terkirim | |
| `dibuat_offline` | Dibuat offline | |
| `blokir_stok_kurang` | Tolak penjualan saat stok kurang | |
| `ambang_margin` | Batas margin rendah | |
| `read_only` | Akun demo | |
| `diarsipkan` | Diarsipkan | Bukan "dihapus" |
| `aktif = false` (menu) | Tidak dijual / Nonaktif | |
| `snapshot` | Data menu dan stok | |
| `client_tx_id`, `device_id`, `seq` | — | Tidak ditampilkan (kecuali "ID HP" 6 karakter di `/akun`) |
| Satuan | gram · ml · buah · kg · liter | Huruf kecil, setelah angka dengan spasi: "300 gram" |

Larangan kata: "error", "invalid", "sync", "record", "submit", "debit/kredit", "jurnal", "COGS", "inventory".

## 2. Pola Pesan

| Jenis | Pola | Contoh |
|---|---|---|
| Validasi field | Apa yang benar, bukan apa yang salah | "Isi minimal 8 karakter", "Maksimal 3 angka di belakang koma", "Harga jual antara Rp1 dan Rp10.000.000" |
| Wajib diisi | "‹Label› wajib diisi" | "Nama bahan wajib diisi" |
| Error server (4xx) | Tampilkan `error.pesan` dari API (sudah bahasa sehari-hari, NFR-01) | "Stok Telur kurang: butuh 3 buah, sisa 1 buah." |
| Error tak terduga (5xx) | Apa yang terjadi + apa yang aman + aksi | "Gagal menyimpan. Data Anda belum berubah. Coba lagi." [Coba lagi] |
| Jaringan | "Tidak ada internet." + konsekuensi | Kasir: "…Pesanan dicatat di HP dan dikirim otomatis." |
| `READ_ONLY` | "Akun demo hanya bisa melihat, tidak bisa mengubah data." | |
| `AKSES_DITOLAK` | "Halaman ini hanya untuk pemilik warung." | |
| `TIDAK_DITEMUKAN` | "‹Data› tidak ditemukan atau sudah dihapus." | |
| 429 | "Terlalu banyak permintaan. Tunggu ‹n› detik." | |
| Sukses | Hasil konkret, bukan "Berhasil!" | "Belanja tersimpan. Stok Telur ayam jadi 30 buah." |
| Konfirmasi destruktif | Judul pertanyaan + akibat + tombol kata kerja | "Arsipkan Telur ayam?" … [Arsipkan] |

Pemetaan `kode` → pesan default ada di `src/shared/kode-error.ts` (`docs/architecture/api.md`); UI memakai `pesan` server bila ada.

## 3. Format

| Data | Format | Contoh | Fungsi `shared/format.ts` |
|---|---|---|---|
| Rupiah | `Rp` + titik ribuan, tanpa spasi, tanpa desimal | `Rp12.500`, `−Rp3.000` | `rupiah(n)` |
| Rupiah ringkas (sumbu grafik) | `Rp1,2 jt`, `Rp350 rb` | | `rupiahRingkas(n)` |
| Harga per satuan | 2 desimal koma | `Rp14,00 / gram`, `Rp2.200,00 / buah` | `hargaSatuan(s, satuan)` |
| Kuantitas | Titik ribuan, koma desimal, maks 3, nol di belakang dibuang | `12.400 gram`, `0,5 buah`, `1,25 liter` | `kuantitas(s, satuan)` |
| Persen | 1 desimal koma | `67,3%`, `−4,0%` | `persen(n)` |
| Perubahan | Tanda + panah + kata | `▲ 12,4% dibanding kemarin` | `perubahan(p, periode)` |
| Tanggal | `d MMM yyyy` locale id | `2 Nov 2026` | `tanggal(d, tz)` |
| Tanggal + hari | `EEEE, d MMM yyyy` | `Selasa, 10 Nov 2026` | `tanggalPanjang(d, tz)` |
| Jam | `HH.mm` + zona | `12.45 WIB` | `jam(d, tz)` |
| Relatif | < 1 mnt "baru saja", menit, jam, lalu tanggal | `2 mnt lalu`, `3 jam lalu`, `kemarin 21.10` | `relatif(d)` |
| Nomor struk | Monospace, apa adanya | `261110-3FA9C2-014` | — |

Semua tanggal & jam memakai zona waktu outlet (`outlets.zona_waktu`), bukan zona perangkat.

## 4. Matriks State Global

Setiap layar wajib menangani state yang berlaku (✓) dengan pola berikut.

| Permukaan | Memuat | Kosong | Error | Offline | `read_only` |
|---|---|---|---|---|---|
| POS grid | Skeleton (hanya muat pertama) | Empty state menu | — | Tetap berfungsi (banner offline) | Mode simulasi |
| Keranjang/konfirmasi | Tombol "Menyimpan…" | Bar tersembunyi | Dialog 3.3–3.5 kasir | Simpan ke HP | Simulasi |
| Riwayat | Skeleton baris | "Belum ada transaksi hari ini." | Kartu + [Coba lagi] | Hanya item lokal + kartu "Riwayat server perlu internet" | Tanpa aksi batal |
| Struk internal | Skeleton kertas | — | "Struk tidak ditemukan" | Data lokal jika ada; selain itu pesan perlu internet | Tanpa aksi batal |
| Dashboard | Skeleton KPI | KPI 0 + ajakan Buka Kasir | Kartu per blok (blok lain tetap tampil) | Halaman `/offline` | Tombol aksi nonaktif |
| Daftar (bahan/menu/opname/restock) | Skeleton | Empty state + aksi | Kartu + [Coba lagi] | `/offline` | Tombol tambah/ubah nonaktif + tooltip |
| Form | Tombol memuat | — | Error per field / toast 5xx | Tombol simpan nonaktif + "Perlu internet" | Seluruh field `disabled`, tombol simpan diganti teks akun demo |
| Pratinjau restock | Skeleton kartu | "Belum dipakai di menu" | "Pratinjau gagal dimuat" + [Coba lagi]; simpan nonaktif | Simpan nonaktif | Pratinjau tetap bisa dicoba (GET) |
| Lonceng alert | Spinner kecil | "Tidak ada pemberitahuan." | Kartu kecil | Daftar terakhir + label "mungkin belum terbaru" | Tanpa tombol dibaca |

## 5. Aksesibilitas (WCAG 2.1 AA)

### 5.1 Struktur

- Satu `h1` per halaman (judul top bar / page header); seksi `h2`; kartu `h3`.
- Landmark: `header`, `nav` (sidebar & bottom nav dengan `aria-label` "Navigasi utama"), `main`, `aside` (panel keranjang, panel HPP).
- Link "Lewati ke konten" sebagai elemen fokus pertama di shell backoffice.
- `lang="id"` di `<html>`.

### 5.2 Interaksi

- Semua fungsi dapat dicapai keyboard; urutan fokus = urutan visual. Kartu menu POS = `button`; Enter/Spasi menambah.
- Fokus terlihat (ring 2 px `--ring` + offset 2 px), tidak pernah `outline: none` tanpa pengganti.
- Overlay: fokus terkunci, `Esc` menutup, fokus kembali ke pemicu (`komponen.md` §7).
- Target sentuh ≥ 48 × 48 px dengan jarak antar target ≥ 8 px.
- Tidak ada aksi yang hanya lewat gesture (tekan lama di POS punya alternatif: stepper di keranjang).
- Timeout: layar hasil transaksi kembali otomatis setelah 2 menit; tidak ada timeout yang menghapus input pengguna.

### 5.3 Konten

- Kontras: teks ≥ 4,5:1, teks besar & komponen UI ≥ 3:1 (token sudah memenuhi; jangan memakai `Daun 600`/`Daun 400` untuk teks kecil di latar putih).
- Status selalu teks (+ ikon); ikon dekoratif `aria-hidden="true"`.
- Angka dengan tanda: pembaca layar membaca "berkurang 3 buah"/"bertambah 2 buah" (`sr-only`), bukan "minus".
- Gambar menu: `alt="‹nama menu›"`; avatar inisial `aria-hidden` (nama sudah ada sebagai teks).
- Grafik: tabel data `sr-only` setara + ringkasan teks ("Penjualan tertinggi Sabtu, Rp1,4 jt").
- Form: `label` terhubung, error `aria-describedby` + `aria-invalid`, ringkasan error di atas form untuk form > 4 field.
- Perubahan dinamis (`aria-live="polite"`): indikator sinkron, total keranjang, kembalian, alert baru, hasil pratinjau. `assertive` hanya untuk "Pesanan TIDAK tercatat".
- Zoom 200% dan teks besar Android tidak memotong konten (pakai `rem`, hindari tinggi tetap pada teks).

### 5.4 Checklist Review per Layar

1. [ ] Copy sesuai kamus §1 dan pola §2; tidak ada istilah terlarang.
2. [ ] Semua state §4 yang berlaku tersedia.
3. [ ] Kontras & status tidak hanya warna.
4. [ ] Keyboard & fokus overlay benar.
5. [ ] Target sentuh ≥ 48 px di 360 px.
6. [ ] Field biaya tidak muncul untuk kasir.
7. [ ] `read_only`: tombol ubah nonaktif + penjelasan.
8. [ ] Format angka/tanggal lewat `shared/format.ts`, zona outlet.
9. [ ] axe tanpa pelanggaran serius.
