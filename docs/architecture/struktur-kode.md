# Struktur Kode, Konvensi, dan Testing

## Struktur Repository

```
.
├─ docs/                         PRD, FRD, architecture
├─ prisma/
│  ├─ schema.prisma
│  ├─ manual-objects.sql.md      daftar objek SQL manual (data-model.md → Migrasi)
│  └─ migrations/                SQL Prisma + SQL manual (RLS, CHECK, trigger, partial index)
├─ public/                       ikon PWA (icons/), favicon
├─ scripts/
│  ├─ seed-demo.ts               buat outlet & akun demo (idempoten)
│  └─ seed-dev.ts                dua outlet uji untuk dev/integrasi
├─ src/
│  ├─ middleware.ts              Edge: sesi, read_only, peran, rate limit, CSP
│  ├─ app/
│  │  ├─ layout.tsx              root: <html lang="id">, font, Toaster, nonce CSP (dibaca dari header)
│  │  ├─ page.tsx                `/`: redirect sesuai sesi & peran (auth-akses.md → Rute `/`)
│  │  ├─ not-found.tsx, error.tsx, global-error.tsx
│  │  ├─ (publik)/               login, daftar, lupa-password, reset-password, onboarding, s/[token]
│  │  ├─ (pemilik)/              dashboard, bahan, menu, restock, opname, pengaturan
│  │  ├─ (kasir)/                kasir, kasir/riwayat, struk/[clientTxId]  ← shell client, offline
│  │  ├─ akun/
│  │  ├─ offline/                halaman statis, publik (di luar matcher auth middleware)
│  │  ├─ dev/komponen/           katalog komponen; 404 bila VERCEL_ENV = production
│  │  ├─ api/                    route.ts per endpoint (tipis: route() + panggil domain)
│  │  ├─ manifest.ts
│  │  └─ sw.ts                   Service Worker (Serwist)
│  ├─ server/                    ── hanya server (`import 'server-only'`)
│  │  ├─ env.ts
│  │  ├─ db.ts                   PrismaClient singleton + extension forOutlet()
│  │  ├─ supabase/               server client (@supabase/ssr), admin client (secret key)
│  │  ├─ http/                   route(), getPageContext(), AppError, pemetaan error, serializer
│  │  ├─ auth/                   context loader, revokasi sesi
│  │  ├─ redis.ts, ratelimit.ts, cache-laporan.ts
│  │  ├─ logger.ts
│  │  └─ domain/
│  │     ├─ transaksi/           buat-transaksi, batal, query, nomor-struk-server
│  │     ├─ stok/                restock, opname, alert, mutasi-query
│  │     ├─ hpp/                 hitung-ulang
│  │     ├─ bahan/, menu/, resep/, akun/, pengaturan/
│  │     ├─ laporan/
│  │     ├─ sync/                snapshot, transaksi-gagal
│  │     └─ demo/                generator, reset, materialisasi
│  ├─ shared/                    ── isomorfik (client + server + SW), tanpa dependensi server
│  │  ├─ schemas/                Zod: payload & query semua endpoint
│  │  ├─ rumus/                  hpp, stok (putuskanStok), restock (konversi), uang
│  │  ├─ templates/resep.ts      8 template MVP
│  │  ├─ akses.ts                ROUTE_ACCESS (matriks peran)
│  │  ├─ kode-error.ts
│  │  ├─ konstanta.ts
│  │  ├─ nomor-struk.ts
│  │  ├─ waktu.ts                batas hari per zona outlet
│  │  └─ format.ts               Rupiah, tanggal, kuantitas
│  ├─ client/                    ── hanya browser
│  │  ├─ offline/                lihat offline-pwa.md
│  │  ├─ hooks/                  useApi, useFormZod, usePeran, useSinkron
│  │  ├─ fixtures/               data contoh UI (model konten docs/design/README.md)
│  │  ├─ api.ts                  fetch wrapper (JSON, error → ApiError)
│  │  ├─ supabase.ts             browser client (Auth, Realtime, Storage upload)
│  │  └─ realtime-alert.ts
│  └─ components/
│     ├─ ui/                     shadcn/ui
│     ├─ bersama/                komponen [W] lintas modul (docs/design/komponen.md)
│     ├─ shell/                  ShellPublik, ShellBackoffice, ShellKasir, ShellStruk, BannerGlobal
│     ├─ kasir/                  grid menu, keranjang, panel bayar, indikator sync
│     └─ pemilik/                tabel, form, grafik (lazy)
├─ tests/
│  ├─ unit/                      Vitest: shared/ (bersama), server/ (A), client/ & components/ (B; Testing Library, fake-indexeddb)
│  ├─ integration/               Vitest + Postgres lokal: domain, skema, RLS, konkurensi
│  ├─ http/                      Vitest + `next start` lokal: otorisasi, isolasi, CSRF
│  └─ e2e/                       Playwright
├─ supabase/                     config Supabase CLI (lokal) + seed
├─ vercel.json                   regions, crons
└─ .github/workflows/            ci.yml, migrate-prod.yml, backup.yml
```

## Aturan Layering

