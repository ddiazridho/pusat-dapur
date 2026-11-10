# Auth, Akses, dan Isolasi Outlet

Aturan fungsional ada di FRD `auth.md`, `akun-kasir.md`, `akun-demo.md`. Dokumen ini menjelaskan cara penegakannya di setiap lapis.

## Lapisan Penegakan

```
Request
  │
  ▼
[1] Middleware (Edge)         sesi JWT valid · read_only vs method · peran vs route · rate limit · CSP nonce
  │
  ▼
[2] Route guard (Node.js)     muat users+outlets by sesi · aktif · sesi_valid_sejak · peran per handler
  │                           · Origin + Content-Type (mutasi) · Zod
  ▼
[3] Domain service            ctx.outletId dari sesi · Prisma forOutlet() · field biaya disaring per peran
  │
  ▼
[4] Database                  composite FK satu outlet · CHECK · trigger append-only
  │
[5] RLS                       hanya untuk akses langsung Supabase (Realtime); Data API dimatikan
```

Setiap lapis berdiri sendiri: menghapus satu lapis tidak membuka akses lintas outlet.

## Identitas dan Sesi

| Aspek | Implementasi |
|---|---|
| Identitas | Supabase Auth; `users.id = auth.users.id` |
| Claim | `app_metadata.outlet_id`, `app_metadata.peran`, `app_metadata.read_only`; ditulis hanya oleh server via Admin API (service role) |
| Penyimpanan sesi | Cookie `@supabase/ssr` (httpOnly, `Secure`, `SameSite=Lax`) |
| Access token | JWT 1 jam, **asymmetric signing key** (JWKS) sehingga middleware Edge memverifikasi lokal dengan `supabase.auth.getClaims()` tanpa request ke server Auth |
| Refresh | Rotasi refresh token aktif; middleware menyegarkan cookie bila access token hampir habis |
| Masa idle | 30 hari (pengaturan "inactivity timeout" Supabase Auth) |
| Konfirmasi email | Nonaktif (FRD) |

### Revokasi Segera **[S]**

Access token yang sudah terbit tetap valid hingga 1 jam. Untuk memenuhi "akun nonaktif tidak dapat dipakai" dan "setelah ganti/reset kata sandi semua sesi lain dicabut":

| Kejadian | Aksi server |
|---|---|
| Kasir dinonaktifkan | `users.aktif = false`, `users.sesi_valid_sejak = date_trunc('second', now())`, `admin.updateUserById(id, { ban_duration: '876000h' })`, hapus sesi Auth user tersebut |
| Kata sandi kasir direset pemilik | `admin.updateUserById(id, { password })`, `sesi_valid_sejak = date_trunc('second', now())`, hapus sesi Auth |
| Ganti kata sandi sendiri | Verifikasi kata sandi lama (`signInWithPassword` di server client terisolasi tanpa cookie), update kata sandi, `sesi_valid_sejak = date_trunc('second', now())`, hapus semua sesi Auth, lalu login ulang di server untuk menulis cookie sesi baru ke response |
| Reset via email | Halaman `/reset-password` memanggil `POST /api/akun/password-reset-selesai` **[S]** setelah `updateUser`; server menjalankan langkah yang sama dengan "Ganti kata sandi sendiri" mulai dari `sesi_valid_sejak` (tanpa verifikasi kata sandi lama) |

Route guard menolak 401 `TIDAK_TERAUTENTIKASI` bila `jwt.iat < extract(epoch from users.sesi_valid_sejak)` atau `users.aktif = false`. `sesi_valid_sejak` selalu dibulatkan ke bawah ke detik (`iat` JWT berpresisi detik), sehingga token baru yang terbit pada detik yang sama dengan revokasi tetap diterima.

Penghapusan sesi Auth (final): `DELETE FROM auth.sessions WHERE user_id = $1` lewat koneksi Prisma server (refresh token ikut terhapus lewat FK cascade). Jika spike #0 membuktikan role koneksi tidak berhak menghapus `auth.sessions`, jalur cadangan yang sudah final: `admin.updateUserById(id, { ban_duration: '1s' })` lalu, untuk akun yang tetap aktif, `admin.updateUserById(id, { ban_duration: 'none' })` setelah 2 detik. Keduanya digabung dengan `sesi_valid_sejak` sehingga access token lama tetap ditolak.

## Rute `/` dan Redirect Setelah Login

| Kondisi | Aksi `src/app/page.tsx` (RSC, `getPageContext()` tanpa batas peran) |
|---|---|
| Tanpa sesi | `redirect('/login')` |
| `peran = kasir` | `redirect('/kasir')` |
| `pemilik`, `read_only = false`, `onboarding_selesai = false` | `redirect('/onboarding')` |
| `pemilik` lainnya (termasuk `read_only`) | `redirect('/dashboard')` |

- Form login (client) setelah `signInWithPassword` berhasil selalu menavigasi ke `next` (jika ada dan diizinkan peran) atau `/`. Keputusan tujuan ada di server (tabel di atas), karena `onboarding_selesai` tidak ada di JWT.
- `getPageContext()` halaman `/dashboard` juga mengalihkan ke `/onboarding` bila `onboarding_selesai = false` dan bukan `read_only`. Halaman `/onboarding` mengalihkan ke `/dashboard` bila `onboarding_selesai = true` atau `read_only`.

