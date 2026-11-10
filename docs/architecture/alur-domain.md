# Alur Domain dan Konkurensi

Aturan bisnis ada di FRD fitur terkait. Dokumen ini menetapkan bentuk implementasi: fungsi domain, urutan lock, batas transaksi, dan strategi agar invarian tetap terjaga di bawah request paralel.

## Prinsip Implementasi

| Aspek | Aturan |
|---|---|
| Lokasi | `src/server/domain/<modul>/*.ts`; Route Handler hanya memanggil fungsi domain |
| Transaksi | `withTx(ctx, fn)` = `db.forOutlet(ctx.outletId).$transaction(fn, { isolationLevel: 'ReadCommitted', timeout: 10_000, maxWait: 5_000 })` (`struktur-kode.md`). Pengecualian timeout tertulis eksplisit per alur: reset demo 55 detik, materialisasi demo 20 detik |
| Transaksi bersarang | Dilarang. Fungsi inti berbentuk `xxxDalamTx(tx, …)`; pembungkus `xxx(ctx, …)` membuka transaksi |
| Lock baris | `SELECT … FOR UPDATE` via `tx.$queryRaw`, **selalu urut `id` ASC** untuk `bahan_baku` |
| Lock HPP **[S]** | `pg_advisory_xact_lock(hashtextextended('hpp:' \|\| outlet_id, 0))` sebelum mengubah harga beli atau resep |
| Aritmetika | `Prisma.Decimal` di server; tidak pernah `number` untuk kuantitas/harga per satuan |
| Efek setelah commit | Invalidasi cache laporan dan revoke sesi dijalankan **setelah** commit; kegagalan hanya di-log (cache punya TTL 60 detik) |
| Retry | Error serialisasi/deadlock (`40001`, `40P01`) dan bentrok `nomor_struk` → ulang seluruh transaksi maks 3× |

### Urutan Lock Global

Untuk mencegah deadlock, setiap transaksi mengambil lock dalam urutan ini (lewati yang tidak perlu):

1. Advisory lock `hpp:<outlet_id>` (hanya operasi harga/resep)
2. Baris `transaksi` (pembatalan)
3. Baris `bahan_baku`, urut `id` ASC
4. Baris `menus` (implisit lewat `UPDATE`)
5. Insert `stok_mutasi`, `stok_alert`, dll.

## Loop Inti: `buatTransaksi()`

`src/server/domain/transaksi/buat-transaksi.ts` berisi dua fungsi:

```ts
// Inti: dijalankan di dalam transaksi milik pemanggil. Dipakai materialisasiDemo().
buatTransaksiDalamTx(tx: OutletTx, ctx: AuthContext, input: TransaksiPayload, opsi?: {
  waktuTransaksi?: Date;     // hanya pemanggil server (materialisasi demo)
  nomorStruk?: string;
}): Promise<{ status: 200 | 201; body: TransaksiResult }>

// Pembungkus: withTx + retry (40001/40P01, bentrok nomor_struk, unik client_tx_id → baca ulang). Dipakai POST /api/transaksi.
buatTransaksi(ctx: AuthContext, input: TransaksiPayload): Promise<{ status: 200 | 201; body: TransaksiResult }>
```

Validasi yang menolak (`HARGA_BERUBAH`, `MENU_TIDAK_AKTIF`, `UANG_KURANG`, `STOK_TIDAK_CUKUP`) dilempar sebagai `AppError` **sebelum** penulisan apa pun di langkah 5, sehingga pemanggil yang menangkapnya (materialisasi) dapat melanjutkan transaksi yang sama.

