# Katalog Route dan API

Ringkasan semua route dari FRD dalam satu tempat. Kolom "FRD" menunjuk file sumber aturan detail (payload, validasi, kode error spesifik).

## Konvensi

| Aspek | Aturan |
|---|---|
| Base | `/api/*`, JSON, Route Handler runtime Node.js (`export const runtime = 'nodejs'`) |
| Request mutasi | `Content-Type: application/json`; header `Origin` ∈ `APP_ORIGINS` (`infra-operasional.md`); body `{}` untuk request tanpa data (NFR-04) |
| Validasi | Zod `.strict()` dari `src/shared/schemas/*`; field tak dikenal → 422 |
| Error | `{ "error": { "kode", "pesan", "detail"? } }` (NFR-01) |
| Uang | `number` (integer Rupiah) |
| Kuantitas, harga per satuan, HPP | `string` desimal (`"200.000"`, `"14.00"`) |
| Waktu | ISO 8601 UTC (`2026-11-10T03:15:00.000Z`); client memformat ke zona outlet |
| Paginasi | `?limit=1..100&cursor=<opaque>`; respons `{ items, next_cursor }`. Cursor = base64url dari kunci urut terakhir (mis. `waktu_transaksi` + `id`, atau `seq`) |
| ID di path | UUID; `clientTxId` untuk transaksi (FRD) |
| Caching HTTP | `Cache-Control: private, no-store` untuk semua `/api/*`, kecuali snapshot: `Cache-Control: private, no-cache` + `ETag` + `X-Waktu-Server` pada 200 dan 304 (`alur-domain.md` → Snapshot) |

## Halaman

| Route | Peran | Render | FRD |
|---|---|---|---|
| `/` | Semua | RSC redirect sesuai sesi & peran (`auth-akses.md` → Rute `/`) | `auth.md` |
| `/login`, `/daftar`, `/lupa-password`, `/reset-password` | Publik | RSC + form client | `auth.md` |
| `/s/[token]` | Publik | RSC (data via Prisma field terbatas), `noindex` | `struk.md` |
| `/onboarding` | pemilik | RSC + client | `auth.md` |
| `/dashboard` | pemilik | RSC (laporan awal) + client (filter, Realtime alert, grafik lazy) | `laporan.md`, `alert-stok.md` |
| `/bahan`, `/bahan/[id]` | pemilik, kasir (terbatas) | RSC + client | `bahan-baku.md`, `mutasi-stok.md` |
| `/menu`, `/menu/baru`, `/menu/[id]` | pemilik | RSC + client | `menu.md`, `resep.md` |
| `/restock` | pemilik | Client (pratinjau interaktif) | `restock.md` |
| `/opname`, `/opname/[id]` | pemilik | RSC + client | `stok-opname.md` |
| `/pengaturan`, `/pengaturan/kasir` | pemilik | RSC + client | `pengaturan-outlet.md`, `akun-kasir.md` |
| `/akun` | semua | Client | `auth.md` |
| `/kasir`, `/kasir/riwayat`, `/struk/[clientTxId]` | pemilik, kasir | **Shell tanpa data + client penuh** (dirender dinamis karena nonce CSP, di-cache SW saat runtime; `offline-pwa.md`) | `pos.md`, `struk.md`, `offline-sync.md` |
| `/offline` | Publik (di luar matcher middleware) | Statis, di-precache SW | [S] |
| `/dev/komponen` | Non-production saja | Katalog komponen; `notFound()` bila `VERCEL_ENV = production` | [S] |

`read_only` dapat membuka semua halaman pemilik kecuali `/onboarding` (diarahkan ke `/dashboard`).

## API

Legenda peran: **P** pemilik, **K** kasir, **RO** pemilik `read_only` (hanya GET), **Pub** publik, **Cron** `Authorization: Bearer CRON_SECRET`.

### Auth & Akun