## Middleware (Edge)

File `src/middleware.ts`, berjalan untuk semua route kecuali aset statis dan halaman offline (`matcher` mengecualikan `/_next/*`, `/icons/*`, `/sw.js`, `/manifest.webmanifest`, `/favicon.ico`, `/offline`). Untuk respons halaman `/kasir`, `/kasir/riwayat`, `/struk/*` middleware menambahkan header `x-pd-shell: 1` (syarat cache shell, `offline-pwa.md`).

Verifikasi JWT: `supabase.auth.getClaims()` (JWKS asimetris, tanpa request ke server Auth). Jalur cadangan final bila spike #0 membuktikan `getClaims()` tidak berjalan di Edge: verifikasi dengan `jose.jwtVerify` terhadap `createRemoteJWKSet(new URL(\`${SUPABASE_URL}/auth/v1/.well-known/jwks.json\`))`, cache JWKS 10 menit.

| Urutan | Cek | Sumber data | Gagal |
|---|---|---|---|
| 0 | Buat nonce CSP, set header keamanan | — | — |
| 1 | Sesi valid (route non-publik) | `getClaims()` | Halaman → `/login?next=…`; API → 401 |
| 2 | `read_only` && method ∉ {GET, HEAD} | claim | 403 `READ_ONLY` |
| 3 | Peran vs prefix route | claim + tabel `ROUTE_ACCESS` | Halaman → halaman awal peran; API → 403 `AKSES_DITOLAK` |
| 4 | Rate limit | Upstash (`infra-operasional.md`) | 429 + `Retry-After` |

Route publik melewati 1–3 dan tetap menjalani 4 (FRD `auth.md`). Route cron melewati 1–3 dan memeriksa `CRON_SECRET` di handler.

`ROUTE_ACCESS` adalah tabel konstanta di `src/shared/akses.ts` yang memetakan prefix halaman & API ke peran yang boleh. Middleware hanya memeriksa level modul; aturan halus (mis. kasir hanya transaksi hari ini, field biaya) ada di route guard dan domain service.

> Middleware **bukan** satu-satunya kontrol: setiap Route Handler tetap memanggil `requireAuth({ peran })`. Ini juga menutup celah CVE kelas "middleware bypass" di Next.js.

## Route Guard (Node.js)

Semua Route Handler dibungkus `route()` (`struktur-kode.md`):

```ts
export const runtime = 'nodejs';
export const POST = route(
  { peran: ['pemilik', 'kasir'], mutasi: true, body: TransaksiPayload },
  async ({ ctx, body }) => buatTransaksi(ctx, body),
);
```

`route()` melakukan:

1. Untuk `mutasi: true`: `Content-Type` harus `application/json`, header `Origin` ∈ `APP_ORIGINS` (`infra-operasional.md`) → selain itu 403 `AKSES_DITOLAK`.
2. Baca claim dari cookie (`@supabase/ssr` server client, `getClaims()`).
3. Satu query: `users` ⋈ `outlets` by `users.id` → `ctx = { userId, outletId, peran, readOnly, nama, outlet: { zonaWaktu, ambangMargin, blokirStokKurang, isDemo } }`.
4. Tolak jika `aktif = false`, `iat < sesi_valid_sejak`, atau claim `outlet_id`/`peran` ≠ baris `users` (claim basi).
5. Cek `peran` handler dan `readOnly` (pengulangan cek middleware).
6. Jika `ctx.outlet.isDemo` dan method `GET`: jalankan `materialisasiDemo(ctx)` (`alur-domain.md`).
7. Parse body/query dengan Zod → 422 `VALIDASI_GAGAL`.
8. Jalankan handler; petakan `AppError` dan error Prisma ke format error FRD; log terstruktur.

Server Components halaman memakai `getPageContext({ peran })` dengan langkah 2–6 yang sama dan `redirect()` alih-alih JSON.

## Matriks Akses → Implementasi

| Aturan FRD | Ditegakkan di |
|---|---|
| Modul per peran | Middleware (`ROUTE_ACCESS`) + `route({ peran })` |
| `read_only` hanya GET/HEAD | Middleware + `route({ mutasi: true })` |
| Field biaya tidak ke kasir | Serializer per peran di domain (`serialize.bahan(row, ctx)`); field biaya tidak pernah ada di objek respons kasir. Uji kontrak memeriksa kunci respons kasir |
| Kasir: transaksi hari ini | Domain `transaksi/query.ts` membandingkan tanggal `waktu_transaksi`/`created_at` di zona outlet |
| Pembatalan hanya pemilik | `route({ peran: ['pemilik'] })` |
| Alert tidak ke kasir | API: peran; Realtime: RLS `app.is_pemilik()` |

## Isolasi Outlet

