import { z } from 'zod';
import { MAKS_JUMLAH_INPUT_RESTOCK, MAKS_TOTAL_HARGA_RESTOCK } from '../konstanta';
import { ribuan } from '../format';
import { satuanInputSchema, type Satuan, type SatuanInput } from './enum';
import { idSchema, kuantitas, paginasiQuery, uang, uangQuery } from './umum';

/** FRD `restock.md`. Kecocokan satuan & batas harga per satuan dicek `konversiRestock`. */

const jumlahInput = kuantitas('Jumlah', {
  min: '0',
  max: String(MAKS_JUMLAH_INPUT_RESTOCK),
  minEksklusif: true,
  pesanRentang: `Jumlah lebih dari 0 dan maksimal ${ribuan(MAKS_JUMLAH_INPUT_RESTOCK)}`,
});

/** `POST /api/restock`: satu request = satu bahan. */
export const simpanRestockSchema = z.strictObject({
  bahan_baku_id: idSchema,
  jumlah_input: jumlahInput,
  satuan_input: satuanInputSchema,
  total_harga: uang('Total harga', 0, MAKS_TOTAL_HARGA_RESTOCK),
});
export type SimpanRestockPayload = z.infer<typeof simpanRestockSchema>;

/** `GET /api/restock/pratinjau`: query sama dengan payload simpan. */
export const pratinjauRestockQuery = z.strictObject({
  bahan_baku_id: idSchema,
  jumlah_input: jumlahInput,
  satuan_input: satuanInputSchema,
  total_harga: uangQuery('Total harga', 0, MAKS_TOTAL_HARGA_RESTOCK),
});
export type PratinjauRestockQuery = z.infer<typeof pratinjauRestockQuery>;

/** `GET /api/restock`: rentang maks 90 hari dicek server. */
export const daftarRestockQuery = z.strictObject({
  bahan_baku_id: idSchema.optional(),
  ...paginasiQuery,
});
export type DaftarRestockQuery = z.infer<typeof daftarRestockQuery>;

// ── Respons ─────────────────────────────────────────────────────────────────

export interface DampakMenu {
  menu_id: string;
  nama: string;
  hpp_lama: string;
  hpp_baru: string;
  margin_persen_lama: number | null;
  margin_persen_baru: number | null;
  margin_rendah_baru: boolean;
}

export interface PratinjauRestockResponse {
  harga_beli_per_satuan_lama: string;
  harga_beli_per_satuan_baru: string;
  perubahan_persen: number | null;
  stok_sesudah: string;
  menu_terdampak: DampakMenu[];
}

/** 201 `POST /api/restock`: stok baru + menu terdampak (format pratinjau). */
export interface SimpanRestockResponse extends PratinjauRestockResponse {
  id: string;
  bahan_baku_id: string;
  stok_saat_ini: string;
}

export interface RestockLogResponse {
  id: string;
  bahan_baku_id: string;
  nama_bahan: string;
  satuan: Satuan;
  jumlah_input: string;
  satuan_input: SatuanInput;
  jumlah: string;
  total_harga: number;
  harga_beli_per_satuan: string;
  harga_beli_sebelumnya: string;
  nama_pengguna: string;
  created_at: string;
}

export interface DaftarRestockResponse {
  items: RestockLogResponse[];
  next_cursor: string | null;
  ringkasan: { total_belanja: number };
}
