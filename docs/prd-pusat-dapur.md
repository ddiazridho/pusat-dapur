# PRD — Pusat Dapur: POS & Manajemen Stok Bahan Baku untuk UMKM Kuliner

## Objective

Membangun aplikasi web PWA yang dapat dipakai warung makan dan kedai kopi mikro untuk mencatat penjualan, mengurangi stok bahan baku secara otomatis berdasarkan resep, menghitung HPP dan margin setiap menu, serta menampilkan laporan laba kotor harian, tanpa pelatihan dan tetap jalan saat koneksi internet terputus.

Inti produk adalah satu loop otomatis: **tap pesanan → kurangi stok bahan → catat HPP → perbarui laporan**. Satu aksi kasir memicu seluruh rantai kalkulasi dalam satu transaksi database, tanpa input ganda. HPP per menu sudah dihitung lebih dulu setiap kali resep atau harga bahan berubah; saat pesanan dikonfirmasi, HPP tersebut dicatat sebagai snapshot transaksi untuk laporan, bukan dihitung ulang.

Setiap akun mewakili satu outlet. Data setiap outlet terisolasi dari outlet lain.

## Latar Belakang Masalah

| Masalah | Bukti | Dampak |
|---|---|---|
| Tidak ada pencatatan keuangan | 57–65% UMKM kuliner tanpa catatan; rekonsiliasi manual 1–2 jam/hari; tingkat kesalahan 60%. | Pemilik tidak tahu untung atau rugi hari ini. |
| HPP tidak terhitung | Harga jual ditetapkan dari intuisi; kenaikan harga bahan terlambat disadari. | Menu dijual dengan margin negatif tanpa disadari. |
| Stok manual | Kehabisan bahan baru diketahui saat pesanan tidak bisa dipenuhi. | Pesanan batal, belanja bahan tidak terencana. |
| Solusi yang ada mahal dan rumit | Paket dengan fitur resep Rp299rb–Rp999rb/bulan (16–55% margin warung); skor pemberdayaan digital IMDI 2024 hanya 25,66/100. | Adopsi rendah meski QRIS sudah dipakai luas. |

## Personas

| Persona | Karakteristik | Tujuan |
|---|---|---|
| Pemilik warung | Usaha 1–10 karyawan, omzet Rp500rb–Rp2jt/hari, satu outlet, Android non-flagship, terbiasa WhatsApp, tidak familiar software bisnis. | Tahu laba kotor hari ini, tahu kapan harus belanja bahan, tahu menu mana yang paling menguntungkan. |
| Kasir / staf | Usia 18–35, terbiasa smartphone, tanpa latar teknologi. | Input pesanan cepat tanpa form rumit, tetap bisa mencatat saat internet mati. |
| Juri / pengamat demo | Mengevaluasi aplikasi dalam kompetisi. | Melihat seluruh fitur dengan data contoh tanpa bisa mengubah data. |

## Prinsip Produk

- **Zero-training UX.** Tidak ada istilah akuntansi di UI. Maksimal tiga field per form transaksi. Alur kasir: tap menu → konfirmasi → selesai.
- **Mobile-first untuk perangkat low-end.** Target Chrome Android dengan RAM 2–3 GB. Touch target minimal 48px.
- **Offline-first di kasir.** Pencatatan penjualan tidak boleh berhenti karena koneksi terputus.
- **Angka harus bisa dipercaya.** Riwayat transaksi tidak berubah ketika harga menu atau harga bahan berubah kemudian.

## Product Scope

### Fase 0 — Loop Inti (online)

