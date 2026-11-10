import { z } from 'zod';
import {
  MAKS_CATATAN,
  MAKS_HARGA_JUAL,
  MAKS_ITEM_TRANSAKSI,
  MAKS_NAMA,
  MAKS_QTY,
  MAKS_UANG_DITERIMA,
  MIN_CATATAN_BATAL_LAINNYA,
  MIN_HARGA_JUAL,
  MIN_QTY,
} from '../konstanta';
import { POLA_NOMOR_STRUK_PERANGKAT } from '../nomor-struk';
import {
  alasanBatalSchema,
  metodeBayarSchema,
  statusTransaksiSchema,
  tipePesananSchema,
  type AlasanBatal,
  type MetodeBayar,
  type Satuan,
  type StatusTransaksi,
  type TipePesanan,
  type ZonaWaktu,
} from './enum';
import { boolQuery, idSchema, paginasiQuery, tanggalSchema, teks, uang, uuidV4Schema, waktuIsoSchema } from './umum';

/** FRD `pos.md`, `pengurangan-stok.md`, `pembatalan-transaksi.md`, `struk.md`. */

export const itemTransaksiSchema = z.strictObject({
  menu_id: idSchema,
  qty: z
    .number({ error: 'Jumlah wajib diisi' })
    .int('Jumlah harus bilangan bulat')
    .min(MIN_QTY, `Jumlah ${MIN_QTY}–${MAKS_QTY}`)
    .max(MAKS_QTY, `Jumlah ${MIN_QTY}–${MAKS_QTY}`),
  harga_jual: uang('Harga jual', MIN_HARGA_JUAL, MAKS_HARGA_JUAL),
  /** Wajib jika `dibuat_offline = true`; diabaikan server jika `false`. */
  nama_menu: teks('Nama menu', { max: MAKS_NAMA }).optional(),
});

/**
 * `POST /api/transaksi`. `total` tidak dikirim (dihitung server).
 * `uang_diterima` ≥ total dicek server → 422 `UANG_KURANG` (bukan skema).
 */
export const transaksiSchema = z
  .strictObject({
    client_tx_id: uuidV4Schema,
    device_id: uuidV4Schema,
    dibuat_oleh: idSchema,
    nomor_struk: z.string().regex(POLA_NOMOR_STRUK_PERANGKAT, 'Format nomor struk tidak valid'),
    waktu_transaksi: waktuIsoSchema,
    dibuat_offline: z.boolean(),
    tipe_pesanan: tipePesananSchema,
    metode_bayar: metodeBayarSchema,
    uang_diterima: uang('Uang diterima', 0, MAKS_UANG_DITERIMA).nullable(),
    items: z
      .array(itemTransaksiSchema)
      .min(1, 'Pesanan minimal 1 menu')
      .max(MAKS_ITEM_TRANSAKSI, `Maksimal ${MAKS_ITEM_TRANSAKSI} menu per pesanan`),
  })
  .superRefine((v, ctx) => {
    if (v.metode_bayar === 'tunai' && v.uang_diterima === null) {
      ctx.addIssue({ code: 'custom', path: ['uang_diterima'], message: 'Uang diterima wajib diisi' });
    }
    if (v.metode_bayar === 'qris' && v.uang_diterima !== null) {
      ctx.addIssue({ code: 'custom', path: ['uang_diterima'], message: 'Kosongkan uang diterima untuk QRIS' });
    }
    const ids = new Set<string>();
    v.items.forEach((item, i) => {
      if (ids.has(item.menu_id)) {
        ctx.addIssue({ code: 'custom', path: ['items', i, 'menu_id'], message: 'Menu sama muncul lebih dari sekali' });
      }
      ids.add(item.menu_id);
      if (v.dibuat_offline && item.nama_menu === undefined) {
        ctx.addIssue({ code: 'custom', path: ['items', i, 'nama_menu'], message: 'Nama menu wajib diisi' });
      }
    });
  });
export type TransaksiPayload = z.infer<typeof transaksiSchema>;

/** `GET /api/transaksi`: `tanggal` default hari ini (zona outlet); batas peran dicek server. */
export const daftarTransaksiQuery = z.strictObject({
  tanggal: tanggalSchema.optional(),
  status: statusTransaksiSchema.optional(),
  metode_bayar: metodeBayarSchema.optional(),
  dibuat_offline: boolQuery.optional(),
  ...paginasiQuery,
});
export type DaftarTransaksiQuery = z.infer<typeof daftarTransaksiQuery>;

