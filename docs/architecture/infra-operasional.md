# Infrastruktur dan Operasional

## Topologi Lingkungan

Satu repository, satu Vercel project, **dua** Supabase project. Kode identik; yang berbeda hanya environment variable.

| Lingkungan | Pemicu | Supabase | Upstash | Data |
|---|---|---|---|---|
| Lokal & CI | `pnpm dev`, tes | **Supabase CLI lokal** (`supabase start`) | Tidak ada (limiter & cache laporan nonaktif, lihat bawah) | Data uji (`seed:dev`) + demo (`seed:demo`) |
| Preview | Push branch / PR | `dev` | DB `dev` | Data uji + demo |
| Production | Merge ke `main` | `prod` | DB `prod` | Pengguna nyata + outlet demo juri |

- Supabase `dev` hanya dipakai Preview (dan `db:deploy:dev`); pengembangan & tes tidak pernah memakai DB remote.
- Domain produksi: `https://pusat-dapur.vercel.app` (domain `*.vercel.app` gratis, sesuai NFR-10). Jika nama project tidak tersedia, gunakan domain produksi `*.vercel.app` yang diberikan Vercel dan isi nilainya di `APP_URL`, Site URL Supabase, dan `docs/architecture/auth-akses.md`. Domain kustom adalah langkah pasca-kompetisi (cukup ubah env & konfigurasi, tanpa ubah kode).
- Region: Vercel Functions `sin1` (Singapura), Supabase `ap-southeast-1`, Upstash `ap-southeast-1` **[S]**. Semua satu region agar round-trip transaksi DB rendah.
- Vercel Cron **hanya berjalan di Production**. Reset demo & cek invarian di `dev` dipicu manual (`curl` dengan `CRON_SECRET` dev).
- Project Supabase Free di-*pause* setelah 7 hari tanpa aktivitas; `prod` tetap aktif karena cron harian, `dev` dibangunkan manual dari dashboard.

## Environment Variable

| Variabel | Scope | Rahasia | Isi |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | semua | Tidak | URL project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | semua | Tidak | Publishable/anon key |
| `SUPABASE_SECRET_KEY` | server | **Ya** | Service role/secret key (Admin API Auth & Storage) |
| `DATABASE_URL` | server | Ya | Supavisor transaction pooler `:6543` + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | migrasi/CI | Ya | Session pooler/direct `:5432` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server + edge | Ya | Wajib bila `VERCEL_ENV` ∈ {`preview`, `production`}; kosong di lokal/CI → limiter fail-open, cache laporan dilewati (hitung langsung), gate materialisasi dilewati (advisory lock tetap melindungi) |
| `APP_URL` | server + edge | Tidak | Production: `https://pusat-dapur.vercel.app`; lokal: `http://localhost:3000` |
| `APP_ORIGINS` (turunan, bukan env) | server + edge | — | Dihitung di `env.ts`: Production = [`APP_URL`]; Preview = [`https://${VERCEL_URL}`, `https://${VERCEL_BRANCH_URL}`]; lokal = [`APP_URL`] |
| `CRON_SECRET` | server | Ya | Dipakai Vercel Cron & route cron (Vercel mengirim `Authorization: Bearer <CRON_SECRET>` otomatis) |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | seed/CI | Ya | Hanya di Vercel & GitHub secrets, tidak di repo (FRD). `DEMO_EMAIL` = `juri@demo.example.com` (domain RFC 2606, tidak menerima email) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | GitHub secret (E2E Preview) | Ya | Token "Protection Bypass for Automation" Vercel |
| `LOG_LEVEL` | server | Tidak | `info` (prod), `debug` (dev) |

- Validasi saat boot dengan Zod di `src/server/env.ts` (server) dan `src/shared/env-public.ts` (client). Variabel wajib hilang → build gagal.
- `.env.example` di-commit tanpa nilai; `.env.local` di-*gitignore*.
- Modul yang membaca rahasia memakai `import 'server-only'`.

## Vercel

| Aspek | Konfigurasi |
|---|---|
| Plan | Hobby (NFR-10) untuk MVP & kompetisi (penggunaan non-komersial). Sebelum monetisasi v2 (PRD), pindah ke Pro; tidak ada perubahan kode |
| Region function | `sin1` (`vercel.json` → `regions`) |
| Fluid Compute | Aktif (mengurangi cold start, berbagi instance) |
| Durasi maksimum | `maxDuration = 60` untuk route cron; default untuk lainnya |
| Build | `pnpm prisma generate && pnpm build` |
| Preview protection | Vercel Authentication aktif untuk Preview (deployment preview tidak publik) |