- Auth email + password untuk pemilik. Pemilik baru otomatis mendapat satu outlet.
- Pemilik membuat akun kasir untuk outletnya. Peran: `pemilik`, `kasir`.
- Manajemen bahan baku: nama, satuan (gram, ml, buah), stok saat ini, threshold minimum, harga beli per satuan terakhir.
- Manajemen menu: nama, foto opsional, harga jual, status aktif.
- Manajemen resep (F3): bahan + takaran per porsi untuk setiap menu. Template resep umum (nasi goreng, mie ayam, es teh, dll.) bisa dipakai lalu disesuaikan.
- POS kasir (F1): grid menu bergambar, keranjang, tipe pesanan (dine-in/takeaway), metode bayar (tunai/QRIS), total otomatis, kembalian untuk tunai.
- Auto-deduct stok (F2): konfirmasi pesanan mengurangi stok semua bahan sesuai resep dalam satu transaksi atomik.
- Input restock (F4): pilih bahan, jumlah (gram/kg, ml/liter, atau buah), dan total harga sesuai nota belanja; harga beli per satuan dihitung otomatis. Menampilkan pratinjau HPP menu terdampak sebelum disimpan.
- Kalkulator HPP & margin (F5): HPP dan margin tampil di samping harga jual; merah jika margin di bawah ambang batas.
- Struk digital: dapat dibagikan via WhatsApp (link/teks) atau dicetak dari browser.

### Fase 1 — Kelengkapan Demo GTNIC

- Offline sync (F8): transaksi saat offline disimpan di IndexedDB berstatus `pending`, dikirim otomatis saat koneksi pulih, status sinkronisasi terlihat di layar kasir.
- PWA installable: Service Worker, cache aset statis, data menu/resep/stok tersedia offline.
- Alert stok menipis (F6): notifikasi real-time di dashboard pemilik saat stok di bawah threshold; dapat ditandai sudah dibaca.
- Dashboard laporan (F7): total penjualan, total HPP, laba kotor; grafik top 5 menu terlaris; filter hari ini / 7 hari / 30 hari.
- **Stok opname (F9, baru):** pemilik menginput stok fisik hasil hitung; sistem mencatat selisih (susut, tumpah, salah catat) dan menyesuaikan stok.
- Pembatalan transaksi oleh pemilik pada hari yang sama; stok dikembalikan dan transaksi tetap tersimpan berstatus dibatalkan.
- Akun demo read-only untuk juri, dengan data contoh 30 hari dan mode simulasi POS.
- Rate limiting endpoint transaksi.

### Roadmap Pasca-Kompetisi

| Versi | Fitur |
|---|---|
| v2.0 | Import pesanan GoFood/GrabFood, dashboard multi-outlet, export laporan sederhana untuk pengajuan kredit. |
| v2.1 | Absensi shift dan rekap gaji harian, peringatan kedaluwarsa bahan. |
| v3.0 | Saran restock berbasis LLM dari pola penjualan 30 hari, input kasir via chatbot WhatsApp. |

## Aturan Bisnis Kunci