export const clientTxIdParam = z.strictObject({ clientTxId: idSchema });

/** `POST /api/transaksi/[clientTxId]/batal`. */
export const batalTransaksiSchema = z
  .strictObject({
    alasan_batal: alasanBatalSchema,
    catatan_batal: z.string().trim().max(MAKS_CATATAN, `Maksimal ${MAKS_CATATAN} karakter`).optional(),
  })
  .refine(
    (v) => v.alasan_batal !== 'lainnya' || (v.catatan_batal?.length ?? 0) >= MIN_CATATAN_BATAL_LAINNYA,
    { path: ['catatan_batal'], message: `Tulis alasan minimal ${MIN_CATATAN_BATAL_LAINNYA} karakter` },
  );
export type BatalTransaksiPayload = z.infer<typeof batalTransaksiSchema>;

// ── Respons ─────────────────────────────────────────────────────────────────

/** 201/200 `POST /api/transaksi`. */
export interface TransaksiResult {
  id: string;
  client_tx_id: string;
  nomor_struk: string;
  token_struk: string;
  created_at: string;
  total: number;
  kembalian: number | null;
  koreksi_stok: boolean;
}

/** 409 `STOK_TIDAK_CUKUP` → `detail.kekurangan[]`. */
export interface DetailStokTidakCukup {
  kekurangan: { bahan_baku_id: string; nama: string; dibutuhkan: string; tersedia: string; satuan: Satuan }[];
}

/** 409 `HARGA_BERUBAH` → `detail.menu[]` (`pos.md`). */
export interface DetailHargaBerubah {
  menu: { menu_id: string; harga_lama: number; harga_baru: number }[];
}

/** 422 `MENU_TIDAK_AKTIF` → `detail.menu_id`. */
export interface DetailMenuTidakAktif {
  menu_id: string;
}

export interface TransaksiRingkasResponse {
  client_tx_id: string;
  nomor_struk: string;
  waktu_transaksi: string;
  status: StatusTransaksi;
  tipe_pesanan: TipePesanan;
  metode_bayar: MetodeBayar;
  total: number;
  jumlah_item: number;
  nama_kasir: string;
  dibuat_offline: boolean;
  koreksi_stok: boolean;
}

export interface RingkasanHarian {
  jumlah_transaksi: number;
  per_metode_bayar: { metode_bayar: MetodeBayar; jumlah_transaksi: number; total: number }[];
}

export interface DaftarTransaksiResponse {
  items: TransaksiRingkasResponse[];
  next_cursor: string | null;
  ringkasan: RingkasanHarian;
}

export interface DetailItemTransaksiResponse {
  menu_id: string;
  nama_menu: string;
  qty: number;
  harga_jual: number;
  subtotal: number;
  /** Field biaya: hanya pemilik. */
  hpp_snapshot?: string;
}

/** `GET /api/transaksi/[clientTxId]` (struk internal). */
export interface DetailTransaksiResponse extends Omit<TransaksiRingkasResponse, 'jumlah_item'> {
  id: string;
  nama_outlet: string;
  token_struk: string;
  created_at: string;
  uang_diterima: number | null;
  kembalian: number | null;
  items: DetailItemTransaksiResponse[];
  dibatalkan_at: string | null;
  dibatalkan_oleh_nama: string | null;
  alasan_batal: AlasanBatal | null;
  catatan_batal: string | null;
}

/** 200 `POST …/batal`: transaksi terbaru + bahan yang stoknya tidak dikembalikan. */
export interface BatalTransaksiResponse extends DetailTransaksiResponse {
  bahan_tidak_dikembalikan: { bahan_baku_id: string; nama: string }[];
}

/** Struk publik `/s/[token]` (`struk.md`): tanpa nama kasir & field biaya. */
export interface StrukPublikResponse {
  nama_outlet: string;
  zona_waktu: ZonaWaktu;
  nomor_struk: string;
  waktu_transaksi: string;
  tipe_pesanan: TipePesanan;
  metode_bayar: MetodeBayar;
  items: { nama_menu: string; qty: number; harga_jual: number; subtotal: number }[];
  total: number;
  uang_diterima: number | null;
  kembalian: number | null;
  status: StatusTransaksi;
  dibatalkan_at: string | null;
}
