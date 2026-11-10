# Layar Kasir

FRD: `pos.md`, `offline-sync.md`, `pengurangan-stok.md`, `struk.md`, `pembatalan-transaksi.md`, `akun-demo.md`. Alur teknis: `docs/architecture/offline-pwa.md`.

Target PRD: **pesanan 3 item ≤ 15 detik oleh kasir baru tanpa pelatihan**. Jalur tercepat (tunai, uang pas): tap menu ×3 → "Lihat Pesanan" → "Uang pas" → "Konfirmasi" = **6 tap**. Default `Makan di tempat` + `Tunai` (D-05).

Semua layar ini dirender dari IndexedDB (snapshot + antrean); tidak ada layar yang menunggu jaringan untuk tampil.

## 1. POS: Grid Menu (`/kasir`)

### 1.1 Mobile 360 px

```
┌──────────────────────────────────────┐
│ ☰  Warung Demo Pusat Dapur              │
│    ● Online · sinkron 2 mnt lalu     │ IndikatorSinkron
├──────────────────────────────────────┤
│ [🔍 Cari menu                      ] │ hanya jika menu > 12 (FRD)
├──────────────────────────────────────┤
│ ┌─────────────────┐┌─────────────────┐│
│ │ ┌─────────────┐ ││ ┌─────────────┐ ││
│ │ │   (foto)  ②│ ││ │    MA       │ ││ ② = qty di keranjang
│ │ └─────────────┘ ││ └─────────────┘ ││
│ │ Nasi Goreng     ││ Mie Ayam        ││
│ │ Rp15.000        ││ Rp13.000        ││
│ └─────────────────┘└─────────────────┘│
│ ┌─────────────────┐┌─────────────────┐│
│ │ ┌─────────────┐ ││ ┌─────────────┐ ││
│ │ │   (foto)    │ ││ │   (foto)    │ ││
│ │ └─────────────┘ ││ └─────────────┘ ││
│ │ Es Teh Manis    ││ Kopi Susu       ││
│ │ Rp4.000         ││ Rp8.000         ││
│ │                 ││ ⚠ Stok kurang   ││
│ └─────────────────┘└─────────────────┘│
│               …                      │
├──────────────────────────────────────┤
│ 3 item                               │ BarKeranjang 64 px, shadow-md
│ Rp42.000          [■ Lihat Pesanan ›]│ (tombol primary)
└──────────────────────────────────────┘
```

| Elemen | Spesifikasi |
|---|---|
| Urutan menu | `jumlah_terjual_7_hari` DESC, lalu nama (FRD); tanpa kategori/tab |
| Kartu menu | Lebar kolom, foto 1:1 di atas, nama `text-base font-semibold` maks 2 baris, harga `text-base tabular-nums`. Padding 8 px, `rounded-md`, border. Area tap = seluruh kartu (≥ 160 px tinggi) |
| Tap | Qty +1 (FRD), badge qty `bg-primary text-white` di pojok foto, animasi skala 120 ms, getaran `navigator.vibrate(10)` jika tersedia |
| Tekan lama (500 ms) | Membuka sheet keranjang dengan baris menu itu terfokus (untuk mengurangi qty) |
| "Stok kurang" | Badge `menipis` di bawah harga, kartu tetap dapat ditap (FRD: keputusan saat konfirmasi) |
| Cari | Filter nama di klien saat mengetik; tombol `X` hapus; hasil kosong → "Menu ‹kata› tidak ditemukan" |
| Bar keranjang | Muncul saat ≥ 1 item. Kiri: "‹n› item" `text-sm` + total `text-xl font-bold`. Kanan: tombol |

### 1.2 Tablet & Desktop (≥ 768 px)