```mermaid
sequenceDiagram
  participant K as Kasir (client)
  participant R as POST /api/transaksi
  participant D as buatTransaksi()
  participant P as PostgreSQL
  K->>R: payload (client_tx_id, items, harga, dibuat_offline)
  R->>D: ctx dari sesi + payload tervalidasi
  D->>P: BEGIN
  D->>P: SELECT transaksi WHERE (outlet_id, client_tx_id)
  alt sudah ada
    D->>P: UPDATE transaksi_gagal ditangani; COMMIT
    D-->>K: 200 transaksi lama
  end
  D->>P: SELECT menus + resep_detail item
  D->>D: validasi harga/aktif, hitung total & kebutuhan
  D->>P: SELECT bahan_baku FOR UPDATE ORDER BY id
  D->>D: kekurangan → tabel keputusan
  D->>P: INSERT transaksi, detail_transaksi (snapshot)
  D->>P: UPDATE bahan_baku stok = max(0, stok − kebutuhan)
  D->>P: INSERT stok_mutasi (koreksi_sync lalu penjualan)
  D->>P: INSERT stok_alert ON CONFLICT DO NOTHING
  D->>P: UPDATE transaksi_gagal ditangani
  D->>P: COMMIT
  D-->>R: 201
  R->>R: invalidasi cache laporan
  R-->>K: nomor_struk final, token_struk, created_at
```

Detail langkah (mengikuti FRD `pengurangan-stok.md` langkah 1–9):

| Langkah | Implementasi |
|---|---|
| Idempotensi | Cek `(outlet_id, client_tx_id)`. Jika `INSERT transaksi` gagal unique `client_tx_id` (request paralel), transaksi DB di-rollback, lalu fungsi membaca ulang di transaksi baru dan mengembalikan 200 |
| Menu & resep | Satu query: `menus` item + `resep_detail` ⋈ `bahan_baku` (termasuk bahan diarsipkan, karena resep lama bisa merujuknya) |
| Validasi online | `dibuat_offline = false`: menu nonaktif → 422 `MENU_TIDAK_AKTIF`; `harga_jual` payload ≠ DB → 409 `HARGA_BERUBAH` |
| Total | `Σ harga_jual × qty` dengan harga snapshot (online: DB; offline: payload). `total` client diabaikan |
| Kebutuhan | `kebutuhan[bahan] = Σ qty × takaran` (Decimal) |
| Lock | `SELECT id, nama, satuan, stok_saat_ini, threshold_min FROM bahan_baku WHERE outlet_id = $1 AND id = ANY($2) ORDER BY id FOR UPDATE` |
| Keputusan | Fungsi murni `putuskanStok({ dibuatOffline, blokir, kebutuhan, stok })` di `shared/rumus/stok.ts` → `{ ditolak, kekurangan[], koreksi[] }`. Fungsi yang sama dipakai cek offline di client |
| Nomor struk | Online: dari payload. Server mencari bentrok `nomor_struk = $n OR nomor_struk LIKE $n || '-%'` dan memberi sufiks berikutnya. Bentrok unique karena race → retry |
| `token_struk` | `crypto.randomBytes(16).toString('base64url')` |
| `waktu_transaksi` | Online: `now()` server. Offline: payload, di-*clamp* ke `now()`. Materialisasi demo: `opsi.waktuTransaksi` |
| `dibuat_oleh` | Online: `ctx.userId`. Offline: payload jika user ada di outlet sesi, selain itu `ctx.userId` |
| Snapshot | `hpp_snapshot = menus.hpp_cached` saat diproses (FRD BR-04) |
| Update stok | Satu `UPDATE … FROM (VALUES …)` untuk semua bahan |
| Mutasi | Untuk bahan kurang: insert `koreksi_sync (+kekurangan)` **sebelum** `penjualan (−kebutuhan)` agar `stok_berjalan` tidak pernah negatif |
| Alert | `stok_menipis` jika transisi (nilai sebelum/sesudah dari baris yang di-lock); `stok_tidak_sinkron` untuk bahan terkoreksi |
| Respons | `koreksi_stok`, `nomor_struk` final, `token_struk`, `created_at` |

**Anggaran latensi (p95 ≤ 2 detik):** ±8 round-trip DB di dalam transaksi × ~3–10 ms (Vercel `sin1` ↔ Supabase Singapura) + cold start function. Cold start dikurangi dengan bundle Route Handler yang ramping (Prisma diimpor hanya di server) dan Fluid Compute Vercel.

## HPP dan Margin

| Komponen | Implementasi |
|---|---|
| Rumus murni | `shared/rumus/hpp.ts`: `hitungHpp`, `marginPersen`, `marginRendah`, `hargaJualMinimum` (kelipatan Rp500), `hppBelumLengkap` |
| Hitung ulang di DB | `domain/hpp/hitung-ulang.ts` dengan satu statement agregat (FRD `hpp-margin.md`): |

