# FRD: Alert Stok

## Otorisasi

Baca: `pemilik` termasuk `read_only`. Tandai dibaca: `pemilik` non-`read_only`. `kasir`: tidak menerima alert (API dan Realtime).

## Routes

| Route | Tujuan |
|---|---|
| `/dashboard` | Daftar alert dan badge jumlah belum dibaca |
| `GET /api/alert` | Daftar alert |
| `PATCH /api/alert/[id]` | Tandai dibaca |
| `POST /api/alert/baca-semua` | Tandai semua alert belum dibaca sebagai dibaca |

## Fields (`stok_alert`)

| Field | Aturan |
|---|---|
| `id` | UUID |
| `outlet_id`, `bahan_baku_id` | FK, outlet sama |
| `jenis` | Enum `stok_menipis`, `stok_tidak_sinkron` |
| `sudah_dibaca` | Boolean, default `false` |
| `dibaca_at` | `timestamptz`, diisi saat `sudah_dibaca` menjadi `true` |
| `ditutup_otomatis` | Boolean, default `false`; `true` jika ditutup sistem (lihat Penutupan Alert) |
| `created_at` | Waktu server |

Constraint dedup: partial unique `(bahan_baku_id, jenis) WHERE sudah_dibaca = false`. Insert memakai `ON CONFLICT DO NOTHING`.

## Pembuatan Alert

| `jenis` | Kondisi | Dicek oleh |
|---|---|---|
| `stok_menipis` | Transisi: sebelum operasi `stok_saat_ini >= threshold_min` (atau bahan baru) dan sesudahnya `stok_saat_ini < threshold_min`; atau stok berubah dari > 0 menjadi 0. Untuk `PATCH threshold_min`, kondisi "sebelum" memakai threshold lama | `POST /api/transaksi`, `POST /api/bahan-baku`, `PATCH /api/bahan-baku/[id]`, `POST /api/opname` |
| `stok_tidak_sinkron` | Stok bahan dikoreksi ke 0 saat transaksi (`pengurangan-stok.md`) | `POST /api/transaksi` |

- Alert dibuat dalam transaksi DB yang sama dengan operasi pemicunya.
- Maksimal satu alert belum dibaca per (`bahan_baku_id`, `jenis`).
- Karena `stok_menipis` hanya dibuat saat transisi, alert yang sudah ditandai dibaca tidak muncul lagi di setiap penjualan berikutnya. Alert baru muncul setelah stok pulih lalu turun lagi, atau saat stok habis.
- Pesan `stok_menipis`: "Stok <nama> tinggal <stok> <satuan>, segera belanja." (`habis` → "Stok <nama> habis.")
- Pesan `stok_tidak_sinkron`: "Stok <nama> tidak sinkron, lakukan opname."

## Penutupan Alert

| Cara | Efek |
|---|---|
| `PATCH /api/alert/[id]` dengan `{ "sudah_dibaca": true }` | Set `sudah_dibaca = true`, `dibaca_at = now()`. Nilai `false` → 422 |
| `POST /api/alert/baca-semua` | Sama untuk semua alert belum dibaca outlet; response jumlah yang ditandai |
| Stok opname bahan terkait | Semua `stok_tidak_sinkron` belum dibaca untuk bahan itu ditandai dibaca, `ditutup_otomatis = true` (`stok-opname.md`) |
| Stok pulih | Setelah restock, opname, pembatalan transaksi, atau perubahan `threshold_min` membuat status bahan menjadi `aman` (`stok_saat_ini >= threshold_min` **dan** `stok_saat_ini > 0`, `bahan-baku.md`), `stok_menipis` belum dibaca untuk bahan itu ditandai dibaca, `ditutup_otomatis = true` |
| Bahan diarsipkan | Semua alert belum dibaca bahan itu ditutup, `ditutup_otomatis = true` (`bahan-baku.md`) |

Penutupan otomatis menjaga daftar alert hanya berisi masalah yang masih ada. Alert yang ditutup tetap tersimpan sebagai riwayat.

## Realtime

- Supabase Realtime (Postgres Changes) pada tabel `stok_alert`, event `INSERT` dan `UPDATE`, filter `outlet_id=eq.<outlet_id sesi>`.
- RLS `SELECT` pada `stok_alert`: `outlet_id` = claim JWT dan `app_metadata.peran = 'pemilik'`.
- Alert baru tampil dan badge bertambah di `/dashboard` tanpa refresh.
- Fallback: jika kanal Realtime terputus, client melakukan `GET /api/alert?sudah_dibaca=false` saat tersambung kembali dan setiap 60 detik selama terputus.
- Badge jumlah belum dibaca juga tampil di navigasi semua halaman pemilik.

## Aturan Query `GET /api/alert`

| Parameter | Aturan |
|---|---|
| `sudah_dibaca` | Opsional boolean; default semua |
| `jenis` | Filter opsional |
| Urutan | Belum dibaca dulu; `stok_tidak_sinkron` sebelum `stok_menipis`; lalu `created_at` DESC |
| Rentang | Alert sudah dibaca maks 30 hari ke belakang, dihitung dari `created_at`; belum dibaca tanpa batas |
| Paginasi | `limit` 1–100 (default 50), `cursor` |
| Response | Item alert + `nama` bahan, `stok_saat_ini`, `threshold_min`; field `jumlah_belum_dibaca` untuk badge |
