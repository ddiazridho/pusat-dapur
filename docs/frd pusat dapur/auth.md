# FRD: Autentikasi dan Otorisasi

## Ruang Lingkup

Registrasi pemilik, login/logout, sesi, reset kata sandi, onboarding, peran, matriks akses, dan isolasi outlet. Pembuatan akun kasir di `akun-kasir.md`; akun juri di `akun-demo.md`.

## Model Identitas

| Field | Lokasi | Aturan |
|---|---|---|
| `auth.users.id` | Supabase Auth | Sumber identitas; `users.id` = `auth.users.id` |
| `users.outlet_id` | Tabel `users` | NOT NULL, FK `outlets.id` |
| `users.peran` | Tabel `users` | Enum `pemilik`, `kasir` |
| `users.read_only` | Tabel `users` | Boolean, default `false` |
| `users.nama` | Tabel `users` | 1–100 karakter |
| `users.username` | Tabel `users` | Hanya `kasir`; lihat `akun-kasir.md`. `null` untuk `pemilik` |
| `users.aktif` | Tabel `users` | Boolean, default `true`; akun nonaktif tidak dapat login (`akun-kasir.md`) |
| `users.created_at` | Tabel `users` | Waktu server saat akun dibuat |
| `login_terakhir_at` | Supabase Auth | Tidak disimpan di `users`; dibaca dari `auth.users.last_sign_in_at` dengan service role (`akun-kasir.md`) |
| `app_metadata.outlet_id`, `app_metadata.peran`, `app_metadata.read_only` | JWT Supabase | Disalin dari `users` saat akun dibuat; hanya ditulis server dengan service role |

- Server membaca `outlet_id`, `peran`, `read_only` dari sesi, tidak pernah dari body/query request.
- Setiap Route Handler non-publik (runtime Node.js) memuat baris `users` milik sesi (by `id`) dan menolak dengan 401 `TIDAK_TERAUTENTIKASI` jika `aktif = false`. Middleware Edge hanya membaca JWT (`non-functional.md` NFR-06), sehingga tanpa cek ini kasir nonaktif masih bisa memakai access token yang berlaku hingga 1 jam.
- Satu akun = satu outlet. Satu outlet tepat satu `pemilik` (selain akun demo).

## Routes

| Route | Akses | Tujuan |
|---|---|---|
| `/` | Semua | Redirect sesuai sesi & peran (lihat Redirect Setelah Login) |
| `/daftar` | Publik | Registrasi pemilik |
| `/login` | Publik | Login semua peran |
| `/onboarding` | `pemilik` | Langkah awal isi bahan dan menu |
| `/s/[token]` | Publik | Struk pelanggan (`struk.md`) |
| `/lupa-password` | Publik | Minta email reset kata sandi (`pemilik`) |
| `/reset-password` | Publik, via link email | Set kata sandi baru |
| `/akun` | Semua peran | Ganti kata sandi sendiri, logout |
| `/offline` | Publik | Halaman fallback Service Worker saat halaman pemilik dibuka tanpa internet |
| `POST /api/auth/daftar` | Publik | Buat user, outlet, profil dalam satu transaksi |
| `POST /api/akun/password` | Semua peran non-`read_only` | Ganti kata sandi sendiri |

Login, logout, dan reset memakai `@supabase/ssr` (`signInWithPassword`, `signOut`, `resetPasswordForEmail`). Ganti kata sandi lewat route handler agar cek `read_only` ditegakkan server.

## Field Registrasi

| Field | Aturan |
|---|---|
| `email` | Format email valid, maks 254 karakter, unik di Supabase Auth |
| `password` | 8–72 karakter |
| `nama` | 1–100 karakter |
| `nama_outlet` | 1–100 karakter |

## Alur Registrasi

- Supabase "Confirm email" **dinonaktifkan**: pemilik langsung masuk ke onboarding (US-01). Kepemilikan email dibuktikan saat reset kata sandi. Penyalahgunaan dicegah rate limit 5 registrasi/jam per IP (`non-functional.md` NFR-04).