```sql
UPDATE menus m
SET hpp_cached = COALESCE(x.hpp, 0), updated_at = now()
FROM (
  SELECT r.menu_id, ROUND(SUM(b.harga_beli_per_satuan * r.takaran), 2) AS hpp
  FROM resep_detail r JOIN bahan_baku b ON b.id = r.bahan_baku_id
  WHERE r.outlet_id = $outlet AND r.menu_id = ANY($menuIds)
  GROUP BY r.menu_id
) x
WHERE m.outlet_id = $outlet AND m.id = x.menu_id;
-- menu tanpa resep di-set 0 lewat statement terpisah
```

### Masalah HPP Basi dan Advisory Lock **[S]**

Tanpa serialisasi, dua restock paralel untuk bahan A dan B yang sama-sama dipakai menu M bisa menghasilkan `hpp_cached` yang memakai harga A **lama**. Statement `UPDATE` transaksi kedua mengambil snapshot sebelum transaksi pertama commit, lalu menunggu lock baris `menus` (READ COMMITTED). Pelanggaran BR-01 ini terjadi walaupun setiap transaksi benar sendiri-sendiri.

Solusi: semua operasi yang mengubah input HPP mengambil `pg_advisory_xact_lock('hpp:<outlet_id>')` **di awal** transaksi. Statement hitung ulang baru dimulai setelah lock didapat, sehingga snapshot-nya melihat commit sebelumnya.

| Operasi yang mengambil lock HPP |
|---|
| `POST /api/restock` |
| `PATCH /api/bahan-baku/[id]` dengan `harga_beli_per_satuan` |
| `PUT /api/menu/[id]/resep` |
| `POST /api/menu` dengan `resep[]` |
| `POST /api/resep-template/[kode]/terapkan` |

Lock ini per outlet, dan operasinya jarang serta cepat (dilakukan pemilik), sehingga kontensi dapat diabaikan. `POST /api/transaksi` **tidak** mengambil lock ini; ia hanya membaca `hpp_cached` yang sudah commit.

## Restock

`domain/stok/restock.ts`. Fungsi murni `konversiRestock({ jumlahInput, satuanInput, totalHarga, satuanBahan })` di `shared/rumus/restock.ts` dipakai client (pratinjau instan), `GET /api/restock/pratinjau`, dan `POST /api/restock`.

| Langkah | Operasi |
|---|---|
| 0 | Lock HPP |
| 1 | `FOR UPDATE` bahan; diarsipkan → 404; cek `MAKS_STOK` |
| 2 | Insert `restock_log`, `riwayat_harga_beli (restock)` |
| 3 | Update stok & harga |
| 4 | Mutasi `restock` |
| 5 | Hitung ulang HPP menu yang memakai bahan; ambil HPP lama sebelumnya untuk respons format pratinjau |
| 5a | Tutup otomatis `stok_menipis` bila `aman` |
| 6 | Commit → invalidasi cache laporan |

Pratinjau memakai fungsi yang sama dalam mode baca (tanpa lock), menghitung `hpp_baru` di memori.

## Stok Opname

`domain/stok/opname.ts` (FRD `stok-opname.md`): lock semua bahan item urut `id` → insert header + detail (`stok_sistem` dari baris ter-lock) → mutasi `opname` untuk `selisih ≠ 0` → tutup `stok_tidak_sinkron` semua bahan item → cek transisi `stok_menipis` dua arah (buat jika turun melewati threshold; tutup jika `aman`). Tidak mengambil lock HPP (opname tidak mengubah HPP).

## Pembatalan Transaksi

`domain/transaksi/batal.ts` (FRD `pembatalan-transaksi.md`):

1. `SELECT … FROM transaksi WHERE outlet_id AND client_tx_id FOR UPDATE`.
2. Cek status & batas hari (`waktu_transaksi` **dan** `created_at` bukan hari ini di zona outlet → 409).
3. Agregat `jumlah_kembali` per bahan dari `stok_mutasi WHERE ref_id = $tx AND jenis IN ('penjualan','koreksi_sync')`.
4. Bahan dengan `stok_opname_detail.created_at > transaksi.created_at` → `jumlah_kembali = 0`, masuk `bahan_tidak_dikembalikan[]`.
5. Lock bahan urut `id`; tambah stok (cek `MAKS_STOK`); mutasi `pembatalan`.
6. Tutup otomatis `stok_menipis` bila `aman`; commit; invalidasi cache.

