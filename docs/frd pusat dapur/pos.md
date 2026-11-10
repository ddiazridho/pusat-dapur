# FRD: POS Kasir

## Otorisasi

`pemilik` dan `kasir` dapat membuat transaksi. `read_only` hanya membaca (403 `READ_ONLY` pada `POST`). Riwayat untuk `kasir` dibatasi hari ini (`auth.md`).

## Routes

| Route | Tujuan |
|---|---|
| `/kasir` | Grid menu aktif, keranjang, konfirmasi |
| `/kasir/riwayat` | Riwayat transaksi |
| `POST /api/transaksi` | Buat transaksi (online dan sinkronisasi offline) |
| `GET /api/transaksi` | Daftar transaksi per tanggal |
| `GET /api/transaksi/[clientTxId]` | Detail satu transaksi |
| `POST /api/transaksi/[clientTxId]/batal` | Batalkan transaksi (`pembatalan-transaksi.md`) |

## Keranjang (client)

| Aturan | Nilai |
|---|---|
| Sumber menu | Menu `aktif = true` dari snapshot lokal (`offline-sync.md`) |
| Urutan grid | `jumlah_terjual_7_hari` DESC, lalu `nama` ASC (`menu.md`); pencarian nama tersedia jika menu > 12 |
| Menu tidak cukup stok | Ditandai "Stok kurang" di grid berdasarkan stok lokal efektif (`offline-sync.md`); tetap dapat ditap, keputusan akhir saat konfirmasi |
| Tap menu | Menambah `qty` +1; menu sama tidak membuat baris baru |
| `qty` per baris | Integer 1–99 |
| Jumlah baris | 1–50 |
| `total` | Σ (`harga_jual` × `qty`), tanpa diskon, pajak, atau biaya layanan |
| Keranjang tersimpan | Disimpan di IndexedDB per perangkat; tidak hilang saat aplikasi tertutup/reload, dikosongkan setelah transaksi tersimpan |
| Uang diterima | Input nominal dengan pilihan cepat "Uang pas" dan pecahan Rp10.000/Rp20.000/Rp50.000/Rp100.000 di atas `total` |

## Payload `POST /api/transaksi`

| Field | Aturan |
|---|---|
| `client_tx_id` | UUID v4 dari perangkat |
| `device_id` | UUID v4 perangkat (`offline-sync.md`) |
| `dibuat_oleh` | UUID user yang mengonfirmasi transaksi di perangkat. Untuk `dibuat_offline = false` selalu diganti `user_id` sesi. Untuk `true` dipakai jika user ada di outlet sesi (aktif maupun nonaktif); selain itu diganti `user_id` sesi |
| `nomor_struk` | Format di `struk.md` |
| `waktu_transaksi` | ISO 8601 waktu konfirmasi di perangkat |
| `dibuat_offline` | Boolean |
| `tipe_pesanan` | Enum `dine_in`, `takeaway` |
| `metode_bayar` | Enum `tunai`, `qris` |
| `uang_diterima` | Wajib jika `tunai`: integer ≥ `total` dan ≤ 1.000.000.000.000; jika `qris`: harus `null` |
| `items[]` | 1–50 item; `menu_id` unik dalam array |
| `items[].menu_id` | UUID menu di outlet sesi |
| `items[].qty` | Integer 1–99 |
| `items[].harga_jual` | Wajib selalu; harga yang ditampilkan ke pelanggan (dari snapshot). Integer 1–10.000.000 (`menu.md`) |
| `items[].nama_menu` | Wajib jika `dibuat_offline = true`, 1–100 karakter (`menu.md`); diabaikan jika `false` |

## Aturan Transaksi