| ID | Aturan |
|---|---|
| BR-01 | **HPP per porsi** = Σ(harga beli per satuan terakhir × takaran resep). Disimpan sebagai `hpp_cached` di menu dan dihitung ulang setiap kali resep berubah atau ada restock bahan yang dipakai menu tersebut. |
| BR-02 | **Margin** = (harga jual − HPP) / harga jual. Ambang peringatan default 20%, dapat diubah pemilik per outlet. |
| BR-03 | **Laba kotor** = total penjualan − total HPP terjual. Dashboard tidak menyebut "laba bersih" karena biaya operasional (sewa, gaji, listrik, gas) tidak dicatat di MVP. |
| BR-04 | **Snapshot transaksi.** Setiap baris `detail_transaksi` menyimpan nama menu, harga jual, dan HPP saat transaksi. Laporan historis memakai snapshot, bukan nilai menu saat ini. Pengecualian: transaksi offline memakai HPP menu saat diterima server, karena perangkat kasir tidak menyimpan data biaya; selisih hanya terjadi jika ada restock di jendela offline. |
| BR-05 | **Stok tidak cukup saat online.** Perilaku diatur pengaturan outlet `blokir_stok_kurang` (default **aktif**). Jika aktif, server menolak transaksi, kasir melihat bahan mana yang kurang, dan tidak ada data yang tersimpan sebagian. Jika dinonaktifkan pemilik, kasir melihat peringatan lalu transaksi tetap tersimpan dengan penanganan stok seperti BR-07. |
| BR-06 | **Stok tidak cukup saat offline.** Aplikasi memeriksa stok terhadap salinan lokal (sudah dikurangi transaksi `pending`) dan mengikuti pengaturan `blokir_stok_kurang` yang sama seperti BR-05. Salinan stok lokal diperbarui dari server setiap kali sinkronisasi berhasil dan saat aplikasi dibuka. |
| BR-07 | **Konflik saat sinkronisasi.** Transaksi offline yang sudah terjadi (uang sudah diterima) **selalu diterima** server walaupun stok server ternyata tidak cukup (misalnya karena perangkat kasir lain atau opname). Stok bahan terkait diset ke 0, kekurangannya dicatat sebagai mutasi `koreksi_sync`, dan pemilik mendapat alert "stok tidak sinkron, lakukan opname". Stok tidak pernah negatif. |
| BR-08 | **Idempotensi.** Setiap transaksi membawa `client_tx_id` (UUID dari perangkat). Pengiriman ulang dengan ID sama tidak membuat transaksi ganda. |
| BR-09 | **Stok opname** menetapkan stok ke nilai fisik dan mencatat selisihnya sebagai mutasi `opname`. Opname tidak mengubah HPP. |
| BR-10 | **Mutasi stok.** Setiap perubahan stok (stok awal, penjualan, restock, opname, koreksi sync, pembatalan transaksi) tercatat di ledger `stok_mutasi`, sehingga stok saat ini selalu bisa ditelusuri. |
| BR-11 | **Isolasi outlet.** Pengguna hanya dapat membaca dan mengubah data milik `outlet_id`-nya sendiri. |
| BR-12 | **Hak akses peran.** Kasir hanya mengakses POS, riwayat dan struk transaksi hari ini, dan daftar stok (baca, tanpa harga beli). Pemilik mengakses semua modul, termasuk pembatalan transaksi. Akun juri dapat membaca semua modul pemilik tanpa bisa mengubah data; pembatasan ini ditegakkan di server, bukan hanya dengan menonaktifkan tombol. |

## Explicitly Out of Scope

| Batasan | Alasan | Alternatif sementara |
|---|---|---|
| Integrasi API GoFood/GrabFood/ShopeeFood | Butuh persetujuan mitra dan kontrak API. | Pesanan delivery diinput manual sebagai `takeaway`. |
| Absensi dan penggajian | Domain HR, tidak menjawab masalah inti. | — |
| Peringatan kedaluwarsa bahan | Butuh input tanggal per batch; beban tinggi bagi pengguna. | Alert stok menipis (F6). |
| Harga bahan dari API pasar real-time | Belum ada API harga pasar yang reliabel dan gratis. | Harga diinput saat restock. |
| Multi-outlet per akun | Arsitektur tenant lebih kompleks. | Semua tabel sudah memakai `outlet_id`. |
| Loyalty / CRM pelanggan | Di luar masalah pembukuan dan stok. | — |
| Laporan format SAK EMKM | Butuh validasi akuntansi profesional. | Laporan laba kotor sederhana. |
| Pencatatan biaya operasional dan laba bersih | Menambah form di luar alur kasir. | Laba kotor (BR-03). |
| Integrasi pembayaran QRIS otomatis | Butuh kerja sama PJP. | Kasir memilih metode "QRIS" secara manual setelah pelanggan membayar. |