## Alert

`domain/stok/alert.ts` menyediakan fungsi yang dipanggil di dalam transaksi pemicu:

| Fungsi | Dipakai oleh |
|---|---|
| `cekTransisiMenipis(tx, bahan, sebelum, sesudah, thresholdLama?)` | transaksi, tambah/ubah bahan, opname |
| `buatTidakSinkron(tx, bahanIds)` | transaksi (koreksi) |
| `tutupMenipisJikaAman(tx, bahanIds)` | restock, opname, pembatalan, ubah threshold |
| `tutupTidakSinkron(tx, bahanIds)` | opname |
| `tutupSemua(tx, bahanId)` | arsip bahan |

Semua insert memakai `ON CONFLICT DO NOTHING` terhadap partial unique index. Realtime mengirim event setelah commit, sehingga client tidak pernah menerima alert dari transaksi yang di-rollback.

## Laporan

`domain/laporan/*` (FRD `laporan.md`):

| Aspek | Implementasi |
|---|---|
| Rentang waktu | `shared/waktu.ts` menghitung `[mulai, akhir)` UTC dari `periode` + `zona_waktu` (`@date-fns/tz`); pembanding dihitung dengan cara yang sama |
| Query | 3 query agregat paralel dalam satu koneksi: ringkasan (penjualan, HPP, count, per metode, per tipe, dibatalkan, koreksi), per menu (top 5 + laba per menu), per hari (`generate_series` + `date_trunc('day', waktu_transaksi AT TIME ZONE tz)`) |
| Pembulatan | `total_hpp` = `ROUND(SUM(hpp_snapshot * qty))` di SQL |
| `menu_margin_rendah` | Dari `menus` saat ini + `ambang_margin`; dihitung via `shared/rumus/hpp.ts` |
| Batas riwayat | `MAKS_RIWAYAT_LAPORAN_HARI` dicek di semua query berparameter tanggal |
| Cache **[S]** | Key `lap:{outlet_id}:v{n}:{periode}`, TTL 60 detik di Upstash. `n` = `INCR lapver:{outlet_id}` saat invalidasi. Invalidasi cukup satu `INCR`; key lama kedaluwarsa sendiri |
| Pemicu invalidasi | Transaksi baru, pembatalan, restock, koreksi harga, resep, tambah/ubah menu, template, `ambang_margin`, `zona_waktu` (FRD) — semua lewat `invalidasiLaporan(outletId)` setelah commit |

## Snapshot Sinkronisasi

`domain/sync/snapshot.ts` membangun respons `GET /api/sync/snapshot` (FRD `offline-sync.md`) dalam satu transaksi baca `REPEATABLE READ` agar menu, resep, dan stok konsisten satu sama lain. `ETag` = SHA-256 dari JSON kanonik **tanpa** `waktu_server`. `If-None-Match` cocok → 304. Respons 200 **dan** 304 selalu membawa header `X-Waktu-Server` (ISO 8601). Pada 304 client memperbarui `waktu_sinkron_terakhir` dari header tersebut, sedangkan `snapshot.waktu_server` (dipakai rumus stok lokal efektif) **tidak** berubah karena datanya sama. Respons tidak pernah memuat field biaya, bahkan untuk pemilik (satu bentuk untuk semua peran).

## Akun Demo: Reset dan Materialisasi

### Generator Deterministik

`src/server/domain/demo/generator.ts`: PRNG `mulberry32(fnv1a32(\`${DEMO_SEED}:${YYYY-MM-DD}\`))` dengan konstanta `DEMO_SEED = 'pusat-dapur-demo-v1'` di `shared/konstanta.ts` menghasilkan rencana per hari (transaksi, restock, opname) mengikuti komposisi FRD `akun-demo.md`. Generator **mensimulasikan stok di memori** (urut waktu) sehingga rencana selalu konsisten: restock dijadwalkan sebelum stok habis, alert dihitung dari transisi, ledger Σ mutasi = stok akhir.

### Reset Harian (`GET /api/demo/reset`) **[S]**