- `total` dihitung ulang server dari snapshot harga; nilai `total` dari client tidak dipercaya.
- `dibuat_offline = false` dan ada `items[].harga_jual` ≠ `menus.harga_jual` saat ini (harga diubah setelah snapshot perangkat) → 409 `HARGA_BERUBAH` dengan `detail.menu[]` (`menu_id`, `harga_lama`, `harga_baru`); tidak ada data tersimpan. Dengan begitu total yang ditagih kasir selalu sama dengan total tersimpan.
- `kembalian` = `uang_diterima` − `total` untuk `tunai`; `null` untuk `qris`.
- `uang_diterima < total` → 422 `UANG_KURANG`.
- `waktu_transaksi`: jika `dibuat_offline = false` diganti waktu server; jika `true` dipakai apa adanya, kecuali > waktu server → diganti waktu server. Dengan begitu tidak ada transaksi bertanggal di masa depan.
- `metode_bayar = qris` dipilih manual setelah pelanggan membayar; tidak ada integrasi PJP.
- Pesanan delivery (GoFood/GrabFood) dicatat sebagai `takeaway`.
- Transaksi tidak dapat diubah setelah tersimpan; koreksi dilakukan dengan pembatalan lalu transaksi baru (`pembatalan-transaksi.md`).
- `transaksi.status`: enum `selesai` (default saat insert), `dibatalkan`.
- Kolom `transaksi` lain: `user_id` (pengirim request), `dibuat_oleh` (kasir pembuat; dipakai di struk dan audit), `device_id`, `token_struk` (`struk.md`), `koreksi_stok` (`pengurangan-stok.md`), `created_at` (waktu server diterima); untuk pembatalan: `dibatalkan_at`, `dibatalkan_oleh`, `alasan_batal`, `catatan_batal` (`pembatalan-transaksi.md`).
- Pengurangan stok dan aturan stok kurang: `pengurangan-stok.md`.
- Idempotensi `client_tx_id`: `offline-sync.md`.

## Snapshot (`detail_transaksi`)

| Field | `dibuat_offline = false` | `dibuat_offline = true` |
|---|---|---|
| `id`, `outlet_id`, `transaksi_id`, `menu_id` | UUID; `outlet_id` dari sesi; `menu_id` dari `items[].menu_id` | Sama |
| `nama_menu` | `menus.nama` saat ini | Dari payload |
| `harga_jual` | `menus.harga_jual` saat ini (sama dengan payload, lihat `HARGA_BERUBAH`) | Dari payload |
| `hpp_snapshot` | `menus.hpp_cached` saat diproses | `menus.hpp_cached` saat diproses server (lihat catatan) |
| `qty`, `subtotal` | `subtotal` = `harga_jual` × `qty` | Sama |

Laporan historis memakai snapshot ini, tidak pernah nilai `menus` saat ini (`laporan.md`).

Catatan `hpp_snapshot` transaksi offline: perangkat kasir tidak menyimpan data biaya (`auth.md`), dan resep tidak berversi, sehingga HPP saat transaksi terjadi tidak dapat direkonstruksi. Server memakai `hpp_cached` saat sinkronisasi. Selisih dibatasi jendela offline (target ≤ 1 hari) dan hanya terjadi jika ada restock/koreksi harga di jendela itu, sehingga dapat diterima untuk laba kotor harian.

## Responses `POST /api/transaksi`

| Status | Kondisi | Body |
|---|---|---|
| 201 | Transaksi baru | `id`, `client_tx_id`, `nomor_struk` (final), `token_struk` (`struk.md`), `created_at` (waktu server diterima), `total`, `kembalian`, `koreksi_stok` (boolean) |
| 200 | `client_tx_id` sudah ada | Field sama dengan 201, dari transaksi yang sudah tersimpan |
| 409 `STOK_TIDAK_CUKUP` | Lihat `pengurangan-stok.md` | `detail.kekurangan[]` |
| 409 `HARGA_BERUBAH` | Harga di payload ≠ harga saat ini dan `dibuat_offline = false` | `detail.menu[]` |
| 422 `MENU_TIDAK_AKTIF` | Menu nonaktif dan `dibuat_offline = false` | `detail.menu_id` |
| 422 `VALIDASI_GAGAL` / `UANG_KURANG` | Payload tidak valid | Error per field |
| 429 | Rate limit | `Retry-After` |

