/**
 * Konstanta bersama client, server, dan Service Worker.
 *
 * Batas nilai di sini adalah satu-satunya sumber batas FRD (NFR-01 → Batas Nilai):
 * skema Zod client dan server memakai modul ini, sehingga tidak bisa berbeda.
 */

// ── Kuota & masa berlaku (NFR-10) ────────────────────────────────────────────
export const MAKS_AKUN_KASIR = 3;
export const MAKS_RIWAYAT_LAPORAN_HARI = 90;
export const MASA_BERLAKU_STRUK_HARI = 90;

// ── Kuantitas (NFR-01, `numeric(12,3)`) ─────────────────────────────────────
/** Batas kolom `stok_saat_ini`; dalam string desimal 3 digit. */
export const MAKS_STOK = '999999999.999';
/** `MAKS_STOK` dalam milli-unit (ADR-09), masih di bawah `Number.MAX_SAFE_INTEGER`. */
export const MAKS_STOK_MILLI = 999_999_999_999;
export const DIGIT_KUANTITAS = 3;
/** Stok awal saat tambah bahan (`bahan-baku.md`), sama dengan batas satu restock. */
export const MAKS_STOK_AWAL = 100_000_000;
/** `takaran` resep (`resep.md`). */
export const MAKS_TAKARAN = 100_000;
/** `jumlah_input` restock (`restock.md`). */
export const MAKS_JUMLAH_INPUT_RESTOCK = 100_000;

// ── Uang (NFR-01, Rupiah integer) ───────────────────────────────────────────
export const MIN_HARGA_JUAL = 1;
export const MAKS_HARGA_JUAL = 10_000_000;
/** `harga_beli_per_satuan`, `numeric(12,2)` (`bahan-baku.md`). */
export const MAKS_HARGA_BELI = 10_000_000;
export const DIGIT_HARGA_SATUAN = 2;
/** `total_harga` restock (`restock.md`). */
export const MAKS_TOTAL_HARGA_RESTOCK = 100_000_000;
/** `uang_diterima` (`pos.md`). */
export const MAKS_UANG_DITERIMA = 1_000_000_000_000;
/** Kelipatan pembulatan `harga_jual_minimum` (`hpp-margin.md`). */
export const KELIPATAN_HARGA_MINIMUM = 500;
/** Pecahan pilihan uang cepat di atas total (`pos.md`). */
export const PECAHAN_UANG_CEPAT = [10_000, 20_000, 50_000, 100_000] as const;

// ── Margin & pengaturan (`pengaturan-outlet.md`, `auth.md`) ─────────────────
export const AMBANG_MARGIN_DEFAULT = 20;
export const MIN_AMBANG_MARGIN = 0;
export const MAKS_AMBANG_MARGIN = 100;
export const ZONA_WAKTU_DEFAULT = 'Asia/Jakarta';

// ── Keranjang & transaksi (`pos.md`) ────────────────────────────────────────
export const MIN_QTY = 1;
export const MAKS_QTY = 99;
export const MAKS_ITEM_TRANSAKSI = 50;
/** Pencarian nama di grid POS tampil jika menu > 12. */
export const AMBANG_PENCARIAN_MENU_POS = 12;
/** Timeout `POST /api/transaksi` dan pengiriman antrean (detik → ms). */
export const TIMEOUT_TRANSAKSI_MS = 10_000;
/** 429 dengan `Retry-After` ≤ nilai ini ditunggu lalu dikirim ulang sekali. */
export const MAKS_TUNGGU_RETRY_AFTER_DETIK = 10;

// ── Resep, opname, pembatalan ───────────────────────────────────────────────
export const MAKS_ITEM_RESEP = 30;
export const MIN_ITEM_TEMPLATE = 1;
export const MAKS_ITEM_OPNAME = 200;
export const MAKS_CATATAN = 200;
/** `catatan_batal` wajib ≥ 5 karakter jika `alasan_batal = lainnya`. */
export const MIN_CATATAN_BATAL_LAINNYA = 5;