### Cron (`vercel.json`)

| Path | Jadwal (UTC) | WIB | FRD |
|---|---|---|---|
| `/api/demo/reset` | `5 17 * * *` | 00:05 | `akun-demo.md` |
| `/api/cron/cek-invarian` | `0 18 * * *` | 01:00 | `mutasi-stok.md` |

Hobby hanya mengizinkan cron harian dengan presisi per jam (eksekusi bisa jatuh kapan saja dalam jam tersebut). Jarak satu jam di antara keduanya menjaga cek invarian tidak bertabrakan dengan reset demo dalam kondisi normal; jika bertabrakan pun, reset berjalan dalam satu transaksi sehingga cek invarian melihat keadaan konsisten.

## Supabase

| Komponen | Konfigurasi |
|---|---|
| Postgres | Free tier; ekstensi `pgcrypto` (`gen_random_uuid`) |
| Pooler | Supavisor transaction mode untuk aplikasi; Prisma `connection_limit=1` per instance function |
| Auth | Lihat `auth-akses.md` → "Supabase: Konfigurasi Wajib" |
| Data API | Dimatikan |
| Realtime | Publication `supabase_realtime` hanya berisi `stok_alert` |
| Storage | Bucket `menu-foto` |

### Storage `menu-foto` **[S]**

| Aspek | Aturan |
|---|---|
| Visibilitas | **Public read**: foto menu tidak sensitif, dan URL publik yang stabil memungkinkan cache Service Worker offline (signed URL kedaluwarsa akan merusak cache) |
| Tulis | Hanya via `createSignedUploadUrl` dari server (service role), path divalidasi `{outlet_id}/{menu_id}-{timestamp}.webp` |
| Policy `storage.objects` | Tidak ada policy `INSERT`/`UPDATE`/`DELETE` untuk `anon`/`authenticated`; hapus file lama oleh server |
| Batas | `file_size_limit = 300 KB`, `allowed_mime_types = ['image/webp']` di konfigurasi bucket (hasil kompresi client, FRD `menu.md`) |
| Nama file | Timestamp di nama file berarti URL baru setiap ganti foto → tidak ada masalah cache basi |

### SMTP **[S]**

SMTP bawaan Supabase hanya untuk uji coba (kuota sangat kecil, terbatas ke alamat anggota tim). Keputusan final:

| Aspek | Nilai |
|---|---|
| Penyedia | **Brevo** (free tier 300 email/hari). Dipilih karena mendukung *single sender verification* tanpa domain sendiri, cocok dengan domain `*.vercel.app` |
| Pengirim | Satu alamat email proyek milik pemilik proyek, diverifikasi di Brevo; nama pengirim "Pusat Dapur" |
| Dipakai di | Supabase **prod** (Auth → SMTP Settings). Supabase dev memakai SMTP bawaan (hanya alamat anggota tim) |
| Template | Bahasa Indonesia, subjek "Atur ulang kata sandi Pusat Dapur" |
| Pasca-kompetisi | Saat punya domain kustom: autentikasi domain di Brevo (SPF/DKIM), ganti alamat pengirim; tanpa perubahan kode |

## Upstash Redis

| Pemakaian | Key | Detail |
|---|---|---|
| Rate limit | `rl:<nama>:<kunci>` | `@upstash/ratelimit` sliding window, dipanggil di middleware Edge |
| Cache laporan | `lap:<outlet>:v<n>:<periode>`, `lapver:<outlet>` | TTL 60 detik (`alur-domain.md`) |
| Gate materialisasi demo | `demo:mat:<outlet>` | `NX EX 300` |

### Rate Limit (NFR-04)

| Limiter | Route | Batas | Kunci |
|---|---|---|---|
| `transaksi` | `POST /api/transaksi` | 10 / 1 detik | `outlet_id` (claim) |
| `daftar` | `POST /api/auth/daftar` | 5 / 1 jam | IP (`x-forwarded-for` pertama dari Vercel) |
| `struk_publik` | `/s/[token]` | 30 / 1 menit | IP |
| `mutasi` | Method ≠ GET/HEAD di `/api/*` lainnya | 60 / 1 menit | `user_id` (claim) |