```
┌──────────────────────────────────────────────────────┬───────────────────────────┐
│ ☰ Warung Demo Pusat Dapur   ● Online · 2 mnt lalu  ⬆ 2  │ Pesanan                   │
├──────────────────────────────────────────────────────┤ ┌───────────────────────┐ │
│ [🔍 Cari menu                                      ] │ │( • ) Makan di tempat  │ │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │ │(   ) Bawa pulang      │ │
│ │ foto ② │ │  MA    │ │ foto   │ │ foto   │          │ └───────────────────────┘ │
│ │Nasi Gor│ │Mie Ayam│ │Es Teh  │ │Kopi Su │          │ Nasi Goreng               │
│ │Rp15.000│ │Rp13.000│ │Rp4.000 │ │Rp8.000 │          │ Rp15.000 [−] 2 [+] 30.000 │
│ └────────┘ └────────┘ └────────┘ └────────┘          │ Es Teh Manis              │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │ Rp4.000  [−] 3 [+] 12.000 │
│ │  …     │ │  …     │ │  …     │ │  …     │          │ ───────────────────────── │
│ └────────┘ └────────┘ └────────┘ └────────┘          │ Total          Rp42.000   │
│                                                      │ ( • ) Tunai  (   ) QRIS   │
│                                                      │ Uang diterima             │
│                                                      │ [Rp │ 50.000            ] │
│                                                      │ [Uang pas][50.000][100.000]│
│                                                      │ Kembalian       Rp8.000   │
│                                                      │ [■■ Konfirmasi Rp42.000 ] │ cta lg
└──────────────────────────────────────────────────────┴───────────────────────────┘
```

Panel kanan 360/400 px tetap terlihat; isi = sheet keranjang (§2) tanpa handle. Keranjang kosong: ilustrasi ikon `ShoppingBasket` + "Ketuk menu untuk mulai mencatat pesanan."

### 1.3 State Grid

| State | Tampilan |
|---|---|
| Snapshot belum pernah ada + offline | Empty state: ikon `WifiOff`, "Sambungkan internet sekali untuk memuat menu.", [Coba lagi] |
| Snapshot memuat pertama kali | Skeleton 6 kartu |
| Tidak ada menu aktif | Pemilik: "Belum ada menu yang dijual." [■ Tambah Menu] → `/menu/baru`. Kasir: "Belum ada menu. Minta pemilik menambahkan menu." |
| Menu tanpa foto | Avatar inisial berwarna (tokens §6) |

## 2. Keranjang & Pembayaran (bottom sheet, mobile)

Dibuka dari bar keranjang. Tinggi hingga 90 vh; bagian pembayaran dan tombol konfirmasi sticky di bawah sheet.

```
┌──────────────────────────────────────┐
│                 ▬                    │
│ Pesanan (3 item)         [Kosongkan] │ ghost, konfirmasi dialog
│                                      │
│ ( • ) Makan di tempat  (   ) Bawa pulang│ Segmented — field 1
│ ──────────────────────────────────── │
│ Nasi Goreng                          │
│ Rp15.000          [−]  2  [+]  30.000│ stepper 48 px
│ Es Teh Manis                         │
│ Rp4.000           [−]  3  [+]  12.000│
│ ──────────────────────────────────── │
│ Total                       Rp42.000 │ text-xl bold
│                                      │
│ Bayar pakai                          │
│ ( • ) Tunai            (   ) QRIS    │ Segmented — field 2
│                                      │
│ Uang diterima                        │ field 3 (hanya Tunai)
│ ┌──────────────────────────────────┐ │
│ │ Rp │ 50.000                      │ │
│ └──────────────────────────────────┘ │
│ [Uang pas] [50.000] [100.000]        │ PilihanUangCepat
│ Kembalian                    Rp8.000 │ text-lg bold, aman
│                                      │
│ [■■■■■ Konfirmasi Rp42.000 ■■■■■■■■] │ cta lg, sticky
└──────────────────────────────────────┘
```

| Aturan | Spesifikasi |
|---|---|
| 3 field | Tipe pesanan, metode bayar, uang diterima (NFR-07). Tidak ada diskon, catatan, pelanggan |
| Stepper | `[−]` pada qty 1 berubah ikon tong sampah, tap → baris dihapus + toast "Nasi Goreng dihapus" [Urungkan]. `[+]` nonaktif di 99; baris maks 50 (FRD) |
| Uang cepat | "Uang pas" = total; pecahan hanya yang > total (FRD). Tap mengisi field |
| Kembalian | Dihitung langsung. Uang < total → teks `status-habis` "Uang kurang ‹Rp2.000›", tombol konfirmasi nonaktif |
| QRIS | Field uang & kembalian disembunyikan; tampil info `status-info`: "Pastikan pembayaran QRIS sudah masuk sebelum konfirmasi." (FRD: dipilih manual setelah pelanggan bayar) |
| Konfirmasi | Teks tombol menyertakan total. Tombol aktif bila keranjang ≥ 1 baris dan pembayaran valid |
| Keranjang tersimpan | Menutup sheet / aplikasi tidak menghapus isi (FRD) |