Agar muat dalam batas durasi function, 29 hari data **tidak** dimasukkan lewat `buatTransaksi()`. Generator menghasilkan seluruh baris final di memori, lalu dalam **satu** transaksi `prisma.$transaction(fn, { timeout: 55_000, maxWait: 5_000 })` (route `maxDuration = 60`):

1. `SET LOCAL app.reset_demo = 'on'`; `SET LOCAL statement_timeout = '50s'`.
2. Hapus data bisnis outlet demo (urutan anak → induk).
3. Insert per tabel dengan satu statement per tabel: `INSERT … SELECT * FROM unnest($1::uuid[], $2::…[], …)` via `tx.$executeRaw` (lebih cepat dari `createMany` dan tanpa batas jumlah parameter).
4. Set `stok_saat_ini` & `hpp_cached` akhir; verifikasi invarian Σ mutasi untuk outlet demo di dalam transaksi (gagal → rollback).
5. Commit; invalidasi cache; hapus gate materialisasi (`DEL demo:mat:{outlet}`).

Estimasi volume: ~1.100 transaksi, ~2.800 detail, ~9.000 mutasi. **Target < 20 detik** di prod (diukur di spike #0 terhadap dev). Logika reset ada di `domain/demo/reset.ts#resetDemo()` dan juga dapat dijalankan sebagai skrip `pnpm demo:reset` (memakai `DIRECT_URL`). Jika spike #0 mengukur > 20 detik, jalur cadangan yang sudah final: penjadwal dipindah dari Vercel Cron ke GitHub Actions `demo-reset.yml` (`5 17 * * *`, menjalankan `pnpm demo:reset` tanpa batas durasi function), kode dan perilaku tetap sama, `GET /api/demo/reset` tetap ada untuk pemicu manual. Agent A memperbarui FRD `akun-demo.md` → Reset Harian (baris Jadwal) di PR yang sama.

### Materialisasi Bertahap

`materialisasiDemo(ctx)`, dipanggil `route()` dan `getPageContext()` untuk request `GET` dari outlet `is_demo`, **sebelum** handler/halaman memuat data:

1. Gate Redis `SET demo:mat:{outlet} 1 NX EX 300`. Gagal (sudah jalan < 5 menit lalu) → selesai.
2. Buka **satu** transaksi `prisma.$transaction(fn, { timeout: 20_000, maxWait: 5_000 })` dengan client ber-outlet demo.
3. `SELECT pg_try_advisory_xact_lock(hashtextextended('demo:' || $outlet, 0))`. `false` → commit kosong, selesai (proses lain sedang mengerjakan).
4. Ambil **semua** rencana hari ini dengan jam ≤ sekarang yang `client_tx_id`-nya belum ada (FRD `akun-demo.md`; tanpa batas jumlah, volume maks ±60/hari).
5. Untuk setiap rencana, urut jam ASC: `buatTransaksiDalamTx(tx, ctxKasirDemo, payload, { waktuTransaksi, nomorStruk })`. `AppError` 409 `STOK_TIDAK_CUKUP` ditangkap → lewati + log `warn`, lanjut (tidak ada tulis sebelum error ini). Error SQL apa pun → seluruh transaksi rollback, gate Redis dihapus, log `error`; diulang di request berikutnya.
6. Commit; `invalidasiLaporan(outlet)`.

Penulisan dilakukan koneksi server (Prisma), bukan sesi juri, sehingga aturan `READ_ONLY` untuk request juri tetap utuh.

## Cek Invarian Harian

`GET /api/cron/cek-invarian` (FRD `mutasi-stok.md`):

```sql
SELECT b.outlet_id, b.id, b.stok_saat_ini, COALESCE(SUM(m.jumlah), 0) AS total_mutasi
FROM bahan_baku b LEFT JOIN stok_mutasi m ON m.bahan_baku_id = b.id
GROUP BY b.outlet_id, b.id
HAVING b.stok_saat_ini <> COALESCE(SUM(m.jumlah), 0);
```

Setiap baris → log `error` (`kode: INVARIAN_STOK`). Sekaligus memeriksa `hpp_cached` = rumus untuk semua menu (log `error` `kode: INVARIAN_HPP`) **[S]**. Respons 200 berisi jumlah pelanggaran (tanpa detail outlet).