## User Stories

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-01 | Sebagai pemilik, saya mendaftar dan langsung punya outlet. | Register email/password; outlet otomatis dibuat; diarahkan ke onboarding (isi bahan dan menu, atau pakai template). |
| US-02 | Sebagai pemilik, saya membuat akun kasir. | Kasir login dengan akun sendiri; kasir hanya melihat modul sesuai BR-12. |
| US-03 | Sebagai pemilik, saya mendaftarkan bahan baku. | Nama, satuan, stok awal, threshold, harga beli wajib valid; stok ≥ 0; nama unik per outlet. |
| US-04 | Sebagai pemilik, saya menyusun resep menu. | Bahan tidak boleh duplikat dalam satu resep; takaran > 0; HPP dan margin langsung tampil setelah disimpan. |
| US-05 | Sebagai kasir, saya mencatat pesanan. | Tap menu menambah ke keranjang; total otomatis; pilih tipe pesanan dan metode bayar; konfirmasi menghasilkan nomor struk dalam ≤ 2 detik saat online. |
| US-06 | Sebagai kasir, saya tahu jika bahan tidak cukup. | Pesan menyebut bahan yang kurang dalam bahasa sehari-hari. Jika `blokir_stok_kurang` aktif, pesanan ditolak dan tidak ada stok yang berkurang. Jika nonaktif, pesanan tersimpan dan pemilik menerima alert (BR-05/BR-07). |
| US-06b | Sebagai pemilik, saya mengatur apakah penjualan diblokir saat stok kurang. | Toggle `blokir_stok_kurang` di pengaturan outlet, default aktif; hanya pemilik yang dapat mengubah; perubahan berlaku di semua perangkat kasir setelah sinkronisasi berikutnya. |
| US-07 | Sebagai kasir, saya tetap bisa berjualan saat internet mati. | Transaksi tersimpan `pending`; indikator offline dan jumlah antrean terlihat; antrean terkirim otomatis saat online; tidak ada transaksi ganda (BR-08). |
| US-08 | Sebagai kasir, saya membagikan struk ke pelanggan. | Tombol "Kirim via WhatsApp" membuka WhatsApp dengan ringkasan struk; tombol cetak memakai dialog cetak browser. |
| US-09 | Sebagai pemilik, saya mencatat belanja bahan (restock). | Input jumlah dan total harga sesuai nota; stok bertambah; harga beli terakhir diperbarui; HPP semua menu terdampak dihitung ulang; pratinjau perubahan HPP tampil sebelum simpan. |
| US-10 | Sebagai pemilik, saya diperingatkan saat margin menipis. | Menu dengan margin < ambang ditandai merah di daftar menu dan dashboard. |
| US-11 | Sebagai pemilik, saya diberi tahu saat stok menipis. | Alert muncul di dashboard tanpa refresh saat stok turun melewati threshold atau habis (tidak berulang di setiap penjualan); badge jumlah alert belum dibaca; bisa ditandai dibaca. |
| US-12 | Sebagai pemilik, saya melihat laporan harian. | Penjualan, HPP, dan laba kotor sesuai BR-03/BR-04; top 5 menu; filter hari ini / 7 hari / 30 hari; terbuka dalam ≤ 3 tap dari beranda. |
| US-13 | Sebagai pemilik, saya melakukan stok opname. | Input stok fisik per bahan; selisih ditampilkan sebelum simpan; mutasi `opname` tercatat; alert "stok tidak sinkron" tertutup setelah opname bahan terkait. |
| US-14 | Sebagai pemilik, saya menelusuri perubahan stok. | Riwayat mutasi per bahan menampilkan tanggal, jenis, jumlah, dan pengguna. |
| US-15 | Sebagai juri, saya mengevaluasi aplikasi. | Login akun demo read-only; semua tombol ubah data nonaktif dan API menolak mutasi (403); data contoh 30 hari tersedia. |
| US-16 | Sebagai pengguna, saya tidak bisa melihat data outlet lain. | Request ke resource outlet lain ditolak (403/404) di API dan di database. |

## Kebutuhan Non-Fungsional

| Area | Kebutuhan |
|---|---|
| Performa | Layar POS interaktif ≤ 3 detik di Android RAM 2 GB jaringan 3G (setelah cache pertama ≤ 1 detik). Konfirmasi transaksi online ≤ 2 detik p95. |
| Offline | POS, daftar menu, dan stok lokal tetap berfungsi tanpa koneksi minimal 1 hari operasional (target 500 transaksi antrean). |
| Konsistensi data | Transaksi, pengurangan stok, mutasi, dan alert ditulis dalam satu transaksi database (ACID). Constraint `stok >= 0` di database. |
| Keamanan | Validasi input dengan Zod di server; cookie sesi httpOnly; isolasi `outlet_id` di aplikasi dan RLS di database; rate limit 10 req/detik per outlet di endpoint transaksi. |
| Aksesibilitas & bahasa | Bahasa Indonesia sehari-hari; format Rupiah dan tanggal Indonesia; touch target ≥ 48px; kontras warna memenuhi WCAG AA; status tidak hanya dibedakan lewat warna. |
| Biaya | Berjalan di free tier Vercel, Supabase, dan Upstash untuk skala demo. |