| Dari ↓ boleh impor → | `shared` | `server` | `client` | `components` |
|---|---|---|---|---|
| `app/api/*` | ✓ | ✓ | ✗ | ✗ |
| `app/(…)/page.tsx` (RSC) | ✓ | ✓ | ✗ | ✓ |
| Client component | ✓ | ✗ | ✓ | ✓ |
| `app/sw.ts` | ✓ | ✗ | `client/offline` saja | ✗ |
| `server/domain` | ✓ | ✓ | ✗ | ✗ |
| `shared` | ✓ | ✗ | ✗ | ✗ |

Ditegakkan oleh ESLint (`no-restricted-imports` / `eslint-plugin-boundaries`) dan `server-only`.

## Konvensi Kode

| Aspek | Aturan |
|---|---|
| Bahasa identifier | Istilah domain Bahasa Indonesia mengikuti FRD (`bahanBaku`, `hppCached`, `buatTransaksi`); istilah teknis Inggris (`route`, `cache`, `logger`) |
| Route Handler | Tipis: `route({...}, handler)` yang memanggil satu fungsi domain; tanpa logika bisnis |
| Route group & layout | `layout.tsx` route group **tidak** memasang shell dan **tidak** memeriksa peran. Setiap `page.tsx` memasang shell-nya sendiri (`components/shell/*`) dan memanggil `getPageContext({ peran })` (kecuali halaman `(kasir)` yang client-only). Nama grup hanya pengelompokan file, bukan batas akses; akses ditentukan `ROUTE_ACCESS` |
| Domain function | Menerima `ctx` (dari sesi) + input tervalidasi; mengembalikan objek domain; **tidak** membaca request/cookie |
| Transaksi DB | Hanya di domain function, lewat `withTx(ctx, fn, opsi?)` = `db.forOutlet(ctx.outletId).$transaction(fn, opsi)` + retry. `tx` di dalam `fn` sudah mewarisi extension outlet |
| Di dalam `$transaction` | **Dilarang** memakai `db` global atau memanggil fungsi yang membuka `$transaction` sendiri (pool `connection_limit=1` → hang P2024). Fungsi yang perlu dipakai di dalam dan di luar transaksi punya dua bentuk: `xxxDalamTx(tx, …)` (inti) dan `xxx(ctx, …)` (pembungkus `withTx`) |
| Prisma | Wajib `db.forOutlet(ctx.outletId)` untuk model bisnis. Lint melarang `prisma.<model>.findUnique` dan akses `prisma` mentah di luar `server/db.ts`, `domain/demo`, dan cron |
| Serialisasi | Serializer eksplisit per peran (`serialize/bahan.ts` dsb.); tidak pernah `return Response.json(prismaRow)` |
| Decimal | `Prisma.Decimal` di server; `toFixed(3)`/`toFixed(2)` saat serialisasi; milli-unit di client |
| Error | `throw new AppError('KODE')`; pesan diambil dari `kode-error.ts` |
| Tanggal | Hanya lewat `shared/waktu.ts` (tidak ada `new Date().toDateString()` ad hoc) |
| Form UI | React state sederhana + skema Zod bersama; tanpa library form berat di bundle POS |
| Data fetching client | `fetch` + hook kecil (`useApi`) dengan revalidasi manual; tanpa TanStack Query di MVP untuk menjaga bundle |

## Prisma Extension `forOutlet()` (Sketsa)

```ts
const MODEL_BISNIS = new Set(['BahanBaku', 'Menu', 'ResepDetail', 'Transaksi', /* … */]);

// Hanya menerima PrismaClient: TransactionClient tidak punya $extends.
// Transaksi dibuka dari client yang sudah di-extend: forOutlet(db, id).$transaction(async (tx) => …)
export function forOutlet(client: PrismaClient, outletId: string) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MODEL_BISNIS.has(model)) return query(args);
          if (operation === 'findUnique' || operation === 'findUniqueOrThrow')
            throw new Error('Gunakan findFirst dengan outlet scope');
          if (operation === 'upsert') throw new Error('Upsert tidak dipakai pada model bisnis');
          if (operation.startsWith('create')) injectData(args, outletId); // create, createMany, createManyAndReturn
          else injectWhere(args, outletId);                                // find*, update*, delete*, count, aggregate, groupBy
          return query(args);
        },
      },
    },
  });
}
```

Uji unit memastikan setiap operasi yang didukung menghasilkan klausa `outlet_id`.

## Strategi Testing

