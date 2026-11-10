import { z } from 'zod';
import { MAKS_CATATAN, MAKS_ITEM_OPNAME, MAKS_STOK } from '../konstanta';
import { alasanOpnameSchema, type AlasanOpname, type Satuan } from './enum';
import { idSchema, kuantitas, paginasiQuery } from './umum';

/** FRD `stok-opname.md`. */

export const itemOpnameSchema = z.strictObject({
  bahan_baku_id: idSchema,
  stok_fisik: kuantitas('Hitungan fisik', {
    min: '0',
    max: MAKS_STOK,
    pesanRentang: 'Hitungan fisik terlalu besar',
  }),
  alasan: alasanOpnameSchema.optional(),
});

/** `POST /api/opname`: 1–200 item, `bahan_baku_id` unik. */
export const simpanOpnameSchema = z.strictObject({
  items: z
    .array(itemOpnameSchema)
    .min(1, 'Isi hitungan fisik minimal 1 bahan')
    .max(MAKS_ITEM_OPNAME, `Maksimal ${MAKS_ITEM_OPNAME} bahan per opname`)
    .refine(
      (items) => new Set(items.map((i) => i.bahan_baku_id)).size === items.length,
      'Bahan yang sama diisi lebih dari sekali',
    ),
  catatan: z.string().trim().max(MAKS_CATATAN, `Maksimal ${MAKS_CATATAN} karakter`).optional(),
});
export type SimpanOpnamePayload = z.infer<typeof simpanOpnameSchema>;

export const daftarOpnameQuery = z.strictObject({ ...paginasiQuery });

// ── Respons ─────────────────────────────────────────────────────────────────

export interface OpnameRingkasResponse {
  id: string;
  created_at: string;
  nama_pengguna: string;
  jumlah_bahan: number;
  jumlah_bahan_selisih: number;
  total_nilai_selisih: string;
}

export interface OpnameDetailItemResponse {
  bahan_baku_id: string;
  nama: string;
  satuan: Satuan;
  stok_sistem: string;
  stok_fisik: string;
  selisih: string;
  alasan: AlasanOpname | null;
  nilai_selisih: string;
}

/** `GET /api/opname/[id]` dan 201 `POST /api/opname`. */
export interface OpnameDetailResponse extends OpnameRingkasResponse {
  catatan: string | null;
  items: OpnameDetailItemResponse[];
}
