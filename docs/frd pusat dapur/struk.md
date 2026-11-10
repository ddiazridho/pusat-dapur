# FRD: Struk Digital

## Otorisasi

`/struk/[clientTxId]` mengikuti akses transaksi di `pos.md` (`kasir`: transaksi hari ini saja). Pelanggan hanya dapat melihat struk lewat link publik bertoken `/s/[token]`, tanpa login.

## Routes

| Route | Tujuan |
|---|---|
| `/struk/[clientTxId]` | Tampilan struk internal; data dari server atau dari IndexedDB jika transaksi masih `pending` |
| `/s/[token]` | Struk publik untuk pelanggan, read-only |

## Nomor Struk

| Aspek | Aturan |
|---|---|
| Dibuat oleh | Perangkat, saat konfirmasi (online maupun offline) |
| Format | `YYMMDD-XXXXXX-NNN` |
| `YYMMDD` | Tanggal di perangkat saat konfirmasi, zona waktu outlet. Hanya bagian identitas nomor; tanggal resmi transaksi (laporan, tampilan struk) selalu `waktu_transaksi` tersimpan, yang untuk transaksi online diganti waktu server (`pos.md`) |
| `XXXXXX` | 6 karakter hex pertama `device_id`, huruf besar |
| `NNN` | Urutan per perangkat per hari, mulai `001`, minimal 3 digit |
| Regex | Payload dari perangkat: `^\d{6}-[0-9A-F]{6}-\d{3,}$`. Nomor final tersimpan (bisa bersufiks): `^\d{6}-[0-9A-F]{6}-\d{3,}(-\d+)?$`; CHECK constraint DB dan validasi tampilan memakai pola final |
| Keunikan | `UNIQUE (outlet_id, nomor_struk)`. Bentrok saat insert → server menambah sufiks `-2`, `-3`, dst., dan mengembalikan nomor final di response |
| Alasan desain | Nomor dibuat di perangkat agar struk langsung terbit saat offline; prefiks perangkat mencegah bentrok antar-perangkat tanpa koordinasi server; tanggal di depan memudahkan pencarian manual |
| Counter | Disimpan di IndexedDB per tanggal (`offline-sync.md`); data browser dihapus → counter mulai `001` lagi, bentrok ditangani sufiks |

## Isi Struk

| Elemen | Sumber |
|---|---|
| Nama outlet | `outlets.nama_outlet` |
| Nomor struk | `nomor_struk` |
| Waktu | `waktu_transaksi` (format `non-functional.md` NFR-07) |
| Tipe pesanan | `dine_in` → "Makan di tempat", `takeaway` → "Bawa pulang" |
| Item | `nama_menu`, `qty`, `harga_jual`, `subtotal` dari snapshot |
| Total | `total` |
| Metode bayar | `tunai` → "Tunai", `qris` → "QRIS" |
| Uang diterima, kembalian | Hanya untuk `tunai` |
| Status | "Belum terkirim" jika masih `pending` di perangkat; "Gagal terkirim" + `pesan_error` jika `gagal` di perangkat (`offline-sync.md`); "DIBATALKAN" + waktu jika `status = dibatalkan` (`pembatalan-transaksi.md`) |
| Nama kasir | `users.nama` dari `transaksi.dibuat_oleh` (`pos.md`) (struk internal saja) |

- Struk tidak memuat HPP atau margin.

## Struk Publik `/s/[token]`

| Aspek | Aturan |
|---|---|
| `token_struk` | Dibuat server saat insert transaksi: 16 byte acak kriptografis, base64url (22 karakter), `UNIQUE` |
| Isi | Sama dengan Isi Struk, tanpa nama kasir |
| Masa berlaku | `MASA_BERLAKU_STRUK_HARI` (90) hari sejak `waktu_transaksi` (`non-functional.md` NFR-10); setelahnya 404 |
| Token tidak valid | 404 tanpa membedakan kedaluwarsa atau tidak ada |
| Proteksi | Header `X-Robots-Tag: noindex`; rate limit (`non-functional.md` NFR-04); tidak ada link ke halaman lain aplikasi |
| Query | Lookup hanya by `token_struk`; server memakai service role dengan field terbatas, bukan RLS sesi |

## Actions

| Action | Perilaku |
|---|---|
| Kirim via WhatsApp | Buka `https://wa.me/?text=<encodeURIComponent(teks_struk)>`; `teks_struk` = isi struk dalam teks polos, satu item per baris, ditutup link `/s/[token]` jika transaksi sudah tersinkron (`token_struk` dari response `POST /api/transaksi` atau dari antrean lokal, `pos.md`, `offline-sync.md`). Transaksi `pending`/`gagal` dikirim teks saja |
| Kirim ke nomor tertentu | Opsional: kasir mengisi nomor WhatsApp pelanggan (format `08…` atau `+62…`, 10–15 digit) → `https://wa.me/62xxxxxxxxxx?text=…`. Nomor tidak disimpan |
| Salin teks | Menyalin `teks_struk` ke clipboard |
| Cetak | `window.print()` pada halaman struk; CSS cetak lebar 58 mm dan 80 mm (dipilih otomatis oleh dialog cetak); tanpa integrasi printer |