| Tingkat | Alat | Cakupan wajib |
|---|---|---|
| Unit | Vitest (+ Testing Library, `fake-indexeddb`) | `shared/rumus/*` (contoh FRD `hpp-margin.md`, `restock.md`), `putuskanStok` (semua baris tabel keputusan), `nomor-struk`, `waktu` (batas hari 3 zona, pergantian tanggal), skema Zod (batas nilai FRD), milli-unit, konfigurasi limiter (Redis tiruan), komponen berlogika (`InputRupiah`, `InputKuantitas`, `DaftarData`), `client/offline/*` |
| Integrasi domain & skema | Vitest + Postgres lokal (`supabase start`), migrasi dari nol, DB direset per file | `skema.test.ts` (objek manual ada), `buatTransaksi` (online/offline, blokir on/off, koreksi, idempotensi, `HARGA_BERUBAH`, sufiks nomor struk), restock + HPP, opname, pembatalan (termasuk pengecualian opname), alert transisi & penutupan otomatis, invarian Σ mutasi setelah setiap skenario, RLS (`set local role authenticated` + `request.jwt.claims`) |
| Konkurensi | Vitest integrasi, `Promise.all` dengan PrismaClient terpisah (masing-masing `connection_limit=1`) | 20 transaksi paralel pada bahan sama → stok ≥ 0 & invarian; `client_tx_id` sama dikirim 10× paralel → 1 baris; restock paralel 2 bahan pada menu sama → `hpp_cached` benar (ADR-08); transaksi vs opname paralel |
| HTTP (otorisasi, isolasi, CSRF) | Vitest + `fetch` ke `next build && next start` lokal (Supabase lokal, Upstash dimatikan → limiter fail-open). Sesi uji dibuat lewat `signInWithPassword` ke Auth lokal, cookie diteruskan | Matriks peran × endpoint (dibangkitkan dari `ROUTE_ACCESS`), `read_only` semua mutasi → 403, kasir tidak menerima field biaya (cek kunci JSON), ID outlet lain → 404, Origin salah → 403, akun nonaktif & token lama → 401 |
| E2E | Playwright (Chromium, emulasi Pixel 5, throttling 3G) | Lokal/CI: `next start` + Supabase lokal. Preview: hanya alur smoke (#14, #25) dengan header bypass proteksi Vercel. Setiap run membuat outlet baru (email acak) sehingga tidak bentrok antar-PR |
| Rate limit | Unit (limiter + Redis tiruan) + satu smoke di Production (Preview tidak memakai Upstash) | Unit: 11 transaksi/detik → 429; 6 pendaftaran/jam per IP → 429. Smoke Production (#25): 31 `GET /s/<token-acak>` dari satu IP dalam 1 menit → permintaan ke-31 mendapat 429 (tanpa menulis data) |
| Performa | Lighthouse CI (preset mobile), skrip k6 ringan terhadap Preview | LCP `/kasir`, bundle budget; `POST /api/transaksi` p95 ≤ 2 detik pada 5 req/detik |
| Aksesibilitas | `@axe-core/playwright` | Semua halaman, termasuk overlay terbuka |

Kriteria uji FRD (0 transaksi ganda, 0 hilang, invarian 100%, HPP 100%, 0 akses lintas outlet) masing-masing punya minimal satu tes otomatis yang dinamai dengan ID FRD/PRD terkait, format `test('BR-08 idempotensi …')`.

## CI/CD

| Workflow | Pemicu | Langkah (aktif sejak issue) |
|---|---|---|
| `ci.yml` | PR & push | `pnpm install --frozen-lockfile` → lint → typecheck → unit (#1a) → `supabase start` + `prisma migrate deploy` + integrasi & skema (#2) → build (#1a) → HTTP (#4) → E2E lokal (#5) → bundle budget `/kasir` (#13) |
| E2E Preview | PR, setelah Vercel Preview siap (#14) | Playwright smoke terhadap URL Preview (Supabase `dev`), header `x-vercel-protection-bypass` |
| `migrate-prod.yml` | Push ke `main` yang mengubah `prisma/migrations/**` | `prisma migrate deploy` ke `DIRECT_URL` prod (GitHub environment `production`, approval pemilik proyek) |
| `backup.yml` | Harian 19:00 UTC (02:00 WIB) | `pg_dump` prod terenkripsi (`infra-operasional.md`) |
| Vercel | Git integration | Preview per branch; Production dari `main` |

`ci.yml` tidak pernah menerapkan migrasi ke Supabase dev/prod; hanya ke Postgres lokal sementara. Satu-satunya jalur ke prod adalah `migrate-prod.yml`.

Alur migrasi: buat migrasi di lokal (`pnpm db:migrate:local`) → terapkan ke dev (`pnpm db:deploy:dev`) → PR → merge → `migrate-prod.yml`. Karena migrasi expand–contract, urutan deploy Vercel vs migrasi prod tidak menimbulkan downtime.

## Skrip `package.json`

| Skrip | Isi |
|---|---|
| `dev`, `build`, `start` | Next.js (`dev` memakai Supabase lokal, `.env.local`) |
| `lint`, `typecheck` | ESLint, `tsc --noEmit` |
| `test`, `test:int`, `test:http`, `test:e2e` | Vitest unit, Vitest integrasi, Vitest HTTP, Playwright |
| `db:local` | `supabase start` |
| `db:migrate:local` | `prisma migrate dev` terhadap Postgres lokal saja (`DATABASE_URL` lokal) |
| `db:deploy:dev` | `prisma migrate deploy` dengan `DIRECT_URL` Supabase dev (`.env.dev`, tidak di-commit) |
| `seed:dev`, `seed:demo` | Skrip seed |
