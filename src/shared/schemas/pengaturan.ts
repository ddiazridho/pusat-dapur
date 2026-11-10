import { z } from 'zod';
import { MAKS_AMBANG_MARGIN, MAKS_NAMA, MIN_AMBANG_MARGIN } from '../konstanta';
import { zonaWaktuSchema, type ZonaWaktu } from './enum';
import { teks } from './umum';

/** FRD `pengaturan-outlet.md`. */

/**
 * `PATCH /api/pengaturan`: ubah sebagian. `onboarding_selesai` hanya `true`
 * (`true → false` → 422 `VALIDASI_GAGAL` di field itu, `api.md`).
 */
export const ubahPengaturanSchema = z.strictObject({
  nama_outlet: teks('Nama warung', { max: MAKS_NAMA }).optional(),
  zona_waktu: zonaWaktuSchema.optional(),
  ambang_margin: z
    .number({ error: 'Ambang margin wajib diisi' })
    .int('Isi bilangan bulat')
    .min(MIN_AMBANG_MARGIN, 'Isi 0–100')
    .max(MAKS_AMBANG_MARGIN, 'Isi 0–100')
    .optional(),
  blokir_stok_kurang: z.boolean().optional(),
  onboarding_selesai: z.literal(true, { error: 'Onboarding tidak bisa dibuka lagi' }).optional(),
});
export type UbahPengaturanPayload = z.infer<typeof ubahPengaturanSchema>;

/** `GET /api/pengaturan` dan respons `PATCH`. */
export interface PengaturanResponse {
  nama_outlet: string;
  zona_waktu: ZonaWaktu;
  ambang_margin: number;
  blokir_stok_kurang: boolean;
  onboarding_selesai: boolean;
}
