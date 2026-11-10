# FRD: Akun Kasir

## Otorisasi

Hanya `pemilik` (non-`read_only`; `read_only` hanya `GET`). Kasir yang dibuat selalu memakai `outlet_id` dari sesi pemilik. Matriks akses kasir di `auth.md`.

## Routes

| Route | Tujuan |
|---|---|
| `/pengaturan/kasir` | Daftar, tambah, ubah, nonaktifkan kasir |
| `GET /api/kasir` | Daftar akun `kasir` di outlet |
| `POST /api/kasir` | Buat akun kasir |
| `PATCH /api/kasir/[id]` | Ubah nama, reset kata sandi, aktif/nonaktif |

## Fields

| Field | Aturan |
|---|---|
| `nama` | 1–100 karakter |
| `username` | 3–30 karakter, regex `^[a-z0-9._]+$`, unik global (case-insensitive), tidak dapat diubah |
| `password` | 8–72 karakter; diset pemilik, tidak pernah dikembalikan di response |
| `aktif` | Boolean, default `true` |

## Login Kasir dengan Username

- Kasir tidak wajib punya email. Akun Supabase Auth kasir memakai email internal `<username>@kasir.pusatdapur.invalid` (TLD `.invalid` dicadangkan RFC 2606, tidak pernah terkirim).
- Form login menerima username; pemetaan ke email internal di `auth.md`.
- Kasir tidak dapat memakai lupa kata sandi; kata sandi direset pemilik.

## Actions

| Action | Perilaku server |
|---|---|
| `GET /api/kasir` | Kembalikan `id`, `nama`, `username`, `aktif`, `created_at`, `login_terakhir_at` untuk `users` dengan `peran = kasir` di outlet sesi; urut `aktif` DESC, `nama` ASC |
| `POST /api/kasir` | Validasi; cek kuota; buat user Supabase Auth via service role (`email_confirm = true`); insert `users` (`peran = kasir`, `read_only = false`, `aktif = true`); set `app_metadata`; response 201 |
| `PATCH /api/kasir/[id]` `{ nama }` | Ubah nama |
| `PATCH /api/kasir/[id]` `{ password }` | Set kata sandi baru via admin API; cabut semua sesi kasir tersebut |
| `PATCH /api/kasir/[id]` `{ aktif: false }` | Set `users.aktif = false`; ban user di Supabase Auth; cabut semua sesi. Transaksi `pending` di perangkat kasir tetap dapat dikirim oleh akun lain di outlet sama (`offline-sync.md`) |
| `PATCH /api/kasir/[id]` `{ aktif: true }` | Cek kuota; cabut ban; `users.aktif = true` |

## Aturan

- Kuota: jumlah `kasir` dengan `aktif = true` per outlet ≤ `MAKS_AKUN_KASIR` (3, `non-functional.md` NFR-10). Melebihi → 409 `KUOTA_KASIR_PENUH`.
- `username` sudah dipakai → 409 `USERNAME_SUDAH_ADA`.
- Akun kasir tidak dihapus permanen karena dirujuk `transaksi.user_id`, `transaksi.dibuat_oleh`, `stok_mutasi.user_id`, dan `transaksi_gagal.user_id`; penghapusan = nonaktif.
- Gagal insert `users` → user Supabase Auth dihapus (tidak ada akun yatim).
- Kasir tidak dapat membuat atau mengubah akun lain.
- `[id]` bukan kasir di outlet sesi → 404.
