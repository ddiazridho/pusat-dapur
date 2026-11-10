# FRD: Mutasi Stok

## Otorisasi

Baca: `pemilik` termasuk `read_only`. `kasir`: tidak ada akses. Tidak ada endpoint tulis; mutasi hanya dibuat oleh action lain.

## Routes

| Route | Tujuan |
|---|---|
| `/bahan/[id]` | Riwayat mutasi bahan |
| `GET /api/bahan-baku/[id]/mutasi` | Daftar mutasi satu bahan |
| `GET /api/cron/cek-invarian` | Job harian pemeriksaan invarian stok (Vercel Cron, lihat Aturan) |

## Fields (`stok_mutasi`)

| Field | Aturan |
|---|---|
| `id` | UUID |
| `outlet_id`, `bahan_baku_id` | FK, outlet sama |
| `jenis` | Enum `stok_awal`, `penjualan`, `restock`, `opname`, `koreksi_sync`, `pembatalan` |
| `jumlah` | `numeric(12,3)`, bertanda (+ menambah, − mengurangi), ≠ 0 |
| `ref_id` | ID sumber, sesuai tabel di bawah |
| `user_id` | Pengguna yang memicu (pengirim request) |
| `created_at` | Waktu server |
| `seq` | `bigint` identity, naik otomatis sesuai urutan insert; dipakai untuk urutan dan cursor karena beberapa mutasi dalam satu transaksi DB punya `created_at` sama |

## Sumber Mutasi

| `jenis` | Tanda `jumlah` | Dibuat oleh | `ref_id` |
|---|---|---|---|
| `stok_awal` | + | `POST /api/bahan-baku` (`bahan-baku.md`) | `null` |
| `penjualan` | − | `POST /api/transaksi` (`pengurangan-stok.md`) | `transaksi.id` |
| `koreksi_sync` | + | `POST /api/transaksi` saat stok dikoreksi ke 0 (`pengurangan-stok.md`) | `transaksi.id` |
| `restock` | + | `POST /api/restock` (`restock.md`) | `restock_log.id` |
| `opname` | + atau − | `POST /api/opname` (`stok-opname.md`) | `stok_opname.id` |
| `pembatalan` | + | `POST /api/transaksi/[clientTxId]/batal` (`pembatalan-transaksi.md`) | `transaksi.id` |

- `stok_awal` melengkapi jenis PRD (penjualan, restock, opname, koreksi sync) agar stok yang diisi saat bahan dibuat juga tercatat di ledger; tanpanya invarian di bawah tidak terpenuhi.
- `pembatalan` mengembalikan pengurangan bersih transaksi yang dibatalkan.
- Setiap mutasi yang lahir dari transaksi penjualan wajib memakai `ref_id = transaksi.id`. Pembatalan menjumlahkan mutasi dengan `ref_id` tersebut dan `jenis IN (penjualan, koreksi_sync)` (`pembatalan-transaksi.md`). Filter jenis wajib karena `ref_id` menunjuk ke tabel berbeda per jenis. Jenis mutasi baru yang lahir dari transaksi wajib ditambahkan ke daftar jenis ini.

## Aturan

- Append-only: tidak ada update/delete (tanpa endpoint; RLS tanpa policy `UPDATE`/`DELETE`). Satu-satunya pengecualian: reset harian outlet demo (`akun-demo.md`) yang menghapus seluruh data outlet demo dengan service role dalam satu transaksi DB lalu seed ulang, sehingga invarian tetap terpenuhi.
- Setiap perubahan `bahan_baku.stok_saat_ini` wajib disertai mutasi dalam transaksi DB yang sama.
- Invarian: `stok_saat_ini` = Σ `stok_mutasi.jumlah` per bahan. Uji wajib 100%.
- Pemeriksaan invarian dijalankan harian oleh Vercel Cron tersendiri `GET /api/cron/cek-invarian` (01:00 `Asia/Jakarta`, wajib header `Authorization: Bearer <CRON_SECRET>`, selain itu 401) untuk semua outlet. Job ini terpisah dari reset demo (`akun-demo.md`) agar tetap berjalan walau demo dimatikan; selisih dicatat di log server level `error` dengan `outlet_id` dan `bahan_baku_id`.

## Aturan Query

| Parameter | Aturan |
|---|---|
| `jenis` | Opsional, filter enum |
| Urutan | `seq` DESC (sama dengan urutan waktu) |
| Paginasi | `limit` 1–100 (default 50), `cursor` |
| Field response | `created_at`, `jenis`, `jumlah`, `satuan`, `stok_berjalan`, nama pengguna, `ref_id`, `ref_label` |
| `stok_berjalan` | Stok setelah mutasi, dihitung saat query dengan window function (Σ kumulatif per bahan urut `seq`); tidak disimpan. Urutan insert `koreksi_sync` sebelum `penjualan` (`pengurangan-stok.md`) menjamin nilainya tidak pernah negatif |
| `ref_label` | Teks rujukan: `nomor_struk` untuk `penjualan`/`koreksi_sync`/`pembatalan`; "Restock" + `total_harga`; "Opname" + tanggal; "Stok awal" untuk `stok_awal` |
| Rentang | `dari`, `sampai` (`YYYY-MM-DD`, zona waktu outlet), maks `MAKS_RIWAYAT_LAPORAN_HARI` ke belakang |