### Keputusan Produk 

| Topik | Keputusan | Alasan |
|---|---|---|
| Beberapa perangkat kasir dalam satu outlet | **Diizinkan, tanpa batas jumlah perangkat.** Server adalah sumber kebenaran stok; konflik ditangani BR-07; setiap transaksi mencatat `device_id`; salinan stok lokal diperbarui setiap sinkronisasi. Layar kasir menampilkan waktu sinkron terakhir. | POS offline-first umumnya memakai model "server menang, transaksi tidak pernah dibuang" daripada mengunci perangkat. Membatasi satu perangkat menyulitkan warung saat ramai atau saat HP kasir mati, dan tidak menghilangkan konflik dengan opname/restock. |
| Pemblokiran penjualan saat stok tidak cukup | **Default memblokir**, dengan pengaturan outlet `blokir_stok_kurang` yang dapat dinonaktifkan pemilik (BR-05). Saat nonaktif, penjualan dicatat, stok di-clamp ke 0, dan alert opname dikirim. Tidak ada override per transaksi oleh kasir. | Stok bahan di warung adalah estimasi (takaran bervariasi), sehingga POS F&B umumnya tidak memaksa blokir keras. Default blokir menjaga janji proposal dan mendorong data stok rapi; toggle level pemilik memberi jalan keluar tanpa memberi kasir kewenangan mengabaikan stok. Override per transaksi via PIN ditunda karena menambah langkah di alur kasir. |
| Model freemium | **Gratis selamanya:** 1 outlet, POS, resep & HPP, stok + opname, alert, laporan hingga 90 hari, hingga 3 akun kasir. **Berbayar (v2, harga ditentukan setelah validasi):** multi-outlet, export laporan untuk kredit, riwayat laporan tanpa batas, import pesanan delivery. MVP tidak membangun billing; batas kuota ditulis sebagai konstanta konfigurasi. | Semua fitur yang menjawab masalah inti harus gratis agar hambatan biaya (alasan utama gagal adopsi) hilang. Monetisasi ditaruh pada kebutuhan usaha yang sudah tumbuh (cabang, kredit). Kuota sebagai konfigurasi memudahkan perubahan tanpa migrasi. |
| Akun demo juri | Akun demo dibuat oleh skrip seed dengan kredensial dari environment variable (tidak ada di repository). Kredensial hanya dicantumkan di formulir pengumpulan GTNIC. Flag `read_only` ditegakkan di server (middleware menolak semua request mutasi). Data demo di-reset otomatis setiap hari ke data contoh 30 hari, dengan tanggal digeser mengikuti hari ini. | Kredensial di repo publik dapat dipakai siapa saja dan sering ter-scrape. Pembatasan hanya di UI mudah dilewati. Reset harian menjaga demo tetap rapi dan laporan "hari ini" selalu berisi data. |

## Success Metrics

| Metric | Target |
|---|---|
| Waktu rekonsiliasi harian | < 15 menit per hari (dari 1–2 jam), diukur lewat uji pengguna. |
| Kecepatan input pesanan | Pesanan 3 item tercatat ≤ 15 detik oleh kasir baru tanpa pelatihan. |
| Akurasi stok | Stok sistem = Σ mutasi untuk setiap bahan, 100%; tidak ada stok negatif. |
| Integritas transaksi | 0 transaksi ganda dan 0 transaksi offline hilang setelah sinkronisasi. |
| Akurasi HPP | HPP menu = Σ(harga beli terakhir × takaran) setelah setiap restock, 100%. |
| Isolasi data | 0 akses lintas outlet pada uji otorisasi API dan RLS. |
| Kemudahan dipakai | Pemilik baru menyelesaikan onboarding (≥ 5 bahan, ≥ 3 menu dengan resep) ≤ 10 menit. |
| Kesiapan demo | Alur Fase 0 + Fase 1 berjalan end-to-end di deployment Vercel dengan data contoh 30 hari. |