## Alur Konfirmasi (client)

1. Kasir tap konfirmasi → client membuat `client_tx_id` dan `nomor_struk`.
2. Perangkat online → kirim dengan `dibuat_offline = false`, timeout 10 detik.
3. 201/200 → tampilkan struk (`struk.md`, memakai `nomor_struk` final dan `token_struk` dari response), kosongkan keranjang, dan kurangi `stok_saat_ini` snapshot lokal sebesar kebutuhan transaksi (`offline-sync.md`).
4. 400/404/409/422 → tampilkan pesan; keranjang tetap; tidak ada data tersimpan. Khusus 409 `HARGA_BERUBAH`: client mengambil snapshot baru, memperbarui harga di keranjang, menampilkan total baru, dan kasir mengonfirmasi ulang dengan `client_tx_id` yang sama (server belum menyimpan apa pun).
4a. 401 (sesi berakhir) atau 429 yang `Retry-After`-nya lebih dari 10 detik → request pasti belum diproses server, sehingga client menjalankan alur offline langkah 5 dengan `client_tx_id` yang sama. 401 juga menampilkan "Sesi berakhir, login ulang untuk mengirim transaksi". 429 dengan `Retry-After` ≤ 10 detik → tunggu lalu kirim ulang sekali otomatis.
4b. 403 → tampilkan pesan; keranjang tetap; tidak ada data tersimpan.
5. Perangkat offline sebelum request dikirim → jalankan alur offline (`offline-sync.md`) dengan `client_tx_id` yang sama dan `dibuat_offline = true`.
6. Request sudah dikirim tetapi hasilnya tidak diketahui (error jaringan, timeout, atau 5xx) → simpan langsung ke antrean `pending` dengan `client_tx_id` yang sama, `dibuat_offline = true`, serta `nama_menu` dan `harga_jual` dari keranjang, **tanpa** cek blokir stok lokal, karena transaksi mungkin sudah tersimpan di server. Jika sudah tersimpan, server mengembalikan 200 saat sinkron.

- `client_tx_id` dibuat sekali per konfirmasi dan tidak pernah dibuat ulang untuk keranjang yang sama. Membuat ID baru saat retry menyebabkan transaksi ganda.

## Aturan Query `GET /api/transaksi`

| Parameter | Aturan |
|---|---|
| `tanggal` | `YYYY-MM-DD` zona waktu outlet (berdasarkan `waktu_transaksi`), default hari ini. `kasir`: selain hari ini → 403 `AKSES_DITOLAK`. `pemilik`: maks `MAKS_RIWAYAT_LAPORAN_HARI` ke belakang |
| Urutan | `waktu_transaksi` DESC |
| Paginasi | `limit` 1–100 (default 50), `cursor` |
| `status` | Opsional `selesai`/`dibatalkan`; default semua |
| `metode_bayar`, `dibuat_offline` | Filter opsional |
| Field | `client_tx_id`, `nomor_struk`, `waktu_transaksi`, `status`, `tipe_pesanan`, `metode_bayar`, `total`, jumlah item, nama kasir, `dibuat_offline`, `koreksi_stok`. Field biaya hanya untuk `pemilik` |
| Ringkasan | Response menyertakan `ringkasan` tanggal tersebut: jumlah transaksi `selesai`, Σ `total` per `metode_bayar` (untuk cocokkan uang laci dan mutasi QRIS) |

- "Hari ini" untuk akses `kasir` ke satu transaksi (`GET /api/transaksi/[clientTxId]`, `/struk/[clientTxId]`) = tanggal `waktu_transaksi` **atau** tanggal `created_at` adalah hari ini (zona waktu outlet), sama dengan batas `pembatalan-transaksi.md`. Selain itu → 403 `AKSES_DITOLAK`, sama dengan daftar.
- Riwayat di perangkat juga menampilkan transaksi lokal berstatus `pending`/`gagal` (`offline-sync.md`).
