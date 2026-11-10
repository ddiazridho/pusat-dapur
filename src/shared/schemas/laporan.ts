import { z } from 'zod';
import {
  jenisAlertSchema,
  periodeLaporanSchema,
  type JenisAlert,
  type MetodeBayar,
  type Satuan,
  type TipePesanan,
} from './enum';
import { boolQuery, paginasiQuery } from './umum';

/** FRD `alert-stok.md`, `laporan.md`. */

export const daftarAlertQuery = z.strictObject({
  sudah_dibaca: boolQuery.optional(),
  jenis: jenisAlertSchema.optional(),
  ...paginasiQuery,
});
export type DaftarAlertQuery = z.infer<typeof daftarAlertQuery>;

/** `PATCH /api/alert/[id]`: hanya `true`; `false` → 422. */
export const tandaiAlertSchema = z.strictObject({
  sudah_dibaca: z.literal(true, { error: 'Alert hanya bisa ditandai sudah dibaca' }),
});

// `POST /api/alert/baca-semua` memakai `bodyKosongSchema` (umum.ts).

/** `GET /api/laporan`: default `hari_ini`; nilai lain → 422. */
export const laporanQuery = z.strictObject({
  periode: periodeLaporanSchema.default('hari_ini'),
});
export type LaporanQuery = z.infer<typeof laporanQuery>;

// ── Respons ─────────────────────────────────────────────────────────────────

export interface AlertResponse {
  id: string;
  bahan_baku_id: string;
  jenis: JenisAlert;
  sudah_dibaca: boolean;
  dibaca_at: string | null;
  ditutup_otomatis: boolean;
  created_at: string;
  nama: string;
  satuan: Satuan;
  stok_saat_ini: string;
  threshold_min: string;
}

export interface DaftarAlertResponse {
  items: AlertResponse[];
  next_cursor: string | null;
  jumlah_belum_dibaca: number;
}

export interface BacaSemuaResponse {
  jumlah: number;
}

/** Metrik skalar yang punya pembanding (`laporan.md` → Parameter). */
export interface MetrikUtama {
  total_penjualan: number;
  total_hpp: number;
  laba_kotor: number;
  jumlah_transaksi: number;
  rata_rata_transaksi: number;
}

export interface LaporanResponse extends MetrikUtama {
  margin_kotor_persen: number | null;
  /**
   * Ponytail: FRD menyebut "metrik yang sama" tanpa daftar; dibatasi ke metrik
   * skalar KPI. Tambah field lain bila dashboard membutuhkannya.
   */
  pembanding: MetrikUtama;
  perubahan_persen: Record<keyof MetrikUtama, number | null>;
  per_metode_bayar: { metode_bayar: MetodeBayar; jumlah_transaksi: number; total: number }[];
  per_tipe_pesanan: { tipe_pesanan: TipePesanan; jumlah_transaksi: number; total: number }[];
  /** Hanya `7_hari`/`30_hari`. */
  per_hari: { tanggal: string; total_penjualan: number; total_hpp: number; laba_kotor: number }[];
  jumlah_dibatalkan: number;
  jumlah_transaksi_koreksi_stok: number;
  top_menu: { menu_id: string; nama_menu: string; qty: number; penjualan: number }[];
  menu_margin_rendah: { menu_id: string; nama: string; margin_persen: number; harga_jual_minimum: number | null }[];
  laba_per_menu: {
    menu_id: string;
    nama_menu: string;
    qty: number;
    penjualan: number;
    hpp: number;
    laba_kotor: number;
  }[];
}