| Method & route | Peran | Ringkas | FRD |
|---|---|---|---|
| `POST /api/auth/daftar` | Pub | Buat Auth user + outlet + users (kompensasi) | `auth.md` |
| `POST /api/akun/password` | P, K | Ganti kata sandi sendiri | `auth.md` |
| `POST /api/akun/password-reset-selesai` | P | [S] Perbarui `sesi_valid_sejak` setelah reset via email | `auth-akses.md` |
| `GET /api/kasir` | P, RO | Daftar kasir + `login_terakhir_at` | `akun-kasir.md` |
| `POST /api/kasir` | P | Buat kasir (kuota 3) | `akun-kasir.md` |
| `PATCH /api/kasir/[id]` | P | Ubah nama / reset password / aktif | `akun-kasir.md` |

Login, logout, dan permintaan email reset dilakukan client langsung ke Supabase Auth (`@supabase/ssr`).

### Pengaturan

| Method & route | Peran | FRD |
|---|---|---|
| `GET /api/pengaturan` | P, RO | `pengaturan-outlet.md` |
| `PATCH /api/pengaturan` | P | `pengaturan-outlet.md` |

### Bahan Baku & Mutasi

| Method & route | Peran | FRD |
|---|---|---|
| `GET /api/bahan-baku` | P, RO, K (tanpa biaya) | `bahan-baku.md` |
| `POST /api/bahan-baku` | P | `bahan-baku.md` |
| `GET /api/bahan-baku/[id]` | P, RO, K (tanpa biaya & riwayat) | `bahan-baku.md` |
| `PATCH /api/bahan-baku/[id]` | P | `bahan-baku.md` |
| `DELETE /api/bahan-baku/[id]` | P | `bahan-baku.md` |
| `GET /api/bahan-baku/[id]/mutasi` | P, RO | `mutasi-stok.md` |

### Menu, Resep, Template

| Method & route | Peran | FRD |
|---|---|---|
| `GET /api/menu` | P, RO | `menu.md` |
| `POST /api/menu` | P | `menu.md` |
| `GET /api/menu/[id]` | P, RO | `menu.md` |
| `PATCH /api/menu/[id]` | P | `menu.md` |
| `POST /api/menu/[id]/foto` | P | `menu.md` (signed upload URL) |
| `PATCH /api/menu/[id]/foto` | P | `menu.md` (konfirmasi path) |
| `DELETE /api/menu/[id]/foto` | P | `menu.md` |
| `PUT /api/menu/[id]/resep` | P | `resep.md` |
| `GET /api/resep-template` | P, RO | `resep.md` |
| `POST /api/resep-template/[kode]/terapkan` | P | `resep.md` |

### Restock & Opname

| Method & route | Peran | FRD |
|---|---|---|
| `GET /api/restock/pratinjau` | P, RO | `restock.md` |
| `POST /api/restock` | P | `restock.md` |
| `GET /api/restock` | P, RO | `restock.md` |
| `POST /api/opname` | P | `stok-opname.md` |
| `GET /api/opname` | P, RO | `stok-opname.md` |
| `GET /api/opname/[id]` | P, RO | `stok-opname.md` |

### Transaksi & Sinkronisasi

| Method & route | Peran | FRD |
|---|---|---|
| `POST /api/transaksi` | P, K | `pos.md`, `pengurangan-stok.md` |
| `GET /api/transaksi` | P, RO, K (hari ini) | `pos.md` |
| `GET /api/transaksi/[clientTxId]` | P, RO, K (hari ini) | `pos.md` |
| `POST /api/transaksi/[clientTxId]/batal` | P | `pembatalan-transaksi.md` |
| `GET /api/sync/snapshot` | P, RO, K | `offline-sync.md` (+ header `X-Waktu-Server`) |
| `POST /api/sync/gagal` | P, K | `offline-sync.md` |
| `GET /api/sync/gagal` | P, RO | `offline-sync.md` |
| `PATCH /api/sync/gagal/[id]` | P | `offline-sync.md` |

### Alert & Laporan

