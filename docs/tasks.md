# Delivery Roadmap & GitHub Workflow — Pusat Dapur

## Prinsip

PRD (`docs/prd-pusat-dapur.md`), FRD (`docs/frd pusat dapur/`), architecture (`docs/architecture/`), design (`docs/design/`), dan frontend guide (`docs/frontend-guide.md`) menjelaskan produk utuh. File ini hanya **mengurutkan pengerjaan**. Fase bukan batas produk permanen; skema dan batas keamanan dibangun lengkap sejak Phase 0 (`docs/architecture/README.md` → Delivery).

Prioritas jika bertentangan: **FRD/PRD > architecture > design > frontend-guide > tasks.md**. Issue tidak boleh menambah perilaku yang tidak ada di FRD; jika butuh perubahan, ubah FRD dulu.

Tidak ada tanggal di file ini. Jika waktu habis, ikuti **MVP Cutline** di bawah.

## Tim & Kepemilikan

| Peran | Fokus | Memiliki (boleh mengubah) |
|---|---|---|
| **Agent A**: data & server | Skema, migrasi, RLS, auth server, domain service, Route Handlers, cron, infra, CI | `prisma/**`, `supabase/**`, `src/server/**`, `src/app/api/**`, `src/middleware.ts`, `scripts/**`, `vercel.json`, `.github/workflows/**`, `.env.example`, `tests/integration/**`, `tests/http/**`, `tests/unit/server/**`, `vitest.config.int.ts` |
| **Agent B**: client & UI | Design system, layout, halaman, POS, offline/PWA, aksesibilitas | `src/components/**`, `src/client/**`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/(publik)/**`, `src/app/(pemilik)/**`, `src/app/(kasir)/**`, `src/app/akun/**`, `src/app/offline/**`, `src/app/dev/**`, `src/app/sw.ts`, `src/app/manifest.ts`, `src/app/globals.css`, `next.config.ts`, `public/**`, `components.json`, `playwright.config.ts`, `tests/e2e/**`, `tests/unit/client/**`, `tests/unit/components/**` |
| **Bersama** (PR berlabel `kontrak`) | Kontrak & konfigurasi proyek | `src/shared/**`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `tests/unit/shared/**` |

- Agent tidak mengubah file milik agent lain; butuh perubahan → komentar di issue/PR pemilik.
- Halaman RSC milik B memanggil `getPageContext()` dan fungsi domain milik A (impor saja, tidak mengubah).
- Penambahan dependensi = PR kecil terpisah berlabel `kontrak` (mengubah `package.json` + lockfile saja), versi sesuai `docs/architecture/README.md` → Versi Dikunci.
- Kontrak antar-agen = `src/shared/schemas/*` + `docs/architecture/api.md`. UI dibangun terhadap skema ini dengan data fixture (`src/client/fixtures/*`) sebelum API siap, lalu disambungkan.
- **Mode satu agen:** jika hanya satu agen yang mengerjakan, tabel kepemilikan tetap dipakai sebagai batas modul; urutan issue mengikuti nomor (sufiks `a` sebelum `b`).

## GitHub Workflow

| Aspek | Aturan |
|---|---|
| Branch | `{type}/{issue}-{deskripsi-singkat}`, type ∈ `feat`, `fix`, `chore`, `docs`, `test`, `spike`. Contoh `feat/9-buat-transaksi` |
| Target PR | `main` |
| Commit | Conventional Commits (`feat(pos): …`), referensi `#issue` |
| Deskripsi PR | Issue, FRD yang diimplementasi, screenshot 360 px + 1280 px untuk UI, checklist `docs/frontend-guide.md` §16 untuk UI |
| Sebelum PR dependen | `git pull --rebase origin main`, jalankan semua cek lokal |
| Merge | Squash merge; hapus branch |
| Approval | PR biasa: 1 approval agen lain. PR berlabel `kontrak`, PR yang menambah file di `prisma/migrations/`, dan PR keamanan (`src/middleware.ts`, `src/server/auth/**`, RLS): wajib approval **pemilik proyek** |

### PR Gate (`ci.yml`)

| Gate | Aktif sejak |
|---|---|
| `pnpm lint` · `pnpm typecheck` · `pnpm test` (unit) · `pnpm build` | #1a |
| `supabase start` + `prisma migrate deploy` + `pnpm test:int` (integrasi & `skema.test.ts`) | #2 |
| `pnpm test:http` (otorisasi, isolasi, CSRF terhadap `next start` lokal) | #4 |
| `pnpm test:e2e` terhadap `next start` + Supabase lokal | #5 |
| Bundle budget `/kasir` ≤ 170 KB gzip | #13 |
| E2E smoke terhadap Vercel Preview (header bypass proteksi) | #14 |
| Vercel Preview build hijau | #1a |

### Database & Lingkungan

| Aspek | Aturan |
|---|---|
| Pemilik migrasi | **Hanya Agent A** membuat file di `prisma/migrations/` dan memperbarui `prisma/manual-objects.sql.md` (`docs/architecture/data-model.md` → Migrasi) |
| Membuat migrasi | Terhadap Postgres lokal saja: `pnpm db:migrate:local` (`prisma migrate dev --create-only`), tambah SQL manual, hapus `DROP` untuk objek manual, terapkan lokal |
| Dev | Sebelum membuka PR, Agent A menerapkan ke Supabase **dev** dengan `pnpm db:deploy:dev` (`prisma migrate deploy`) agar Preview berjalan. File migrasi yang sudah diterapkan ke dev tidak boleh diedit; perbaikan = migrasi baru |
| Prod | Setelah merge, `migrate-prod.yml` menjalankan `prisma migrate deploy` ke **prod** (GitHub environment `production`, approval pemilik proyek) |
| `ci.yml` | Tidak pernah menerapkan migrasi ke Supabase dev/prod; hanya ke Postgres lokal sementara |
| Kompatibilitas | Expand–contract; migrasi tidak boleh merusak kode versi sebelumnya |
| Data | Lokal & CI: Supabase CLI lokal. Preview: Supabase dev (data uji + demo). Data demo juri hanya di prod |
| Rahasia | Hanya di Vercel env & GitHub secrets; `.env.example` tanpa nilai |

### Definition of Done (semua issue)

1. Kriteria "Selesai jika" issue terpenuhi dan diuji otomatis (unit/integrasi/HTTP/E2E sesuai jenis).
2. Aturan FRD terkait dirujuk di kode uji (nama tes memuat ID, format `BR-08`, `US-06`).
3. Tidak ada field biaya di respons/tampilan kasir; isolasi outlet terjaga (lapis aplikasi + DB).
4. UI: sesuai wireframe & state matrix `docs/design/`, mengikuti `docs/frontend-guide.md`, lolos axe, diuji di 360 × 640 dan 1280 × 800.
5. Dokumentasi diperbarui bila kontrak berubah (`api.md`, skema Zod).

## Aksi Pemilik Proyek (prasyarat manusia)

| # | Aksi | Harus siap sebelum |
|---|---|---|
| H1 | ✅ Buat repo GitHub (folder proyek belum repo git), branch protection `main` (wajib CI hijau + approval), GitHub environment `production` dengan pemilik proyek sebagai approver | #1a |
| H2 | ✅ Akun Vercel, project bernama `pusat-dapur` tersambung repo (domain produksi `pusat-dapur.vercel.app`; jika tidak tersedia, catat domain yang diberikan ke `APP_URL`) | #1a |
| H3 | ✅ 2 project Supabase (`pusat-dapur-dev`, `pusat-dapur-prod`, region Singapura) | #1a |
| H4 | ✅ 1 database Upstash `pusat-dapur-prod` (ap-southeast-1) khusus Production; plan Free hanya 1 database, Preview tanpa Redis | #1a |
| H5 | Akun Brevo + verifikasi satu alamat email pengirim proyek; isi kredensial SMTP di Supabase prod | #14 |
| H6 | Secrets: `CRON_SECRET`, `DEMO_PASSWORD` (`DEMO_EMAIL` = `juri@demo.example.com`), `BACKUP_AGE_RECIPIENT` (simpan kunci privat `age` di luar repo), `VERCEL_AUTOMATION_BYPASS_SECRET` | `CRON_SECRET`: #22a · demo: #24a · backup: #25 · bypass: #14 |
| H7 | Menyetujui PR `kontrak`/migrasi/keamanan dan run `migrate-prod.yml` | Setiap PR terkait |
| H8 | Akun UptimeRobot memantau `https://<APP_URL>/api/health` | #14 |
| H9 | HP Android RAM 2–3 GB; peserta uji (1 kasir baru, 1 pemilik baru); uji TalkBack | #14 (smoke), #25 |
| H10 | Mengisi formulir GTNIC dengan URL produksi & kredensial demo | Setelah #25 |

---

## Phase 0: Loop Inti (online)

Tujuan PRD: *tap pesanan → kurangi stok → catat HPP → laporan* berjalan online end-to-end dan ter-deploy di prod.

| Issue | Owner | Depends | Selesai jika |
|---|---|---|---|
| #1a Foundation infra | A | H1–H4 | Next.js + pnpm + TS strict + versi dikunci, CI dasar, env validation, Vercel/Supabase/Upstash terkonfigurasi; halaman placeholder ter-deploy di Preview & prod |
| #1b Foundation UI tooling | B | #1a | Tailwind v4 + token, shadcn, font, root layout, Playwright + axe terpasang |
| #0 Spike risiko | A | #1a | R1–R5 & R9 (`docs/architecture/README.md` → Risiko) diukur; jalur utama/cadangan terpilih dan dicatat; dokumen terkait diperbarui bila jalur cadangan dipakai |
| #2 Skema DB, RLS, Prisma | A | #1a | 14 tabel + enum + constraint + composite FK + trigger + RLS + index wajib; `forOutlet()`; `skema.test.ts`; seed dev 2 outlet |
| #3 Kontrak & utilitas bersama | B | #1a | `src/shared/**` lengkap; unit test contoh FRD hijau |
| #4 Auth & fondasi server | A | #0, #2, #3 | Middleware, `route()`, `getPageContext()`, rute `/` (logika server), registrasi + kompensasi, ganti/reset kata sandi, revokasi |
| #5 Design system, shell, auth UI | B | #1b, #3 | Komponen + shell + banner + halaman auth, `/`, `/akun`; IndexedDB awal (`meta`, `profil`) |
| #6 Bahan, pengaturan, akun kasir, HPP (API) | A | #4 | Endpoint bahan/pengaturan/kasir, helper alert, `hitung-ulang` HPP + advisory lock |
| #7 Menu, resep, template, foto (API) | A | #6 | Endpoint menu/resep/template/foto memakai HPP dari #6 |
| #8 Restock (API) | A | #7 | Pratinjau, simpan, riwayat |
| #9 Transaksi inti & snapshot (API) | A | #7 | `buatTransaksi(DalamTx)`, `GET /api/transaksi*`, snapshot + ETag + `X-Waktu-Server`, data struk publik |
| #10 UI Stok: bahan & belanja | B | #5, #6, #8 | `/bahan`, `/bahan/[id]`, sheet Tambah Bahan, `/restock` |
| #11 UI Menu, resep, template, onboarding | B | #5, #7, #10 | `/menu*`, `/onboarding` (memakai sheet Tambah Bahan dari #10) |
| #12 UI Pengaturan & akun kasir | B | #5, #6 | `/pengaturan`, `/pengaturan/kasir` |
| #13 POS online, struk, riwayat | B | #5, #9 | `/kasir`, `/struk/[id]`, `/s/[token]`, cetak, WhatsApp, `/kasir/riwayat` |
| #14 Integrasi Phase 0 & deploy prod | A (koordinator), B (E2E) | #1a–#13, H5, H8 | E2E alur inti hijau lokal & Preview; prod ter-deploy; uji isolasi 0 kebocoran |

### Rencana Paralel Phase 0

```
H1–H4
#1a A ─┬─ #0 A ─────────┐
       ├─ #2 A ─────────┴─ #4 A ─ #6 A ─ #7 A ─┬─ #8 A
       │                    ↑                  └─ #9 A
       ├─ #3 B ─────────────┘
       └─ #1b B ─┐
           #3 B ─┴─ #5 B ─┬─ #12 B (setelah #6)
                          ├─ #10 B (setelah #6, #8) ─ #11 B (setelah #7)
                          └─ #13 B (setelah #9)
                                                    └─ #14 A+B
```

- **B mulai #1b dan #3 segera setelah #1a merge**; #3 menjadi kontrak yang dipakai A sejak #4.
- **B membangun UI #10–#13 dengan fixture** begitu #5 selesai, lalu menyambung ke API saat issue A terkait merge (rebase dulu).
- **#9 adalah jalur kritis.** Setelah #7, A mengerjakan #9 sebelum #8.

## Phase 1: Kelengkapan Demo GTNIC

Issue yang punya bagian API dan UI dipecah menjadi `a` (A, API) dan `b` (B, UI) agar tidak ada agen yang menunggu pekerjaan UI agen lain.

| Issue | Owner | Depends | Selesai jika |
|---|---|---|---|
| #15 Laporan & cache (API) | A | #9 | `GET /api/laporan` semua metrik + pembanding + cache version key |
| #16 Alert API & Realtime | A | #6, #9 | `GET/PATCH /api/alert*`, Realtime + RLS teruji |
| #17 Dashboard & pemberitahuan (UI) | B | #5, #15, #16 | `/dashboard` + lonceng + Realtime/fallback |
| #18 PWA & offline sync engine | B | #13 | Serwist, cache shell (`WARM_SHELL`), IndexedDB penuh, alur offline, sync engine, indikator, banner |
| #19a Transaksi gagal (API) | A | #9 | `POST/GET/PATCH /api/sync/gagal` |
| #19b Transaksi gagal (UI) | B | #18, #19a | Laporan otomatis dari sync engine, tab "Gagal terkirim" |
| #20a Stok opname (API) | A | #6, #9 | `POST/GET /api/opname*` |
| #20b Stok opname (UI) | B | #10, #20a | `/opname` (tab Hitung Stok & Riwayat), `/opname/[id]` |
| #21a Pembatalan (API) | A | #9, #20a | `POST /api/transaksi/[clientTxId]/batal` |
| #21b Pembatalan (UI) | B | #13, #21a | Menu ⋮ struk + dialog + stempel |
| #22a Mutasi & cek invarian (API/cron) | A | #9, H6 | `GET /api/bahan-baku/[id]/mutasi`, riwayat harga di detail, cron cek invarian |
| #22b Mutasi (UI) | B | #10, #22a | Tab Riwayat stok & Riwayat harga di `/bahan/[id]` |
| #23 Rate limit, header keamanan, observability | A | #4 | Limiter NFR-04, CSP nonce & header, `/api/health`, `/api/log-client` |
| #24a Akun demo (data & cron) | A | #9, #15, #16, #20a, #21a, H6 | Seed demo, generator, reset, materialisasi |
| #24b Akun demo (UI) | B | #13, #24a | Mode simulasi POS, banner demo, aksi ubah nonaktif |
| #25 Hardening, QA & kesiapan demo | A (koordinator), B | Semua issue Phase 1, H6, H9 | Success Metrics terukur; backup + uji restore; checklist demo |

### Rencana Paralel Phase 1

```
A: #15 ─ #16 ─ #23 ─ #19a ─ #20a ─ #21a ─ #22a ─ #24a ─┐
B: #18 ─ #17 ─ #19b ─ #20b ─ #21b ─ #22b ───── #24b ───┴─ #25 A+B
```

- B memulai #18 segera setelah #13 (tidak butuh API baru) sambil A mengerjakan #15/#16, lalu #17 setelah #15 & #16 merge. #17 tidak bergantung pada #18; urutan ini hanya agar B tidak menganggur.
- Setiap issue `b` dimulai setelah pasangan `a`-nya merge; B mengerjakan dengan fixture selama menunggu.
- #24a terakhir di jalur A karena generator demo memakai semua aturan (opname, pembatalan, alert, laporan).

---

## Detail Issue

Setiap issue merujuk dokumen sumber; checklist di bawah adalah ringkasan yang harus diverifikasi, bukan pengganti FRD.

### #1a Foundation infra · A · `chore/1a-foundation-infra`

Rujukan: architecture `README.md` (Stack, Versi Dikunci), `infra-operasional.md`, `struktur-kode.md`.

- [ ] Next.js 15 App Router, React 19, TypeScript strict, pnpm 10, Node 22; versi sesuai "Versi Dikunci"; `packageManager`, `engines`, `.nvmrc`.
- [ ] Struktur folder sesuai `struktur-kode.md` (folder kosong dengan `README` singkat bila belum dipakai).
- [ ] ESLint + aturan layering (`eslint-plugin-boundaries`) + `server-only`; Prettier.
- [ ] Vitest unit (`vitest.config.ts`) + integrasi (`vitest.config.int.ts`).
- [ ] `src/server/env.ts` & `src/shared/env-public.ts` (Zod, aturan wajib per `VERCEL_ENV`, `APP_ORIGINS` turunan); `.env.example`.
- [ ] `vercel.json` (`regions: ["sin1"]`); env Production → Supabase prod + Upstash `pusat-dapur-prod`, Preview → Supabase dev tanpa Upstash; `APP_URL` prod.
- [ ] Supabase dev & prod dikonfigurasi sesuai `auth-akses.md` → Supabase: Konfigurasi Wajib (Data API off, signup off, confirm email off, JWT asimetris 3600 s, refresh rotation, inactivity 30 hari, rate limit email reset 3/jam, Site URL/redirect).
- [ ] `supabase/` config CLI; skrip `package.json` sesuai `struktur-kode.md`.
- [ ] Perluas `.github/workflows/ci.yml` yang sudah ada (kerangka setup repo: lint, typecheck, unit, integrasi bersyarat) sesuai gate yang aktif sejak #1a; isi `.github/pull_request_template.md` sudah tersedia.
- [ ] Halaman placeholder `/` ter-deploy di Preview dan prod.

### #1b Foundation UI tooling · B · `chore/1b-foundation-ui`

Rujukan: design `tokens.md`; `frontend-guide.md` §4.

- [ ] Tailwind v4 + `globals.css` persis `tokens.md` §8; `shadcn init` (lalu token proyek menimpa token bawaan); `lucide-react`, `sonner`.
- [ ] Root `layout.tsx`: `<html lang="id">`, Inter `variable: "--font-inter"`, `Toaster`, membaca nonce dari header `x-nonce` (diisi middleware di #4/#23; bila kosong tidak dipasang).
- [ ] Playwright (Pixel 5 + desktop) + `@axe-core/playwright` + Testing Library + `fake-indexeddb`.

### #0 Spike risiko · A · `spike/0-risiko`

Rujukan: `docs/architecture/README.md` → Risiko (R1–R5, R9), `auth-akses.md`, `alur-domain.md`.

- [ ] R1: `admin.createUser` dengan `<username>@kasir.pusatdapur.invalid` di Supabase dev. Gagal → jalur cadangan `kasir.example.com`; perbarui `shared/akun.ts` (bila sudah ada), FRD `akun-kasir.md`, `auth-akses.md`.
- [ ] R2: `DELETE FROM auth.sessions` lewat koneksi Prisma berhasil dan refresh token tidak bisa dipakai lagi. Gagal → jalur ban 1 detik.
- [ ] R3: `getClaims()` di middleware Edge memverifikasi JWT tanpa request ke Auth. Gagal → jalur `jose` + JWKS.
- [ ] R4 & R9: 8 query interactive transaction via Supavisor 6543 (`pgbouncer=true&connection_limit=1`) dari deployment Preview `sin1`; total < 300 ms (median dari 20 percobaan). Gagal → jalur CTE.
- [ ] R5: insert `unnest` ±15k baris dalam satu transaksi di Supabase dev < 20 detik. Gagal → jalur GitHub Actions `demo-reset.yml`.
- [ ] Hasil (angka & jalur terpilih) dicatat di kolom "Jalur utama" `architecture/README.md` → Risiko.

### #2 Skema DB, RLS, Prisma · A · `feat/2-skema`

Rujukan: architecture `data-model.md` (termasuk Migrasi); FRD semua file "Fields"; NFR-01, NFR-02, NFR-05.

- [ ] `schema.prisma`: 14 tabel, semua enum, `@map`, Decimal/BigInt sesuai konvensi, composite FK dimodelkan (`@@unique([id, outlet_id])` + relasi komposit), `seq` `BigInt @default(autoincrement())`.
- [ ] SQL manual di migrasi: FK `users.id → auth.users`, semua `CHECK`, partial/expression unique index, trigger `append_only`/`transaksi_immutable`/`updated_at`, fungsi `app.outlet_id()`/`app.is_pemilik()`, RLS + policy `SELECT` pemilik, revoke `anon`, publication `supabase_realtime` (`stok_alert`); semua dicatat di `prisma/manual-objects.sql.md`.
- [ ] Semua index wajib NFR-02 + index [S].
- [ ] `src/server/db.ts`: singleton + `forOutlet(client: PrismaClient, outletId)` + `withTx()` (`struktur-kode.md`) + unit test injeksi `outlet_id`.
- [ ] `scripts/seed-dev.ts`: 2 outlet (pemilik + kasir masing-masing), bahan & menu dari template.
- [ ] Uji integrasi: `skema.test.ts` (semua objek manual ada), stok negatif ditolak, composite FK lintas outlet ditolak, mutasi tidak bisa di-update/delete, transaksi immutable, partial unique alert, RLS (`set local role authenticated`) hanya pemilik outlet sendiri.
- [ ] Migrasi diterapkan ke dev (`db:deploy:dev`); `migrate-prod.yml` dibuat.

### #3 Kontrak & utilitas bersama · B · `feat/3-shared`

Rujukan: architecture `api.md`, `alur-domain.md`; FRD `hpp-margin.md`, `restock.md`, `pengurangan-stok.md`, `struk.md`, `resep.md`; design `konten-aksesibilitas.md` §3.

- [ ] `shared/schemas/*`: payload & query **semua** endpoint `api.md` dengan batas nilai FRD, `.strict()`, tanpa `outlet_id`; tipe respons.
- [ ] `shared/rumus/hpp.ts`, `stok.ts` (`putuskanStok` + adaptor milli-unit/Decimal), `restock.ts`, `uang.ts`.
- [ ] `shared/nomor-struk.ts`, `waktu.ts`, `format.ts` (semua format design + `teks_struk` WhatsApp).
- [ ] `shared/kode-error.ts` (termasuk aturan 422 → `VALIDASI_GAGAL`, `api.md`), `konstanta.ts` (termasuk `DEMO_SEED`), `akses.ts` (`ROUTE_ACCESS`), `templates/resep.ts` (8 template persis FRD), `akun.ts` (`DOMAIN_EMAIL_KASIR`).
- [ ] Unit test: contoh FRD (`hpp_cached = 4800.00`, margin 68,0, harga minimal Rp6.000, 5 kg beras Rp60.000 → 12,00), semua baris tabel keputusan stok, batas hari 3 zona, regex nomor struk.
- [ ] Fixture data demo untuk UI (`src/client/fixtures/`), memakai model konten `docs/design/README.md`.

### #4 Auth & fondasi server · A · `feat/4-auth`

Rujukan: FRD `auth.md`; architecture `auth-akses.md` (termasuk Rute `/`), `api.md`; NFR-04, NFR-06, NFR-09.

- [ ] `middleware.ts`: matcher (kecualikan aset & `/offline`), refresh sesi `@supabase/ssr`, verifikasi JWT (jalur hasil #0), `read_only` (non-GET → 403), peran vs `ROUTE_ACCESS`, redirect halaman, header `x-pd-shell` untuk shell kasir, nonce CSP → header `x-nonce` (CSP lengkap di #23), slot rate limit.
- [ ] `server/http/route()`: Origin ∈ `APP_ORIGINS` + Content-Type untuk mutasi, context loader, cek `aktif` & `sesi_valid_sejak` (presisi detik), Zod, `AppError` → format error, pemetaan error Prisma, materialisasi demo hook (diisi #24a), logger.
- [ ] `getPageContext()` untuk RSC, termasuk aturan redirect `/onboarding` ↔ `/dashboard`; fungsi `tujuanSetelahLogin(ctx)` dipakai `src/app/page.tsx` (B).
- [ ] `POST /api/auth/daftar` (+ `user_metadata.nama`) dengan kompensasi; `app_metadata`; login server setelah daftar.
- [ ] `POST /api/akun/password`, `POST /api/akun/password-reset-selesai`; revokasi sesi (jalur hasil #0).
- [ ] `tests/http`: matriks peran × route (dibangkitkan dari `ROUTE_ACCESS`), `read_only` 403, akun nonaktif 401, token lama setelah ganti sandi 401 (dan token baru di detik yang sama diterima), Origin salah 403, daftar gagal di DB → user Auth terhapus.

### #5 Design system, shell, auth UI · B · `feat/5-design-system`

Rujukan: design `tokens.md`, `komponen.md`, `layout-navigasi.md`, `layar-publik-auth.md` §1–3, §5; `konten-aksesibilitas.md`; `frontend-guide.md` §4–§9, §13; architecture `auth-akses.md` (Login), `offline-pwa.md` (IndexedDB).

- [ ] Komponen: Button (7 varian termasuk `cta`, state memuat), Input, `InputRupiah` (integer & `desimal={2}`), `InputKuantitas`, `Combobox`, `Segmented`, `Switch`, `Search`, `StatusBadge`, badge jumlah, Card/`KartuKPI`/`KartuFilter`/`KartuInfo`/`KartuPeringatan`, `DaftarData`, Dialog, Sheet (+ tombol kembali Android), Toast, EmptyState, Skeleton, `FotoMenu`, `AvatarInisial`.
- [ ] `components/shell/*`: ShellPublik, ShellBackoffice (sidebar + bottom nav + sheet "Lainnya", navigasi per peran dari `ROUTE_ACCESS`), ShellKasir (top bar + drawer), ShellStruk, BannerGlobal (prioritas `layout-navigasi.md` §3).
- [ ] `client/api.ts`, `client/supabase.ts`, hooks `useApi`, `useFormZod`, `usePeran`.
- [ ] `client/offline/db.ts` skema awal (`meta` dengan `device_id`, `profil`); penulisan `profil` dari sesi setelah login; penghapusan saat logout.
- [ ] `src/app/page.tsx` (memanggil `tujuanSetelahLogin` dari #4), `/login`, `/daftar`, `/lupa-password`, `/reset-password`, `/akun`, `not-found`, `error`.
- [ ] `/dev/komponen` (404 di production); axe hijau pada shell & halaman auth; E2E login pemilik & kasir (username) di CI.

### #6 Bahan baku, pengaturan, akun kasir, HPP (API) · A · `feat/6-bahan-pengaturan-kasir`

Rujukan: FRD `bahan-baku.md`, `pengaturan-outlet.md`, `akun-kasir.md`, `alert-stok.md`, `hpp-margin.md`; architecture `alur-domain.md` (Alert, HPP & advisory lock).

- [ ] `domain/hpp/hitung-ulang.ts` (satu statement agregat) + advisory lock `hpp:<outlet>`.
- [ ] `GET/POST /api/bahan-baku`, `GET/PATCH/DELETE /api/bahan-baku/[id]`: mutasi `stok_awal`, `riwayat_harga_beli`, koreksi harga + hitung ulang HPP + daftar menu terdampak, arsip + 409 `BAHAN_DIPAKAI_RESEP`, `status_stok` & `dipakai_di_menu`, serializer kasir tanpa biaya.
- [ ] `domain/stok/alert.ts` (transisi menipis, tidak sinkron, penutupan otomatis).
- [ ] `GET/PATCH /api/pengaturan` (field diizinkan, `onboarding_selesai` satu arah, 422 `VALIDASI_GAGAL`).
- [ ] `GET/POST /api/kasir`, `PATCH /api/kasir/[id]` (Admin API, `user_metadata.nama`, kuota 3, ban/unban, reset sandi + revokasi, kompensasi).
- [ ] Uji: kunci respons kasir tanpa biaya, nama unik case-insensitive, alert transisi saat ubah threshold, kuota kasir, koreksi harga paralel tidak menghasilkan HPP basi, isolasi.

### #7 Menu, resep, template, foto (API) · A · `feat/7-menu-resep`

Rujukan: FRD `menu.md`, `resep.md`, `hpp-margin.md`; architecture `alur-domain.md`, `infra-operasional.md` (Storage).

- [ ] `GET/POST /api/menu`, `GET/PATCH /api/menu/[id]` (+ `resep[]` di POST, field turunan pemilik, filter/urut, `jumlah_terjual_7_hari`).
- [ ] `PUT /api/menu/[id]/resep`, `GET /api/resep-template`, `POST /api/resep-template/[kode]/terapkan` (bahan baru stok 0 + `riwayat_harga_beli awal`); semua memakai hitung ulang HPP + lock dari #6.
- [ ] Bucket `menu-foto` (public read, webp, 300 KB) + `POST/PATCH/DELETE /api/menu/[id]/foto` dengan validasi path (422 `VALIDASI_GAGAL`).
- [ ] Uji: contoh FRD HPP, perubahan resep paralel dengan restock tidak menghasilkan HPP basi, template dengan konflik satuan, foto path outlet lain → 422.

### #8 Restock (API) · A · `feat/8-restock`

Rujukan: FRD `restock.md`; architecture `alur-domain.md` (Restock).

- [ ] `GET /api/restock/pratinjau` (tanpa tulis), `POST /api/restock` (lock HPP, lock bahan, log, riwayat harga, stok, mutasi, HPP, tutup alert), `GET /api/restock` + ringkasan.
- [ ] Validasi satuan input, `MAKS_STOK`, harga per satuan > 10 jt → 422 `VALIDASI_GAGAL`.
- [ ] Uji: HPP semua menu terdampak = rumus (Success Metric "Akurasi HPP 100%"), restock paralel 2 bahan pada menu sama, invarian Σ mutasi.

### #9 Transaksi inti & snapshot (API) · A · `feat/9-transaksi`

Rujukan: FRD `pos.md`, `pengurangan-stok.md`, `offline-sync.md` (aturan server & snapshot), `struk.md`; architecture `alur-domain.md` (Loop Inti, Snapshot).

- [ ] `buatTransaksiDalamTx()` + `buatTransaksi()` (langkah 1–9, keputusan stok online/offline × blokir, koreksi `koreksi_sync`, snapshot `detail_transaksi`, nomor struk final + sufiks, `token_struk`, `waktu_transaksi` clamp, `dibuat_oleh`, `HARGA_BERUBAH`, `MENU_TIDAK_AKTIF`, `UANG_KURANG`, penandaan `transaksi_gagal`); validasi penolakan sebelum tulis.
- [ ] `POST /api/transaksi` (201/200), `GET /api/transaksi` (tanggal, kasir hari ini, filter, ringkasan per metode, paginasi), `GET /api/transaksi/[clientTxId]`.
- [ ] `GET /api/sync/snapshot` (REPEATABLE READ, ETag/304, `X-Waktu-Server`, tanpa biaya).
- [ ] `domain/transaksi/struk-publik.ts` (lookup by token, field terbatas, masa berlaku 90 hari); `page.tsx` `/s/[token]` dibuat B di #13.
- [ ] Uji konkurensi: 20 transaksi paralel bahan sama (stok ≥ 0, invarian), `client_tx_id` sama 10× paralel → 1 baris (BR-08), transaksi offline selalu diterima (BR-07).
- [ ] Log `durasi_ms`; ukur p95 di Preview (target ≤ 2 detik).

### #10 UI Stok: bahan & belanja · B · `feat/10-ui-stok`

Rujukan: design `layar-pemilik.md` §3 (tanpa tab riwayat, menyusul #22b), §6; FRD `bahan-baku.md`, `restock.md`; `frontend-guide.md`.

- [ ] `/bahan` (chip status, cari, `DaftarData`, versi kasir tanpa biaya), `components/pemilik/sheet-tambah-bahan.tsx`, `/bahan/[id]` kartu stok ("Dipakai di N menu") + Ubah (`InputRupiah desimal={2}`) + Arsipkan (+ dialog 409 dengan `detail.menu[]`); versi kasir `/bahan/[id]` tanpa biaya & tanpa aksi.
- [ ] `/restock` tepat 3 field, pratinjau debounce wajib sebelum simpan, peringatan ±50%, `?bahan=`, riwayat belanja.
- [ ] Semua state (memuat/kosong/error/`read_only`).

### #11 UI Menu, resep, template, onboarding · B · `feat/11-ui-menu`

Rujukan: design `layar-pemilik.md` §4–5, `layar-publik-auth.md` §4; FRD `menu.md`, `resep.md`, `auth.md` (Onboarding); `frontend-guide.md`.

- [ ] `/menu` (filter, badge margin/HPP belum lengkap/resep belum diisi/nonaktif).
- [ ] `/menu/baru` (template + status kecocokan + konflik satuan) & `/menu/[id]` (info, foto dengan kompresi client ke WebP ≤ 300 KB, resep, panel HPP sticky, saran harga minimal).
- [ ] `/onboarding` (grup `(publik)`, ShellPublik) 2 langkah, progres target, sheet Tambah Bahan dari #10, Lewati/Selesai.
- [ ] E2E: daftar → onboarding pakai 3 template → menu siap ≤ 10 menit skenario (Success Metric).

### #12 UI Pengaturan & akun kasir · B · `feat/12-ui-pengaturan`

Rujukan: design `layar-pemilik.md` §8–9; FRD `pengaturan-outlet.md`, `akun-kasir.md`; `frontend-guide.md`.

- [ ] `/pengaturan` (zona waktu segmented, ambang margin, switch blokir + penjelasan + dialog).
- [ ] `/pengaturan/kasir` (kuota, tambah dengan kartu kredensial sekali tampil, ubah, reset sandi, nonaktif/aktifkan).

### #13 POS online, struk, riwayat · B · `feat/13-pos`

Rujukan: design `layar-kasir.md` §1–5, §8 (state online), `layar-publik-auth.md` §6–7; FRD `pos.md`, `struk.md`; architecture `offline-pwa.md` (IndexedDB, konfirmasi); `frontend-guide.md` §5–§6.

- [ ] Store IndexedDB `snapshot` & `keranjang` + counter struk di `meta`; snapshot dimuat & di-refresh (5 menit, ETag, `X-Waktu-Server`).
- [ ] `/kasir`: grid (urutan, cari > 12, "Stok kurang" dari stok lokal efektif), bar keranjang, sheet/panel keranjang (3 field, uang cepat, kembalian, QRIS), default D-05.
- [ ] Konfirmasi online: `client_tx_id` & nomor struk sekali, timeout 10 detik, hasil tersimpan, dialog stok kurang / harga berubah / menu nonaktif, pengurangan stok snapshot lokal.
- [ ] `/struk/[clientTxId]`, `/s/[token]` (memakai `struk-publik.ts` dari #9), CSS cetak 58/80 mm, WhatsApp (umum & ke nomor), salin.
- [ ] `/kasir/riwayat` data server (pemilik: pemilih tanggal; kasir: hari ini), ringkasan per metode.
- [ ] Bundle `/kasir` ≤ 170 KB gzip; E2E: kasir baru mencatat 3 item dengan ≤ 6 tap.

### #14 Integrasi Phase 0 & deploy prod · A (koordinator), B (E2E) · `test/14-integrasi-p0`

- [ ] E2E (lokal & Preview): daftar → onboarding → tambah kasir → kasir login (username) → transaksi tunai & QRIS → stok berkurang → belanja bahan → HPP berubah → transaksi baru memakai HPP baru, transaksi lama tetap (BR-04).
- [ ] Suite isolasi `tests/http`: semua endpoint dengan ID outlet lain → 404/403 (US-16).
- [ ] E2E smoke Preview aktif di CI (bypass proteksi).
- [ ] `migrate-prod.yml` dijalankan; prod ter-deploy; SMTP Brevo terpasang (reset kata sandi diuji); UptimeRobot aktif; smoke test manual di HP Android RAM 2–3 GB.

---

### #15 Laporan & cache (API) · A · `feat/15-laporan`

Rujukan: FRD `laporan.md`; architecture `alur-domain.md` (Laporan).

- [ ] `GET /api/laporan` semua metrik + pembanding + `per_hari` dengan tanggal kosong = 0, batas riwayat 90 hari.
- [ ] Cache `lap:{outlet}:v{n}:{periode}` 60 detik (dilewati bila Upstash tidak dikonfigurasi); `invalidasiLaporan()` dipanggil dari semua pemicu FRD.
- [ ] Uji: angka dari snapshot (bukan menu saat ini), transaksi dibatalkan dikecualikan, batas hari zona WITA/WIT.

### #16 Alert API & Realtime · A · `feat/16-alert`

Rujukan: FRD `alert-stok.md`; architecture `data-model.md` (RLS), `README.md` R12.

- [ ] `GET /api/alert` (urutan, rentang 30 hari, `jumlah_belum_dibaca`), `PATCH /api/alert/[id]`, `POST /api/alert/baca-semua`.
- [ ] Realtime (Supabase dev, Data API off): token pemilik menerima INSERT/UPDATE outlet sendiri; kasir & outlet lain tidak menerima. Gagal → R12 (polling jadi mekanisme utama) dan catat di `architecture/README.md`.

### #17 Dashboard & pemberitahuan (UI) · B · `feat/17-ui-dashboard`

Rujukan: design `layar-pemilik.md` §1–2, `komponen.md` §6, §12; `frontend-guide.md`.

- [ ] `/dashboard` mobile & desktop: periode, 4 KPI + pembanding, Perlu perhatian, Margin rendah, Menu terlaris (CSS), Paling menguntungkan, Tren (Recharts lazy, hanya 7/30 hari), proporsi bayar & pesanan, info batal/koreksi (teks), aksi cepat, "diperbarui ‹jam›".
- [ ] Lonceng (sheet/popover) + badge di semua halaman pemilik; Realtime dengan fallback polling 60 detik.
- [ ] Laporan ≤ 3 tap dari beranda (US-12).

### #18 PWA & offline sync engine · B · `feat/18-offline`

Rujukan: FRD `offline-sync.md`, `pos.md` (alur konfirmasi 4a–6); architecture `offline-pwa.md` (termasuk Pengisian Cache Shell Kasir); design `layar-kasir.md` §3.2, §7, §8, `layout-navigasi.md` §3; `frontend-guide.md` §11.

- [ ] Serwist (`next.config.ts`, `sw.ts`): precache aset + `/offline`; cache runtime shell `shell-v<build>` dengan `WARM_SHELL` dan syarat `x-pd-shell`; satu kunci `/struk/_shell`; foto cache-first 150 entri; `/api/*` network-only; manifest & ikon.
- [ ] IndexedDB `antrean_transaksi` (semua field FRD), `navigator.storage.persist()`, kegagalan tulis → dialog "TIDAK tercatat".
- [ ] Alur konfirmasi lengkap: offline (stok lokal efektif + blokir), 401/429 lama → offline, hasil tidak diketahui → pending tanpa cek stok.
- [ ] Sync engine: Web Locks + fallback, serial ASC, tabel respons FRD, backoff 5→300 detik, snapshot setelah sukses, pembersihan `synced`/`gagal`, `BroadcastChannel`.
- [ ] Background Sync `sync-transaksi` + fallback `online` & buka aplikasi.
- [ ] Indikator sinkron semua state, banner offline/data lama/outlet lain/sesi berakhir/versi baru, logout diblokir, riwayat menampilkan item lokal.
- [ ] E2E: login → offline → buka `/kasir` dari cache → 5 transaksi → online → 0 ganda 0 hilang; 500 transaksi antrean terkirim (Success Metric "Integritas transaksi").

### #19a Transaksi gagal (API) · A · `feat/19a-gagal-api`

Rujukan: FRD `offline-sync.md` (Penanganan Item `gagal`).

- [ ] `POST /api/sync/gagal` (upsert, reset `ditangani_at`, `ditangani_otomatis = false`), `GET /api/sync/gagal`, `PATCH /api/sync/gagal/[id]`.

### #19b Transaksi gagal (UI) · B · `feat/19b-gagal-ui`

Rujukan: design `layar-kasir.md` §4.2; `frontend-guide.md`.

- [ ] Laporan otomatis dari sync engine, tab "Gagal terkirim" (lokal + server untuk pemilik), "Coba lagi" maks 3, tandai ditangani.

### #20a Stok opname (API) · A · `feat/20a-opname-api`

Rujukan: FRD `stok-opname.md`; architecture `alur-domain.md` (Opname).

- [ ] `POST /api/opname` (lock urut id, detail dengan `created_at`, mutasi `opname`, tutup `stok_tidak_sinkron`, cek menipis), `GET /api/opname`, `GET /api/opname/[id]`.
- [ ] Uji: alert "stok tidak sinkron" tertutup setelah opname (US-13), opname tidak mengubah HPP (BR-09).

### #20b Stok opname (UI) · B · `feat/20b-opname-ui`

Rujukan: design `layar-pemilik.md` §7; `frontend-guide.md`.

- [ ] `/opname` dua tab: "Hitung Stok" (Perlu dicek di atas, `?fokus=`, selisih langsung, alasan saat selisih ≠ 0, draf `sessionStorage`, dialog tinjau) dan "Riwayat"; `/opname/[id]`.

### #21a Pembatalan transaksi (API) · A · `feat/21a-batal-api`

Rujukan: FRD `pembatalan-transaksi.md`; architecture `alur-domain.md` (Pembatalan).

- [ ] `POST /api/transaksi/[clientTxId]/batal` (batas hari `waktu_transaksi` **dan** `created_at`, pengecualian bahan yang sudah diopname, mutasi `pembatalan`, tutup menipis, invalidasi laporan).
- [ ] Uji: stok kembali sesuai pengurangan bersih termasuk koreksi; tidak bisa batal dua kali.

### #21b Pembatalan transaksi (UI) · B · `feat/21b-batal-ui`

Rujukan: design `layar-kasir.md` §5–5.1; `frontend-guide.md`.

- [ ] Menu ⋮ di struk (pemilik), dialog alasan, stempel DIBATALKAN, toast `bahan_tidak_dikembalikan`.

### #22a Mutasi stok & cek invarian (API/cron) · A · `feat/22a-mutasi-invarian`

Rujukan: FRD `mutasi-stok.md`, `bahan-baku.md` (riwayat harga); architecture `alur-domain.md` (Cek Invarian).

- [ ] `GET /api/bahan-baku/[id]/mutasi` (`stok_berjalan` window function, `ref_label`, cursor `seq`, rentang 90 hari); 10 entri riwayat harga di detail bahan (pemilik).
- [ ] `GET /api/cron/cek-invarian` (stok + HPP), `CRON_SECRET`, entri `vercel.json`.
- [ ] Uji: Success Metric "Akurasi stok" (stok = Σ mutasi 100%) di semua skenario integrasi.

### #22b Mutasi stok (UI) · B · `feat/22b-mutasi-ui`

Rujukan: design `layar-pemilik.md` §3.3; `frontend-guide.md`.

- [ ] Tab Riwayat stok & Riwayat harga di `/bahan/[id]` dengan label jenis mutasi & link struk.

### #23 Rate limit, header keamanan, observability · A · `feat/23-hardening-server`

Rujukan: NFR-04, NFR-09; architecture `infra-operasional.md`, `struktur-kode.md` (Strategi Testing → Rate limit).

- [ ] Upstash limiter 4 jenis di middleware (termasuk route publik), fail-open + log bila Upstash tidak terjangkau/tidak dikonfigurasi, `Retry-After`.
- [ ] CSP nonce lengkap + seluruh header keamanan; `X-Robots-Tag` untuk `/s/*`.
- [ ] `GET /api/health`, `POST /api/log-client`, redaksi log, `X-Request-Id`.
- [ ] Uji: unit limiter dengan Redis tiruan (11 transaksi/detik → 429; 6 pendaftaran/jam per IP → 429) (smoke 429 di Production dikerjakan di #25).

### #24a Akun demo (data & cron) · A · `feat/24a-demo-data`

Rujukan: FRD `akun-demo.md`; architecture `alur-domain.md` (Akun Demo), `auth-akses.md`.

- [ ] `scripts/seed-demo.ts` (env `DEMO_EMAIL/PASSWORD`, `is_demo`, 2 kasir nonaktif), generator PRNG deterministik (`DEMO_SEED`) + simulasi stok (komposisi FRD).
- [ ] `resetDemo()` satu transaksi (`timeout 55_000`, `app.reset_demo`, insert `unnest`), `GET /api/demo/reset` + cron `5 17 * * *` (atau `demo-reset.yml` bila jalur cadangan R5), skrip `pnpm demo:reset`.
- [ ] `materialisasiDemo()` dalam satu transaksi (`timeout 20_000`, advisory lock, semua rencana jam ≤ sekarang, `buatTransaksiDalamTx`), dipanggil `route()` & `getPageContext()` untuk GET outlet demo.
- [ ] Uji: semua mutasi akun demo → 403 (US-15), invarian setelah reset, laporan "hari ini" terisi sesuai jam, reset < 20 detik di prod.

### #24b Akun demo (UI) · B · `feat/24b-demo-ui`

Rujukan: design `layar-kasir.md` §6, `layout-navigasi.md` §3 (banner demo); `frontend-guide.md` §8.

- [ ] Mode simulasi POS (tanpa IndexedDB antrean, tanpa request mutasi, stempel SIMULASI), banner demo, semua tombol ubah nonaktif + penjelasan.

### #25 Hardening, QA & kesiapan demo · A (koordinator), B · `test/25-qa-demo`

- [ ] Ukur & catat semua **Success Metrics** PRD (tabel di bawah).
- [ ] Smoke rate limit Production: 31 `GET /s/<token-acak>` dalam 1 menit → ke-31 mendapat 429 (`struktur-kode.md` → Strategi Testing).
- [ ] Lighthouse CI: `/kasir` ≤ 3 detik (3G, load pertama), ≤ 1 detik dari cache; k6 `POST /api/transaksi` p95 ≤ 2 detik.
- [ ] axe semua halaman; uji manual TalkBack satu alur kasir (H9).
- [ ] `backup.yml` aktif; uji restore dump prod ke Supabase dev + cek invarian (NFR-09).
- [ ] Uji pengguna: 1 kasir baru (pesanan 3 item) dan 1 pemilik baru (onboarding), catat hasil (H9).
- [ ] Checklist demo GTNIC (bagian akhir) lulus di prod.

---

## Success Metrics → Bukti

| Metric PRD | Target | Dibuktikan di |
|---|---|---|
| Waktu rekonsiliasi harian | < 15 menit | #25 uji pengguna (ringkasan riwayat per metode + dashboard) |
| Kecepatan input pesanan | 3 item ≤ 15 detik | #13 E2E tap count, #25 uji pengguna |
| Akurasi stok | Stok = Σ mutasi 100%, tidak negatif | #2 constraint, #9/#22a uji invarian, cron harian |
| Integritas transaksi | 0 ganda, 0 hilang | #9 idempotensi paralel, #18 E2E offline 500 antrean |
| Akurasi HPP | 100% setelah restock | #6/#7/#8 uji paralel, cron cek HPP |
| Isolasi data | 0 akses lintas outlet | #2 RLS, #4/#14 suite isolasi |
| Kemudahan dipakai | Onboarding ≤ 10 menit | #11 E2E, #25 uji pengguna |
| Kesiapan demo | Phase 0 + 1 end-to-end di Vercel, data 30 hari | #24a/#24b, #25 checklist |

## MVP Cutline

| Jika waktu habis setelah… | Yang sudah bisa didemokan | Yang hilang |
|---|---|---|
| **#14** | Loop inti online lengkap: auth, kasir, resep & HPP, stok otomatis, belanja bahan, struk WhatsApp/cetak | Laporan, alert, offline, opname, pembatalan, demo juri |
| **#14 + #15 + #16 + #17** | + Dashboard laba kotor (inti pertanyaan pemilik) | Offline, opname, demo |
| **+ #18** | + Offline-first (pembeda utama PRD) | Item gagal tersendiri, opname, demo |
| **+ #24a/#24b** | + Akun juri read-only & data 30 hari (wajib GTNIC) | Hardening |

Urutan prioritas bila harus memangkas Phase 1: **#15 → #16 → #18 → #17 → #20a/#21a → #24a/#24b → #20b → #21b → #23 → #19a/#19b → #22a/#22b → #25**. #23 adalah lingkup PRD Phase 1; jika dipangkas, rate limit `POST /api/transaksi` & `/api/auth/daftar` tetap dipasang. #24a membutuhkan #20a & #21a (generator memakai opname & pembatalan), sehingga keduanya ikut dikerjakan sebelum demo.

## Checklist Demo GTNIC

- [ ] Prod di `APP_URL`, HTTPS, PWA dapat di-install di Chrome Android.
- [ ] Kredensial demo hanya di formulir pengumpulan; login demo → banner demo, semua tombol ubah nonaktif.
- [ ] Data 30 hari ada; laporan "hari ini" berisi transaksi sesuai jam saat ini; 2 alert menipis + 1 tidak sinkron belum dibaca; 2 menu margin rendah.
- [ ] Mode simulasi POS berjalan, termasuk dialog stok kurang.
- [ ] Skenario demo langsung (akun pemilik uji terpisah): transaksi → stok turun → alert muncul tanpa refresh → matikan internet → 3 transaksi → nyalakan → tersinkron → laporan bertambah.
- [ ] Reset demo & cek invarian berjalan tadi malam tanpa log `error`.
- [ ] `/api/health` 200 (UptimeRobot hijau); backup terakhir < 24 jam.

## Roadmap Pasca-Kompetisi (PRD)

| Versi | Issue kandidat |
|---|---|
| v2.0 | Import pesanan GoFood/GrabFood · Dashboard multi-outlet (tabel relasi user↔outlet, claim outlet aktif) · Export laporan untuk kredit · Billing & kuota paket berbayar · Pindah Vercel Pro + domain kustom |
| v2.1 | Absensi shift & rekap gaji harian · Peringatan kedaluwarsa bahan |
| v3.0 | Saran restock berbasis LLM (pola 30 hari) · Input kasir via chatbot WhatsApp |