### 2.1 State Tombol Konfirmasi

| State | Teks tombol | Durasi |
|---|---|---|
| Siap | "Konfirmasi Rp42.000" | — |
| Mengirim (online) | Spinner + "Menyimpan…"; seluruh sheet tidak dapat diubah | ≤ 10 detik (timeout FRD) |
| > 3 detik | Teks bantu di bawah tombol: "Internet lambat. Pesanan akan disimpan di HP bila tidak terkirim." | — |

## 3. Hasil Transaksi

Layar penuh menggantikan sheet (route tetap `/kasir`, state lokal), fokus ke judul.

### 3.1 Tersimpan di Server (201/200)

```
┌──────────────────────────────────────┐
│                                      │
│              ┌─────┐                 │
│              │  ✓  │                 │ lingkaran status-aman 64 px
│              └─────┘                 │
│        Pesanan tersimpan             │ text-xl semibold
│        No. 261110-3FA9C2-014         │ mono text-sm muted
│                                      │
│  Kembalian                           │
│  Rp8.000                             │ text-display bold (tunai)
│  Total Rp42.000 · Tunai              │
│                                      │
│ [ 💬 Kirim WhatsApp ] [ 🖨 Cetak ]    │ outline, 2 kolom
│ [ 📋 Salin teks ]     [ 📱 Ke nomor… ]│
│                                      │
│ [■■■■■■■■ Pesanan Baru ■■■■■■■■■■■■■] │ default lg
└──────────────────────────────────────┘
```

- QRIS: blok kembalian diganti "Total Rp42.000 · QRIS" `text-display`.
- `koreksi_stok = true` (blokir nonaktif): tambahkan kartu `menipis` "Stok beberapa bahan tidak cukup. Pemilik sudah diberi tahu untuk cek stok." (tanpa angka biaya).
- "Pesanan Baru" → kosongkan, reset default, kembali ke grid. Juga otomatis setelah 2 menit tanpa interaksi.
- "Ke nomor…" membuka sheet: input nomor WhatsApp (`08…`/`+62…`), tombol "Kirim" (FRD `struk.md`). Nomor tidak disimpan.

### 3.2 Disimpan di HP (offline / hasil tidak diketahui)

Sama dengan 3.1, perbedaan:

| Elemen | Nilai |
|---|---|
| Ikon | Lingkaran `status-menipis` dengan `CloudOff` |
| Judul | "Pesanan dicatat di HP" |
| Sub | Badge "Belum terkirim" + "Akan dikirim otomatis saat internet tersambung." |
| WhatsApp | Teks struk saja, tanpa link (FRD) |

### 3.3 Ditolak: Stok Tidak Cukup (409 online / cek lokal offline)

Dialog di atas sheet; keranjang tetap.

```
┌──────────────────────────────────────┐
│ ⚠  Bahan tidak cukup                 │
│                                      │
│ Stok Telur ayam kurang: butuh 3 buah,│ pesan dari server/aturan FRD
│ sisa 1 buah.                         │
│ Stok Nasi putih kurang: butuh 600    │
│ gram, sisa 400 gram.                 │
│                                      │
│ Kurangi jumlah pesanan atau minta    │
│ pemilik mencatat belanja bahan.      │
│                                      │
│              [■ Ubah Pesanan ]       │
└──────────────────────────────────────┘
```

Daftar bahan memakai `detail.kekurangan[]`; "Ubah Pesanan" menutup dialog dan menyorot baris menu terkait.

### 3.4 Harga Berubah (409 `HARGA_BERUBAH`)

```
┌──────────────────────────────────────┐
│ ℹ  Harga menu baru saja berubah      │
│                                      │
│ Mie Ayam   Rp13.000 → Rp14.000       │
│                                      │
│ Total baru             Rp44.000      │ tadinya Rp42.000 (dicoret)
│ Kembalian baru         Rp6.000       │
│                                      │
│ [ Ubah Pesanan ]  [■■ Konfirmasi Rp44.000]│ cta, client_tx_id sama
└──────────────────────────────────────┘
```

Jika uang diterima < total baru → baris kembalian diganti "Uang kurang Rp…" dan tombol konfirmasi diganti "Ubah Pembayaran".

### 3.5 Error Lain