- Upstash tidak terjangkau → **fail-open** dan log `warn` (ketersediaan POS lebih penting daripada rate limit; integritas tetap dijaga DB).
- Respons 429 menyertakan `Retry-After` (detik, dibulatkan ke atas).

## Header Keamanan (Middleware)

| Header | Nilai |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: <supabase-url>; connect-src 'self' <supabase-url> wss://<supabase-host>; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-Robots-Tag` | `noindex` untuk `/s/*` dan semua halaman non-publik |

Nonce CSP membuat halaman dirender dinamis. Shell `/kasir` tetap aman di-cache SW karena header CSP dan HTML yang di-cache berasal dari respons yang sama (nonce konsisten). `style-src 'unsafe-inline'` diperlukan oleh Tailwind/Radix inline style; tidak membuka eksekusi script.

## Observability

| Aspek | Implementasi |
|---|---|
| Log | `src/server/logger.ts`: JSON satu baris ke stdout (`level`, `ts`, `route`, `method`, `status`, `durasi_ms`, `outlet_id`, `user_id`, `kode`, `msg` bahasa Inggris, `req_id`). Redaksi otomatis key `password`, `token`, `authorization`, `cookie`, `token_struk` (NFR-09) |
| Korelasi | `req_id` dari header `x-vercel-id`, dikembalikan sebagai `X-Request-Id` |
| Penampung | Vercel Runtime Logs saja (tanpa Log Drain di MVP) |
| Metrik bisnis | Log `info` per transaksi (`durasi_ms`, `dibuat_offline`, `koreksi_stok`) agar p95 dapat dihitung dari log |
| Error client | `window.onerror` + `unhandledrejection` dikirim ke `POST /api/log-client` **[S]** (rate limit `mutasi`, payload ≤ 4 KB, tanpa data struk) |
| Health | `GET /api/health` (NFR-09); dipantau **UptimeRobot** (free) setiap 5 menit, notifikasi email ke pemilik proyek |
| Alarm invarian | Log `error` `INVARIAN_STOK` / `INVARIAN_HPP` dari cron; dicek setiap pagi sebelum demo |

## Backup dan Pemulihan

| Lapisan | Mekanisme |
|---|---|
| Supabase | Backup otomatis sesuai plan. Free tier tidak menyediakan restore mandiri/PITR, sehingga **tidak diandalkan sendiri** |
| Tambahan **[S]** | GitHub Actions `backup.yml` harian 19:00 UTC: `pg_dump --format=custom` dari `DIRECT_URL` prod (skema `public` + `auth`), dienkripsi `age` dengan kunci publik di secret `BACKUP_AGE_RECIPIENT` (kunci privat disimpan pemilik proyek di luar repo), disimpan sebagai artifact privat (retensi 7 hari) |
| Uji restore | Sekali sebelum demo (NFR-09): restore dump ke project `dev`, jalankan cek invarian |
| Storage | Foto menu dapat diunggah ulang; tidak dibackup |

## Kuota dan Konstanta

`src/shared/konstanta.ts` (NFR-10): `MAKS_AKUN_KASIR = 3`, `MAKS_RIWAYAT_LAPORAN_HARI = 90`, `MASA_BERLAKU_STRUK_HARI = 90`, `MAKS_STOK`, batas rate limit, `LAPORAN_CACHE_DETIK = 60`, `SNAPSHOT_INTERVAL_MENIT = 5`, `ANTREAN_MIN = 500`. Konstanta kuota terpisah dari konstanta non-kuota sesuai FRD.

## Estimasi Pemakaian Free Tier (Skala Demo)

| Sumber daya | Perkiraan | Batas free tier (acuan saat dokumen ditulis; dicatat ulang di #1a bila berbeda) |
|---|---|---|
| Postgres | < 50 MB (outlet demo 30 hari ≈ 15k baris) | 500 MB |
| Storage | < 20 MB | 1 GB |
| Upstash | ~2 perintah per request API → puluhan ribu/bulan | 500k perintah/bulan |
| Vercel function invocation | Ribuan/hari | Kuota Hobby |
| Realtime | Beberapa koneksi pemilik | 200 koneksi bersamaan |
