import { z } from 'zod';
import {
  MAKS_HARGA_JUAL,
  MAKS_ITEM_RESEP,
  MAKS_NAMA,
  MAKS_TAKARAN,
  MIN_HARGA_JUAL,
  MIN_ITEM_TEMPLATE,
} from '../konstanta';
import { ribuan } from '../format';
import { PARAM_KODE } from '../kode-error';
import type { TurunanMenu } from '../rumus/hpp';
import { satuanSchema, urutMenuSchema, type Satuan } from './enum';
import { boolQuery, idSchema, kuantitas, pencarianSchema, teks, uang } from './umum';

/** FRD `menu.md`, `resep.md`. */

export const namaMenuSchema = teks('Nama menu', { max: MAKS_NAMA });
export const hargaJualSchema = uang('Harga jual', MIN_HARGA_JUAL, MAKS_HARGA_JUAL);
export const takaranSchema = kuantitas('Takaran', {
  min: '0',
  max: String(MAKS_TAKARAN),
  minEksklusif: true,
  pesanRentang: `Takaran lebih dari 0 dan maksimal ${ribuan(MAKS_TAKARAN)}`,
});

/** Duplikat `bahan_baku_id` → 422 `BAHAN_DUPLIKAT` (`resep.md` langkah 1). */
function tanpaBahanDuplikat(items: readonly object[]): boolean {
  const ids = items.flatMap((i) => ('bahan_baku_id' in i ? [i.bahan_baku_id] : []));
  return new Set(ids).size === ids.length;
}
const pesanDuplikat = {
  message: 'Bahan yang sama dipilih lebih dari sekali',
  params: { [PARAM_KODE]: 'BAHAN_DUPLIKAT' },
};

export const itemResepSchema = z.strictObject({
  bahan_baku_id: idSchema,
  takaran: takaranSchema,
});

export const daftarItemResepSchema = z
  .array(itemResepSchema)
  .max(MAKS_ITEM_RESEP, `Maksimal ${MAKS_ITEM_RESEP} bahan per resep`)
  .refine(tanpaBahanDuplikat, pesanDuplikat);

/** `PUT /api/menu/[id]/resep`: 0–30 item (ganti seluruh resep). */
export const simpanResepSchema = z.strictObject({ items: daftarItemResepSchema });
export type SimpanResepPayload = z.infer<typeof simpanResepSchema>;

/** `POST /api/menu`: `resep[]` opsional, aturan sama dengan `PUT …/resep`. */
export const buatMenuSchema = z.strictObject({
  nama: namaMenuSchema,
  harga_jual: hargaJualSchema,
  aktif: z.boolean().optional(),
  resep: daftarItemResepSchema.optional(),
});
export type BuatMenuPayload = z.infer<typeof buatMenuSchema>;

/** `PATCH /api/menu/[id]`: hanya nama, harga_jual, aktif. */
export const ubahMenuSchema = z.strictObject({
  nama: namaMenuSchema.optional(),
  harga_jual: hargaJualSchema.optional(),
  aktif: z.boolean().optional(),
});
export type UbahMenuPayload = z.infer<typeof ubahMenuSchema>;

/** `GET /api/menu`: default urut nama ASC (`menu.md` → Aturan Query). */
export const daftarMenuQuery = z.strictObject({
  urut: urutMenuSchema.optional(),
  aktif: boolQuery.optional(),
  margin_rendah: boolQuery.optional(),
  resep_kosong: boolQuery.optional(),
  q: pencarianSchema.optional(),
});
export type DaftarMenuQuery = z.infer<typeof daftarMenuQuery>;

/** `PATCH /api/menu/[id]/foto`: `path` dari respons `POST`; pola divalidasi server (outlet sesi). */
export const konfirmasiFotoSchema = z.strictObject({
  path: z.string().trim().min(1, 'Path wajib diisi').max(300),
});
export type KonfirmasiFotoPayload = z.infer<typeof konfirmasiFotoSchema>;

/** Pola path foto `{outlet_id}/{menu_id}-{timestamp}.webp` (`menu.md`). */
export function polaPathFoto(outletId: string, menuId: string): RegExp {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${esc(outletId)}/${esc(menuId)}-\\d+\\.webp$`);
}

// ── Template (`resep.md` → Action terapkan) ─────────────────────────────────

const itemTemplateSchema = z.union([
  z.strictObject({ bahan_baku_id: idSchema, takaran: takaranSchema }),
  z.strictObject({
    nama_bahan_baru: teks('Nama bahan', { max: MAKS_NAMA }),
    satuan: satuanSchema,
    takaran: takaranSchema,
  }),
]);

/** Duplikat juga berlaku untuk nama bahan baru (case-insensitive). */
function tanpaNamaBaruDuplikat(items: z.infer<typeof itemTemplateSchema>[]): boolean {
  const nama = items.flatMap((i) => ('nama_bahan_baru' in i ? [i.nama_bahan_baru.toLowerCase()] : []));
  return new Set(nama).size === nama.length;
}

/** `POST /api/resep-template/[kode]/terapkan`. */
export const terapkanTemplateSchema = z.strictObject({
  nama: namaMenuSchema.optional(),
  harga_jual: hargaJualSchema,
  items: z
    .array(itemTemplateSchema)
    .min(MIN_ITEM_TEMPLATE, 'Resep minimal 1 bahan')
    .max(MAKS_ITEM_RESEP, `Maksimal ${MAKS_ITEM_RESEP} bahan per resep`)
    .refine(tanpaBahanDuplikat, pesanDuplikat)
    .refine(tanpaNamaBaruDuplikat, pesanDuplikat),
});
export type TerapkanTemplatePayload = z.infer<typeof terapkanTemplateSchema>;

export const kodeTemplateParam = z.strictObject({
  kode: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Kode template tidak valid'),
});

// ── Respons (pemilik; kasir tidak punya akses menu) ─────────────────────────

export interface ResepItemResponse {
  bahan_baku_id: string;
  nama: string;
  satuan: Satuan;
  takaran: string;
  harga_beli_per_satuan: string;
}

export interface MenuResponse extends TurunanMenu {
  id: string;
  nama: string;
  harga_jual: number;
  foto_url: string | null;
  aktif: boolean;
  hpp_cached: string;
  jumlah_terjual_7_hari: number;
}

export interface DetailMenuResponse extends MenuResponse {
  resep: ResepItemResponse[];
}

/**
 * `POST /api/menu/[id]/foto`.
 * ponytail: FRD hanya menyebut signed upload URL + `path`; `token` disertakan karena
 * `uploadToSignedUrl` Supabase membutuhkannya.
 */
export interface SignedUploadResponse {
  signed_url: string;
  token: string;
  path: string;
}

export interface TemplateResponse {
  kode: string;
  nama_menu: string;
  bahan: { nama_bahan: string; satuan: Satuan; takaran: string; cocok_dengan: string | null }[];
}

export interface TerapkanTemplateResponse {
  menu: DetailMenuResponse;
  bahan_baru: { id: string; nama: string; satuan: Satuan }[];
}