// ── Teks & akun (`auth.md`, `akun-kasir.md`) ────────────────────────────────
export const MAKS_NAMA = 100;
export const MAKS_EMAIL = 254;
export const MIN_PASSWORD = 8;
export const MAKS_PASSWORD = 72;
export const MIN_USERNAME = 3;
export const MAKS_USERNAME = 30;
/** Pencarian `q` (bahan, menu) minimal 2 karakter. */
export const MIN_PENCARIAN = 2;

// ── Paginasi (`api.md`) ─────────────────────────────────────────────────────
export const MIN_LIMIT = 1;
export const MAKS_LIMIT = 100;
export const LIMIT_DEFAULT = 50;
/** `GET /api/bahan-baku/[id]` untuk pemilik menyertakan N riwayat harga terakhir. */
export const JUMLAH_RIWAYAT_HARGA_DETAIL = 10;
/** Alert sudah dibaca ditampilkan maks N hari ke belakang (`alert-stok.md`). */
export const MAKS_ALERT_DIBACA_HARI = 30;

// ── Offline & sinkronisasi (`offline-sync.md`) ──────────────────────────────
export const SNAPSHOT_INTERVAL_MENIT = 5;
export const SNAPSHOT_BASI_JAM = 24;
export const MAKS_COBA_LAGI = 3;
export const HAPUS_SYNCED_SETELAH_JAM = 24;
export const HAPUS_GAGAL_SETELAH_HARI = 7;
export const BACKOFF_AWAL_DETIK = 5;
export const BACKOFF_MAKS_DETIK = 300;
export const ANTREAN_MIN = 500;
/** Batas `payload` jsonb `transaksi_gagal` (`data-model.md`). */
export const MAKS_PAYLOAD_GAGAL_BYTE = 64 * 1024;

// ── Laporan (`laporan.md`) ──────────────────────────────────────────────────
export const LAPORAN_CACHE_DETIK = 60;

// ── Rate limit (NFR-04, `infra-operasional.md` → Rate Limit) ────────────────
/** Nama limiter = bagian `<nama>` key Redis `rl:<nama>:<kunci>`. */
export const RATE_LIMIT = {
  transaksi: { batas: 10, jendelaDetik: 1 }, // POST /api/transaksi, kunci outlet_id
  daftar: { batas: 5, jendelaDetik: 3600 }, // POST /api/auth/daftar, kunci IP
  struk_publik: { batas: 30, jendelaDetik: 60 }, // /s/[token], kunci IP
  mutasi: { batas: 60, jendelaDetik: 60 }, // method ≠ GET/HEAD /api/* lain, kunci user_id
} as const;

// ── Restock (`restock.md`) ──────────────────────────────────────────────────
/** Perubahan harga beli > +50% atau < −50% memunculkan peringatan pratinjau. */
export const AMBANG_PERUBAHAN_HARGA_PERSEN = 50;

// ── Struk (`struk.md`) ──────────────────────────────────────────────────────
export const PANJANG_TOKEN_STRUK = 22;
/** Nomor WhatsApp tujuan: 10–15 digit (`struk.md`). */
export const MIN_DIGIT_WA = 10;
export const MAKS_DIGIT_WA = 15;

// ── Onboarding (`auth.md`) ──────────────────────────────────────────────────
export const TARGET_ONBOARDING_BAHAN = 5;
export const TARGET_ONBOARDING_MENU = 3;

// ── Foto menu (`menu.md`) ───────────────────────────────────────────────────
export const BUCKET_FOTO_MENU = 'menu-foto';
export const MAKS_UKURAN_FOTO_INPUT_BYTE = 5 * 1024 * 1024;
export const MAKS_UKURAN_FOTO_HASIL_BYTE = 300 * 1024;
export const MAKS_SISI_FOTO_PX = 800;
export const TIPE_FOTO_DITERIMA = ['image/jpeg', 'image/png', 'image/webp'] as const;

// ── Log client (`infra-operasional.md` → Observability) ─────────────────────
export const MAKS_PAYLOAD_LOG_CLIENT_BYTE = 4 * 1024;

// ── Akun demo (`akun-demo.md`, `alur-domain.md` → Generator Deterministik) ──
export const DEMO_SEED = 'pusat-dapur-demo-v1';
export const NAMA_OUTLET_DEMO = 'Warung Demo Pusat Dapur';