| Lapis | Mekanisme |
|---|---|
| Sumber `outlet_id` | Hanya `ctx.outletId`. Skema Zod payload **tidak** memiliki field `outlet_id`; field tak dikenal ditolak (`.strict()`) |
| Prisma | `db.forOutlet(ctx.outletId)`: Prisma Client extension yang menambahkan `outlet_id` ke `where` (find/update/delete/count/aggregate/groupBy) dan ke `data` (create/createMany) untuk semua model bisnis. `findUnique` by `id` dilarang lint; gunakan `findFirst({ where: { id } })` yang otomatis ber-outlet |
| Raw SQL | `$queryRaw` wajib menyertakan `outlet_id = ${ctx.outletId}`; helper `sqlOutlet()` dan review checklist |
| Relasi | Composite FK `(x_id, outlet_id)` (`data-model.md`): ID milik outlet lain gagal di DB walau lapis aplikasi lolos |
| Respons | Resource outlet lain → 404 `TIDAK_DITEMUKAN` (sama dengan tidak ada) |
| Storage | Path `{outlet_id}/…` divalidasi server sebelum membuat signed URL dan saat konfirmasi |
| Realtime | Filter `outlet_id=eq.<outlet>` di client **dan** RLS (filter client bukan kontrol keamanan) |
| Uji | Suite `isolasi.test.ts`: dua outlet seed; setiap endpoint dipanggil dengan ID milik outlet lain → 404/403; uji RLS dengan `set local role authenticated` + `request.jwt.claims` |

## Supabase: Konfigurasi Wajib

| Pengaturan | Nilai |
|---|---|
| Data API (PostgREST) | **Dimatikan** **[S]** |
| Confirm email | Off |
| JWT signing | Asymmetric (ECC/RSA), JWKS dipakai `getClaims()` |
| JWT expiry | 3600 detik |
| Refresh token rotation | On; reuse interval default |
| Inactivity timeout | 30 hari |
| Rate limit email | 3 email reset/jam per email (FRD) |
| SMTP | Kustom (`infra-operasional.md`) |
| Site URL / redirect | Prod: `https://pusat-dapur.vercel.app` (redirect `https://pusat-dapur.vercel.app/reset-password`). Dev: `http://localhost:3000` + `https://*-<vercel-team>.vercel.app/**` (pola Preview) |
| Signup publik | **Off** di Supabase (signup hanya lewat `POST /api/auth/daftar` dengan service role) agar rate limit & pembuatan outlet tidak bisa dilewati |

## Registrasi Pemilik (Kompensasi)

`POST /api/auth/daftar` (FRD `auth.md`):

1. Zod → `admin.createUser({ email, password, email_confirm: true, user_metadata: { nama } })`; konflik → 409 `EMAIL_SUDAH_TERDAFTAR`. (`POST /api/kasir` juga mengisi `user_metadata.nama`; ubah nama kasir memperbarui `user_metadata.nama` dan `users.nama` bersamaan.)
2. `prisma.$transaction`: insert `outlets`, insert `users`.
3. `admin.updateUserById(id, { app_metadata })`.
4. Gagal di 2–3 → `admin.deleteUser(id)` (best-effort; kegagalan dicatat log `error` dengan `user_id` untuk pembersihan manual).
5. Login di server (`signInWithPassword` melalui server client) → cookie sesi di response → client redirect `/onboarding`.

Pola yang sama (Auth dulu, DB, metadata, kompensasi) dipakai `POST /api/kasir`.

## Login Kasir dengan Username

- Form `/login`: input tanpa `@` → client memetakan ke `${username.toLowerCase()}@${DOMAIN_EMAIL_KASIR}` lalu `signInWithPassword`. `DOMAIN_EMAIL_KASIR` = `kasir.pusatdapur.invalid` (konstanta di `shared/akun.ts`, dipakai juga oleh pembuatan akun). Jalur cadangan final bila spike #0 membuktikan Supabase menolak TLD `.invalid`: `kasir.example.com` (domain cadangan RFC 2606, tidak pernah menerima email). Konstanta diganti sebelum akun kasir pertama dibuat; FRD `akun-kasir.md` diperbarui di PR yang sama.
- Pesan error login seragam (FRD). Akun dibanned → Supabase mengembalikan error "user banned" → pesan "Akun ini sudah dinonaktifkan pemilik".
- Setelah login: client menulis store `profil` IndexedDB dari sesi: `user_id` = `sub`, `peran`/`outlet_id`/`read_only` dari `app_metadata`, `nama` dari `user_metadata.nama` (`offline-pwa.md`). Lalu client mengirim `WARM_SHELL` ke Service Worker dan menavigasi ke `next` atau `/` (lihat "Rute `/`").

## Akun Demo

| Aspek | Implementasi |
|---|---|
| Pembuatan | `pnpm seed:demo` (`scripts/seed-demo.ts`) membaca `DEMO_EMAIL`, `DEMO_PASSWORD`; idempoten; membuat outlet `is_demo = true`, 1 pemilik `read_only`, 2 kasir `aktif = false` |
| Penegakan | Claim `read_only` → middleware + route guard 403 |
| Mode simulasi POS | Client-only (`offline-pwa.md`) |
| Reset & materialisasi | `alur-domain.md` |
| Lingkungan | Hanya di Supabase `prod` (dan `dev` untuk pengujian) |
