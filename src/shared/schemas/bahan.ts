import { z } from 'zod';
import { MAKS_NAMA, MAKS_STOK, MAKS_STOK_AWAL } from '../konstanta';
import { ribuan } from '../format';
import { jenisMutasiSchema, satuanSchema, statusStokSchema, type JenisMutasi, type Satuan, type StatusStok, type SumberHarga } from './enum';
import { boolQuery, hargaSatuan, idSchema, kuantitas, paginasiQuery, pencarianSchema, tanggalSchema, teks } from './umum';
import type { DampakMenu } from './restock';

/** FRD `bahan-baku.md`, `mutasi-stok.md`. */

const namaBahan = teks('Nama bahan', { max: MAKS_NAMA });
const thresholdMin = kuantitas('Batas minimum', {
  min: '0',
  max: MAKS_STOK,
  pesanRentang: 'Batas minimum terlalu besar',
});

/** `POST /api/bahan-baku`. */
export const buatBahanSchema = z.strictObject({
  nama: namaBahan,
  satuan: satuanSchema,
  stok_saat_ini: kuantitas('Stok sekarang', {
    min: '0',
    max: String(MAKS_STOK_AWAL),
    pesanRentang: `Stok sekarang antara 0 dan ${ribuan(MAKS_STOK_AWAL)}`,
  }),
  threshold_min: thresholdMin,
  harga_beli_per_satuan: hargaSatuan('Harga beli'),
});
export type BuatBahanPayload = z.infer<typeof buatBahanSchema>;

/** `PATCH /api/bahan-baku/[id]`: hanya nama, threshold_min, harga (koreksi). */
export const ubahBahanSchema = z.strictObject({
  nama: namaBahan.optional(),
  threshold_min: thresholdMin.optional(),
  harga_beli_per_satuan: hargaSatuan('Harga beli').optional(),
});
export type UbahBahanPayload = z.infer<typeof ubahBahanSchema>;

/** `GET /api/bahan-baku`. `arsip=true` hanya pemilik (dicek server). */
export const daftarBahanQuery = z.strictObject({
  arsip: boolQuery.optional(),
  status_stok: statusStokSchema.optional(),
  q: pencarianSchema.optional(),
});
export type DaftarBahanQuery = z.infer<typeof daftarBahanQuery>;

/** `GET /api/bahan-baku/[id]/mutasi`. Batas 90 hari dicek server (zona outlet). */
export const daftarMutasiQuery = z
  .strictObject({
    jenis: jenisMutasiSchema.optional(),
    dari: tanggalSchema.optional(),
    sampai: tanggalSchema.optional(),
    ...paginasiQuery,
  })
  .refine((v) => !v.dari || !v.sampai || v.dari <= v.sampai, {
    path: ['sampai'],
    message: 'Tanggal akhir tidak boleh sebelum tanggal awal',
  });
export type DaftarMutasiQuery = z.infer<typeof daftarMutasiQuery>;

export const idParam = z.strictObject({ id: idSchema });

// ── Respons ─────────────────────────────────────────────────────────────────

/** Item bahan. Field biaya (`?`) tidak ada di respons kasir: render hanya bila ada. */
export interface BahanResponse {
  id: string;
  nama: string;
  satuan: Satuan;
  stok_saat_ini: string;
  threshold_min: string;
  status_stok: StatusStok;
  dipakai_di_menu: number;
  diarsipkan_at: string | null;
  harga_beli_per_satuan?: string;
}

export interface RiwayatHargaResponse {
  harga_lama: string | null;
  harga_baru: string;
  sumber: SumberHarga;
  ref_id: string | null;
  nama_pengguna: string;
  created_at: string;
}

/** `GET /api/bahan-baku/[id]`; pemilik menyertakan 10 riwayat harga terakhir. */
export interface DetailBahanResponse extends BahanResponse {
  riwayat_harga?: RiwayatHargaResponse[];
}

/** `PATCH` dengan koreksi harga menyertakan menu terdampak (format pratinjau restock). */
export interface UbahBahanResponse extends DetailBahanResponse {
  menu_terdampak?: DampakMenu[];
}

/** 409 `BAHAN_DIPAKAI_RESEP` → `detail.menu[]`. */
export interface DetailBahanDipakai {
  menu: { menu_id: string; nama: string }[];
}

export interface MutasiResponse {
  id: string;
  created_at: string;
  jenis: JenisMutasi;
  jumlah: string;
  satuan: Satuan;
  stok_berjalan: string;
  nama_pengguna: string;
  ref_id: string | null;
  ref_label: string;
}