1. Validasi payload (Zod). Email sudah terdaftar → 409 `EMAIL_SUDAH_TERDAFTAR`.
2. Buat user Supabase Auth.
3. Dalam satu transaksi DB: insert `outlets` (`nama_outlet`, `zona_waktu = Asia/Jakarta`, `ambang_margin = 20`, `blokir_stok_kurang = true`, `onboarding_selesai = false`), insert `users` (`peran = pemilik`, `read_only = false`).
4. Set `app_metadata` (`outlet_id`, `peran`, `read_only`).
5. Gagal di langkah 3–4 → hapus user Supabase Auth yang sudah dibuat; response 500, tidak ada data tersisa.
6. Sukses → sesi aktif, redirect `/onboarding`.

## Login

| Field | Aturan |
|---|---|
| `identitas` | Email, atau `username` kasir. Tanpa karakter `@` → dianggap `username` dan dipetakan ke email internal kasir (`akun-kasir.md`) |
| `password` | 8–72 karakter |

## Sesi

| Aspek | Aturan |
|---|---|
| Access token | JWT Supabase, masa berlaku 1 jam, diperbarui otomatis dengan refresh token |
| Refresh token | Rotasi aktif; sesi berakhir jika tidak dipakai 30 hari |
| Offline | Sesi yang kedaluwarsa saat offline, atau request transaksi yang mendapat 401, tidak menghentikan POS: transaksi masuk antrean dan dikirim setelah login ulang (`pos.md`, `offline-sync.md`) |
| Perubahan `app_metadata` | Server memanggil refresh sesi pengguna terkait; akun dinonaktifkan dicabut sesinya (`akun-kasir.md`) |
| Logout | Diblokir di UI selama perangkat masih punya item `pending` atau item `gagal` dengan `dilaporkan = false` (`offline-sync.md`) |

## Reset dan Ganti Kata Sandi

| Aspek | Aturan |
|---|---|
| Lupa kata sandi | Hanya `pemilik` (akun ber-email nyata). Respon selalu "Jika email terdaftar, link reset sudah dikirim" tanpa membedakan email ada/tidak |
| Link reset | Berlaku 1 jam, sekali pakai, mengarah ke `/reset-password` |
| Kasir lupa kata sandi | Direset pemilik (`akun-kasir.md`) |
| Ganti kata sandi sendiri | `POST /api/akun/password` `{ password_lama, password_baru }`; server memverifikasi `password_lama` (salah → 422 `PASSWORD_LAMA_SALAH`); kata sandi baru 8–72 karakter dan ≠ lama |
| Setelah reset/ganti | Semua sesi lain pengguna dicabut |
| `read_only` | Tidak dapat reset atau ganti kata sandi (403 `READ_ONLY`) |

## Onboarding

| Aspek | Aturan |
|---|---|
| Penanda | `outlets.onboarding_selesai` (boolean, default `false`) |
| Langkah 1 | Tambah bahan baku (`bahan-baku.md`), target ≥ 5 |
| Langkah 2 | Tambah menu dan resep, manual atau dari template (`resep.md`), target ≥ 3 |
| Progres | Ditampilkan sebagai jumlah bahan dan menu ber-resep terhadap target; target tidak memblokir |
| Selesai | Pemilik menekan "Selesai" atau "Lewati" → `PATCH /api/pengaturan` `{ onboarding_selesai: true }`. Nilai tidak dapat kembali `false` |

## Redirect Setelah Login

Setelah login berhasil, client membuka `/`; server (`/`) menentukan tujuan dari tabel ini karena `onboarding_selesai` tidak ada di JWT. Detail implementasi: `docs/architecture/auth-akses.md` → Rute `/`.

| Kondisi | Tujuan |
|---|---|
| `peran = kasir` | `/kasir` |
| `peran = pemilik`, `read_only = false`, dan `onboarding_selesai = false` | `/onboarding` |
| `peran = pemilik` lainnya | `/dashboard` |
| Login gagal | Tetap di `/login`, pesan "Email/username atau kata sandi salah" (tidak membedakan akun tidak ada vs kata sandi salah) |
| Akun nonaktif | Tetap di `/login`, pesan "Akun ini sudah dinonaktifkan pemilik" |

