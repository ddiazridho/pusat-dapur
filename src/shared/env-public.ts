import { z } from 'zod';

/**
 * Env publik (boleh sampai ke browser & Service Worker). Lihat
 * docs/architecture/infra-operasional.md → Environment Variable.
 *
 * Nilai `NEXT_PUBLIC_*` harus dirujuk secara literal (`process.env.NEXT_PUBLIC_X`)
 * agar di-inline Next.js saat build. Validasi wajib saat build dijalankan dari
 * `next.config.ts`; `envPublic()` memvalidasi ulang saat pertama dipakai.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function formatEnvError(label: string, error: z.ZodError): Error {
  const daftar = error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  return new Error(`Env ${label} tidak valid:\n${daftar}`);
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const hasil = publicEnvSchema.safeParse(kosongJadiUndefined(source));
  if (!hasil.success) throw formatEnvError('publik', hasil.error);
  return hasil.data;
}

/** String kosong dianggap tidak diisi (Vercel/CI kerap mengirim `""`). */
export function kosongJadiUndefined(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
}

let cache: PublicEnv | undefined;

export function envPublic(): PublicEnv {
  cache ??= parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cache;
}
