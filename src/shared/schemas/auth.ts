import { z } from 'zod';
import { MAKS_EMAIL, MAKS_NAMA, MAKS_USERNAME, MIN_USERNAME } from '../konstanta';
import { POLA_USERNAME } from '../akun';
import { password, teks } from './umum';

/** FRD `auth.md`, `akun-kasir.md`; `api.md` → Auth & Akun. */

export const emailSchema = z
  .string({ error: 'Email wajib diisi' })
  .trim()
  .toLowerCase()
  .max(MAKS_EMAIL, `Maksimal ${MAKS_EMAIL} karakter`)
  .pipe(z.email({ error: 'Format email belum benar' }));

/** `POST /api/auth/daftar`. */
export const daftarSchema = z.strictObject({
  email: emailSchema,
  password: password(),
  nama: teks('Nama', { max: MAKS_NAMA }),
  nama_outlet: teks('Nama warung', { max: MAKS_NAMA }),
});
export type DaftarPayload = z.infer<typeof daftarSchema>;

/** Form `/login` (client → Supabase Auth; tanpa endpoint sendiri). */
export const loginSchema = z.strictObject({
  identitas: teks('Email atau username', { max: MAKS_EMAIL }),
  password: password(),
});
export type LoginPayload = z.infer<typeof loginSchema>;

/** Form `/lupa-password` (client → Supabase Auth). */
export const lupaPasswordSchema = z.strictObject({ email: emailSchema });

/** Form `/reset-password` (client → Supabase Auth `updateUser`). */
export const resetPasswordSchema = z.strictObject({ password: password('Kata sandi baru') });

/** `POST /api/akun/password`: kata sandi baru ≠ lama. */
export const gantiPasswordSchema = z
  .strictObject({
    password_lama: password('Kata sandi lama'),
    password_baru: password('Kata sandi baru'),
  })
  .refine((v) => v.password_baru !== v.password_lama, {
    path: ['password_baru'],
    message: 'Kata sandi baru harus berbeda dari yang lama',
  });
export type GantiPasswordPayload = z.infer<typeof gantiPasswordSchema>;

// `POST /api/akun/password-reset-selesai` memakai `bodyKosongSchema` (umum.ts).

// ── Akun kasir (`akun-kasir.md`) ────────────────────────────────────────────

export const usernameSchema = z
  .string({ error: 'Username wajib diisi' })
  .trim()
  .min(MIN_USERNAME, `Isi ${MIN_USERNAME}–${MAKS_USERNAME} karakter`)
  .max(MAKS_USERNAME, `Isi ${MIN_USERNAME}–${MAKS_USERNAME} karakter`)
  .regex(POLA_USERNAME, 'Hanya huruf kecil, angka, titik, dan garis bawah');

/** `POST /api/kasir`. */
export const buatKasirSchema = z.strictObject({
  nama: teks('Nama kasir', { max: MAKS_NAMA }),
  username: usernameSchema,
  password: password(),
});
export type BuatKasirPayload = z.infer<typeof buatKasirSchema>;

/** `PATCH /api/kasir/[id]`: nama, reset kata sandi, aktif/nonaktif. `username` tidak dapat diubah. */
export const ubahKasirSchema = z.strictObject({
  nama: teks('Nama kasir', { max: MAKS_NAMA }).optional(),
  password: password('Kata sandi baru').optional(),
  aktif: z.boolean().optional(),
});
export type UbahKasirPayload = z.infer<typeof ubahKasirSchema>;

// ── Respons ─────────────────────────────────────────────────────────────────

/** `GET /api/kasir` item; `password` tidak pernah dikembalikan. */
export interface KasirResponse {
  id: string;
  nama: string;
  username: string;
  aktif: boolean;
  created_at: string;
  login_terakhir_at: string | null;
}