| Kasus | Tampilan |
|---|---|
| 422 `MENU_TIDAK_AKTIF` | Dialog "‹Mie Ayam› sudah tidak dijual. Hapus dari pesanan?" [Hapus & lanjut] |
| 422 lain / 403 | Dialog error dengan `pesan` server; keranjang tetap |
| 401 / 429 lama | Diproses sebagai offline (3.2) + banner sesi berakhir bila 401 |
| Gagal tulis IndexedDB | Dialog `habis`: "Pesanan TIDAK tercatat. Memori HP penuh atau bermasalah. Catat manual dulu, lalu hubungi pemilik." (FRD: transaksi tidak tercatat) |

## 4. Riwayat Transaksi (`/kasir/riwayat`)

Shell backoffice. Kasir: hari ini saja, tanpa pemilih tanggal (FRD). Pemilik: pemilih tanggal maks 90 hari ke belakang + tab "Gagal terkirim".

### 4.1 Mobile

```
┌──────────────────────────────────────┐
│ ←  Riwayat Transaksi                 │
├──────────────────────────────────────┤
│ [‹ ]  Selasa, 10 Nov 2026  [ ›]  📅  │ pemilik saja; kasir: "Hari ini · 10 Nov 2026"
│ [ Semua ] [ Gagal terkirim ③ ]       │ tab (pemilik: data server; kasir: lokal)
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ 38 transaksi                     │ │ ringkasan (status selesai)
│ │ Tunai   Rp612.000  (24)          │ │ untuk cocokkan laci & mutasi QRIS
│ │ QRIS    Rp402.000  (14)          │ │
│ └──────────────────────────────────┘ │
│ [⚙ Filter]  Metode · Offline · Status│ sheet filter
│                                      │
│ BELUM TERKIRIM DI HP INI (2)         │ seksi lokal di atas (FRD)
│ ┌──────────────────────────────────┐ │
│ │ 12.51 · 261110-3FA9C2-016        │ │
│ │ Rp27.000 · Tunai   ⚠ Belum terkirim│
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 12.45 · 261110-3FA9C2-014        │ │
│ │ Rp42.000 · Tunai · 3 item  Dimas ›│ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 12.30 · 261110-8B21D0-007        │ │
│ │ R̶p̶1̶5̶.̶0̶0̶0̶ · QRIS     Dibatalkan  ›│ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 11.02 · 261110-3FA9C2-009        │ │
│ │ Rp8.000 · Tunai  ℹ Dibuat offline │ │
│ │                  ⚠ Stok dikoreksi │ │
│ └──────────────────────────────────┘ │
│     [ Tampilkan lebih banyak ]       │
└──────────────────────────────────────┘
```

- Item: jam (zona outlet), nomor struk mono, total, metode, jumlah item, nama kasir (`dibuat_oleh`), badge. Tap → `/struk/[clientTxId]`.
- Badge "Gagal terkirim" pada item lokal → tap membuka struk lokal dengan aksi "Coba lagi".
- Desktop: tabel kolom Jam · No. struk · Kasir · Item · Metode · Total · Status.

### 4.2 Tab "Gagal terkirim"

| Peran | Isi |
|---|---|
| Kasir (dan pemilik di perangkat itu) | Item lokal `gagal`: nomor struk, total, `pesan_error`, [Coba lagi] (sisa jatah "2 kali lagi", FRD maks 3) |
| Pemilik | Ditambah daftar server `transaksi_gagal` dari semua perangkat: waktu, perangkat (6 hex), kasir, total dari payload, pesan, status "Belum ditangani"/"Ditangani"/"Ditangani otomatis", [Tandai sudah ditangani] |

Kartu info di atas tab: "Transaksi di sini uangnya sudah diterima tetapi ditolak server. Catat ulang di Kasir bila perlu, lalu tandai sudah ditangani."

## 5. Struk Internal (`/struk/[clientTxId]`)

