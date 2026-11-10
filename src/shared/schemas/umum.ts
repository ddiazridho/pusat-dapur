import { z } from 'zod';
import {
  DIGIT_HARGA_SATUAN,
  DIGIT_KUANTITAS,
  LIMIT_DEFAULT,
  MAKS_HARGA_BELI,
  MAKS_LIMIT,
  MAKS_PASSWORD,
  MIN_LIMIT,
  MIN_PASSWORD,
  MIN_PENCARIAN,
} from '../konstanta';
import { rupiah } from '../format';
import { jumlahDigitPecahan, keSkala } from '../rumus/desimal';

/**
 * Primitif Zod bersama. Pesan mengikuti pola `konten-aksesibilitas.md` §2
 * ("apa yang benar"). Teks di-trim sebelum validasi (NFR-01); kata sandi tidak.
 */

export function teks(label: string, opsi: { min?: number; max: number }) {
  const min = opsi.min ?? 1;
  return z
    .string({ error: `${label} wajib diisi` })
    .trim()
    .min(min, min <= 1 ? `${label} wajib diisi` : `Isi minimal ${min} karakter`)
    .max(opsi.max, `Maksimal ${opsi.max} karakter`);
}

export function password(label = 'Kata sandi') {
  return z
    .string({ error: `${label} wajib diisi` })
    .min(MIN_PASSWORD, `Isi minimal ${MIN_PASSWORD} karakter`)
    .max(MAKS_PASSWORD, `Maksimal ${MAKS_PASSWORD} karakter`);
}

export const idSchema = z.uuid({ error: 'ID tidak valid' });
/** `client_tx_id`, `device_id` dibuat perangkat sebagai UUID v4 (NFR-01). */
export const uuidV4Schema = z.uuidv4({ error: 'ID tidak valid' });

/** Rupiah integer dalam rentang inklusif. */
export function uang(label: string, min: number, max: number) {
  const pesan = `${label} antara ${rupiah(min)} dan ${rupiah(max)}`;
  return z
    .number({ error: `${label} wajib diisi` })
    .int('Isi tanpa angka di belakang koma')
    .min(min, pesan)
    .max(max, pesan);
}

/** Varian `uang` untuk query string (`?total_harga=60000`). */
export function uangQuery(label: string, min: number, max: number) {
  return z.coerce.number({ error: `${label} wajib diisi` }).pipe(uang(label, min, max));
}

const POLA_ANGKA = /^\d+(\.\d+)?$/;

function desimal(label: string, digit: number, pesanDigit: string) {
  return z
    .string({ error: `${label} wajib diisi` })
    .trim()
    .min(1, `${label} wajib diisi`)
    .regex(POLA_ANGKA, `${label} harus berupa angka`)
    .refine((s) => jumlahDigitPecahan(s) <= digit, pesanDigit);
}

/**
 * Kuantitas bahan: string desimal maks 3 digit pecahan (NFR-01), dalam rentang.
 * `minEksklusif` untuk aturan "> 0" (takaran, jumlah restock).
 */
export function kuantitas(
  label: string,
  opsi: { min: string; max: string; minEksklusif?: boolean; pesanRentang: string },
) {
  const min = keSkala(opsi.min, DIGIT_KUANTITAS);
  const max = keSkala(opsi.max, DIGIT_KUANTITAS);
  return desimal(label, DIGIT_KUANTITAS, 'Maksimal 3 angka di belakang koma').refine((s) => {
    const nilai = keSkala(s, DIGIT_KUANTITAS);
    return (opsi.minEksklusif ? nilai > min : nilai >= min) && nilai <= max;
  }, opsi.pesanRentang);
}

/** `harga_beli_per_satuan`: 0–10.000.000, maks 2 digit pecahan (`numeric(12,2)`). */
export function hargaSatuan(label: string) {
  const max = BigInt(MAKS_HARGA_BELI) * 100n;
  return desimal(label, DIGIT_HARGA_SATUAN, 'Maksimal 2 angka di belakang koma').refine(
    (s) => keSkala(s, DIGIT_HARGA_SATUAN) <= max,
    `${label} antara Rp0 dan ${rupiah(MAKS_HARGA_BELI)}`,
  );
}

/** Tanggal kalender `YYYY-MM-DD` (zona outlet ditentukan pemakai). */
export const tanggalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
  .refine((s) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  }, 'Tanggal tidak ada di kalender');

/** Waktu ISO 8601 dengan zona (`2026-11-10T03:15:00.000Z`). */
export const waktuIsoSchema = z.iso.datetime({ offset: true, error: 'Format waktu ISO 8601' });

/** Boolean dari query string: hanya `true`/`false`. */
export const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const pencarianSchema = z
  .string()
  .trim()
  .min(MIN_PENCARIAN, `Isi minimal ${MIN_PENCARIAN} karakter`)
  .max(100, 'Maksimal 100 karakter');

/** Paginasi cursor (`api.md`): `limit` 1–100 (default 50), `cursor` opaque. */
export const paginasiQuery = {
  limit: z.coerce
    .number()
    .int()
    .min(MIN_LIMIT, `Limit antara ${MIN_LIMIT} dan ${MAKS_LIMIT}`)
    .max(MAKS_LIMIT, `Limit antara ${MIN_LIMIT} dan ${MAKS_LIMIT}`)
    .default(LIMIT_DEFAULT),
  cursor: z.string().min(1).max(512).optional(),
};

/** Body request tanpa data (NFR-04: client tetap mengirim `{}`). */
export const bodyKosongSchema = z.strictObject({});

// ── Bentuk respons umum ─────────────────────────────────────────────────────

export interface Halaman<T> {
  items: T[];
  next_cursor: string | null;
}

export const errorBodySchema = z.object({
  error: z.object({
    kode: z.string(),
    pesan: z.string(),
    detail: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;