| Method & route | Peran | FRD |
|---|---|---|
| `GET /api/alert` | P, RO | `alert-stok.md` |
| `PATCH /api/alert/[id]` | P | `alert-stok.md` |
| `POST /api/alert/baca-semua` | P | `alert-stok.md` |
| `GET /api/laporan` | P, RO | `laporan.md` |

### Sistem

| Method & route | Akses | FRD |
|---|---|---|
| `GET /api/health` | Pub | NFR-09 (`SELECT 1`, timeout 2 detik) |
| `POST /api/log-client` | P, K | [S] Laporan error client (`infra-operasional.md`) |
| `GET /api/demo/reset` | Cron | `akun-demo.md` |
| `GET /api/cron/cek-invarian` | Cron | `mutasi-stok.md` |

## Kode Error

Kode umum (NFR-01): `TIDAK_TERAUTENTIKASI` 401, `AKSES_DITOLAK` 403, `READ_ONLY` 403, `TIDAK_DITEMUKAN` 404, `VALIDASI_GAGAL` 422, `TERLALU_BANYAK_REQUEST` 429. Ditambah [S] `KESALAHAN_SERVER` 500 dan `LAYANAN_TIDAK_TERSEDIA` 503 untuk error tak terduga (pesan generik, detail hanya di log).

| Kode spesifik | Status | Sumber |
|---|---|---|
| `EMAIL_SUDAH_TERDAFTAR` | 409 | `auth.md` |
| `PASSWORD_LAMA_SALAH` | 422 | `auth.md` |
| `USERNAME_SUDAH_ADA`, `KUOTA_KASIR_PENUH` | 409 | `akun-kasir.md` |
| `NAMA_BAHAN_SUDAH_ADA`, `BAHAN_DIPAKAI_RESEP` | 409 | `bahan-baku.md` |
| `STOK_MELEBIHI_BATAS` | 422 | NFR-01, `restock.md` |
| `NAMA_MENU_SUDAH_ADA` | 409 | `menu.md` |
| `BAHAN_DUPLIKAT` | 422 | `resep.md` |
| `STOK_TIDAK_CUKUP`, `HARGA_BERUBAH` | 409 | `pengurangan-stok.md`, `pos.md` |
| `MENU_TIDAK_AKTIF`, `UANG_KURANG` | 422 | `pos.md` |
| `SUDAH_DIBATALKAN`, `BATAS_PEMBATALAN_LEWAT` | 409 | `pembatalan-transaksi.md` |

**422 tanpa kode spesifik di FRD = `VALIDASI_GAGAL`** dengan `detail` berisi `{ "<field>": "<pesan>" }`. Ini berlaku untuk: `path` foto tidak cocok pola (`menu.md`, field `path`), `satuan_input` tidak sesuai satuan bahan (`restock.md`, field `satuan_input`), `harga_beli_per_satuan` hasil konversi > 10.000.000 (`restock.md`, field `total_harga`), `onboarding_selesai` `true → false` dan field tak dikenal di `PATCH /api/pengaturan` (`pengaturan-outlet.md`, field terkait), `sudah_dibaca: false` (`alert-stok.md`), dan semua pelanggaran skema Zod.

Semua kode didefinisikan sekali di `src/shared/kode-error.ts` (kode → status + pesan default Bahasa Indonesia) dan dipakai server maupun client (pemetaan pesan di UI).

## Pemetaan Error Prisma

| Error Prisma / Postgres | Hasil |
|---|---|
| `P2002` unique (nama bahan/menu, username) | 409 kode spesifik sesuai constraint |
| `P2002` `client_tx_id` | Jalur idempotensi → 200 |
| `P2025` not found | 404 `TIDAK_DITEMUKAN` |
| `P2003` FK (termasuk composite FK outlet) | 404 `TIDAK_DITEMUKAN` |
| `23514` check (`stok_saat_ini`) | 500 + log `error` (seharusnya dicegah domain) |
| `40001`/`40P01` | Retry, lalu 503 |
| Timeout koneksi | 503 `LAYANAN_TIDAK_TERSEDIA` |