## Middleware

Urutan untuk setiap request ke halaman dan `/api/*`. Route publik (`/daftar`, `/login`, `/lupa-password`, `/reset-password`, `/s/[token]`, `/api/auth/daftar`, `/api/demo/reset`, `/api/cron/cek-invarian`, `/api/health`) melewati langkah 1–3 dan **tetap** menjalani langkah 4, agar rate limit route publik di `non-functional.md` NFR-04 benar-benar berlaku:

| Urutan | Cek | Gagal |
|---|---|---|
| 1 | Sesi Supabase valid | Halaman → redirect `/login`; API → 401 |
| 2 | `read_only = true` dan method ≠ `GET`/`HEAD` | 403 `READ_ONLY` |
| 3 | Peran sesuai matriks akses | Halaman → redirect ke halaman awal peran; API → 403 `AKSES_DITOLAK` |
| 4 | Rate limit sesuai tabel di `non-functional.md` NFR-04 | 429 |

## Matriks Akses

| Modul | Route halaman | `pemilik` | `kasir` | `pemilik` + `read_only` |
|---|---|---|---|---|
| POS | `/kasir` | Penuh | Penuh | Baca |
| Riwayat transaksi | `/kasir/riwayat` | Penuh, termasuk batalkan | Hari ini saja, tanpa batalkan | Baca |
| Struk | `/struk/[clientTxId]` | Penuh | Hari ini saja | Baca |
| Bahan baku | `/bahan`, `/bahan/[id]` | Penuh | Baca, tanpa field biaya dan tanpa riwayat mutasi | Baca |
| Menu dan resep | `/menu`, `/menu/baru`, `/menu/[id]` | Penuh | Tidak | Baca |
| Restock | `/restock` | Penuh | Tidak | Baca |
| Stok opname | `/opname`, `/opname/[id]` | Penuh | Tidak | Baca |
| Dashboard, laporan, alert | `/dashboard` | Penuh | Tidak | Baca |
| Pengaturan outlet | `/pengaturan` | Penuh | Tidak | Baca |
| Akun kasir | `/pengaturan/kasir` | Penuh | Tidak | Baca |
| Akun sendiri | `/akun` | Penuh | Penuh | Baca |
| Onboarding | `/onboarding` | Penuh | Tidak | Tidak (langsung `/dashboard`) |

- Field biaya = `harga_beli_per_satuan`, `hpp_cached`, `hpp_snapshot`, margin. Response API untuk `kasir` tidak menyertakan field ini.
- Pembatasan ditegakkan di server; menyembunyikan tombol di UI bukan kontrol akses.

## Isolasi Outlet

- Setiap query Prisma wajib menyertakan `where: { outlet_id: sesi.outlet_id }`; lookup by ID memakai `id` + `outlet_id`.
- Resource milik outlet lain → 404 `TIDAK_DITEMUKAN` (tidak membedakan dengan tidak ada).
- RLS aktif di semua tabel bisnis. Policy dasar `SELECT`: `outlet_id = (auth.jwt() -> 'app_metadata' ->> 'outlet_id')::uuid` **dan** `app_metadata.peran = 'pemilik'`; tanpa policy tulis untuk role `authenticated` (semua tulis lewat server). Kasir tidak membaca tabel langsung; datanya selalu lewat API yang menyaring field biaya (`docs/architecture/data-model.md` → RLS).
- FK lintas tabel (mis. `resep_detail.bahan_baku_id`) divalidasi berada di outlet yang sama sebelum ditulis.
- Supabase Storage (foto menu) memakai prefix path `{outlet_id}/`. Tulis hanya lewat signed upload URL yang dibuat server setelah memvalidasi prefix `outlet_id` sesi; baca publik (foto menu tidak sensitif dan harus bisa di-cache offline) (`menu.md`).
- Uji wajib: 0 akses lintas outlet pada uji otorisasi API dan RLS.