```
┌──────────────────────────────────────┐
│ ←  Struk                         ⋮   │ ⋮ = Batalkan Transaksi (pemilik, syarat FRD)
├──────────────────────────────────────┤
│    ┌────────────────────────────┐    │ kontainer 380 px, putih, shadow-xs
│    │   Warung Demo Pusat Dapur     │    │ text-lg bold center
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │ No.  261110-3FA9C2-014     │    │
│    │ 10 Nov 2026 12.45 WIB      │
│    │ Makan di tempat · Kasir Dimas   │ nama kasir hanya struk internal
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │ Nasi Goreng                │    │
│    │ 2 × 15.000          30.000 │    │
│    │ Es Teh Manis               │    │
│    │ 3 × 4.000           12.000 │    │
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │ Total            Rp42.000  │    │ bold
│    │ Tunai            Rp50.000  │    │
│    │ Kembalian         Rp8.000  │    │
│    │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │
│    │      Terima kasih          │    │
│    └────────────────────────────┘    │
│                                      │
│ [ 💬 Kirim WhatsApp ] [ 🖨 Cetak ]    │
│ [ 📋 Salin teks ]     [ 📱 Ke nomor… ]│
└──────────────────────────────────────┘
```

| Status | Tambahan di atas kertas |
|---|---|
| `pending` lokal | Badge "Belum terkirim"; nomor struk sementara; menu ⋮ tidak ada |
| `gagal` lokal | Kartu `habis`: "Gagal terkirim: ‹pesan_error›" + [Coba lagi] |
| `dibatalkan` | Stempel diagonal "DIBATALKAN" (teks, bukan gambar) + "Dibatalkan ‹10 Nov 2026 13.02 WIB› oleh Bu Sari · Salah input" |
| `koreksi_stok` (pemilik) | Badge "Stok dikoreksi" |

Tidak ada HPP/margin di struk (FRD).

### 5.1 Dialog Batalkan Transaksi (pemilik)

```
┌──────────────────────────────────────┐
│ Batalkan transaksi 261110-3FA9C2-014?│
│ Stok bahan dikembalikan dan transaksi│
│ tidak dihitung di laporan.           │
│                                      │
│ Alasan                               │
│ ( • ) Salah input                    │
│ (   ) Pelanggan batal                │
│ (   ) Lainnya                        │
│ Catatan (opsional)                   │ wajib ≥ 5 karakter jika "Lainnya"
│ [________________________] 0/200     │
│                                      │
│ [ Jangan Batalkan ] [■ Batalkan]     │ destructive
└──────────────────────────────────────┘
```

- Menu ⋮ "Batalkan Transaksi" disembunyikan bila status `dibatalkan`; dinonaktifkan dengan keterangan "Hanya bisa dibatalkan di hari yang sama" bila lewat batas.
- Sukses dengan `bahan_tidak_dikembalikan[]` → toast info "Stok ‹Telur ayam› tidak dikembalikan karena sudah dihitung ulang lewat opname."

## 6. Mode Simulasi (Akun Demo)

- Banner `demo`: "Mode simulasi: pesanan tidak disimpan." di atas status bar.
- Alur identik (grid, sheet, konfirmasi); tombol konfirmasi bertuliskan "Coba Konfirmasi Rp42.000".
- Hasil: judul "Simulasi selesai", struk dengan stempel "SIMULASI", aksi WhatsApp/Cetak/Salin **nonaktif** dengan keterangan "Tidak tersedia di mode simulasi".
- Cek stok kurang memakai dialog 3.3 yang sama.
- Indikator sinkron menampilkan "Mode simulasi" (tanpa antrean).

## 7. Logout dengan Antrean

Dari drawer/`/akun`, jika ada `pending` atau `gagal` belum dilaporkan (FRD):

```
┌──────────────────────────────────────┐
│ ⚠  Belum bisa keluar                 │
│ Masih ada 2 transaksi belum terkirim.│
│ Sambungkan internet dulu.            │
│                                      │
│ [ Lihat Antrean ]  [■ Kirim Sekarang]│
└──────────────────────────────────────┘
```

## 8. Indikator Sinkron: Semua State

| State | Baris 1 | Baris 2 (jika ada) |
|---|---|---|
| Online, antrean kosong | `●` hijau "Online · sinkron ‹2 mnt lalu›" | — |
| Online, mengirim | `⟳` biru "Mengirim 3 transaksi…" | — |
| Online, ada antrean (backoff) | `●` hijau "Online · sinkron ‹…›" | `⬆ 2 antrean · coba lagi 20 dtk` |
| Offline | `○` abu "Offline · sinkron terakhir ‹1 jam lalu›" | `⬆ 5 antrean` |
| Ada gagal | (state di atas) | `✕ 1 gagal terkirim ›` (link ke tab Gagal) |
| Simulasi | `👁` ungu "Mode simulasi" | — |

Setiap teks dibaca `aria-live="polite"`; titik warna selalu disertai teks.
