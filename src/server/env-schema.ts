import { z } from 'zod';
import { formatEnvError, kosongJadiUndefined, publicEnvSchema } from '../shared/env-public'; // relatif: juga dimuat next.config.ts (tanpa alias)

/**
 * Skema env server (docs/architecture/infra-operasional.md → Environment Variable).
 *
 * File ini sengaja TIDAK memakai `import 'server-only'` karena juga dipanggil dari
 * `next.config.ts` (Node biasa) agar variabel wajib yang hilang menggagalkan build.
 * File ini tidak membaca `process.env` sendiri; kode aplikasi memakai `@/server/env`.
 */

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, 'harus URL postgres:// atau postgresql://');

const baseSchema = publicEnvSchema.extend({
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: z.string().min(1).optional(),
  VERCEL_BRANCH_URL: z.string().min(1).optional(),

  SUPABASE_SECRET_KEY: z.string().min(1),
  DATABASE_URL: postgresUrl,
  /** Hanya untuk migrasi/CI (`prisma migrate deploy`). */
  DIRECT_URL: postgresUrl.optional(),

  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  APP_URL: z.url().optional(),
  /** Dipakai route cron (#22a, #24a); secret disiapkan di H6. */
  CRON_SECRET: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Lingkungan = 'production' | 'preview' | 'lokal';

export type ServerEnv = z.infer<typeof baseSchema> & {
  /** `production` / `preview` dari `VERCEL_ENV`; selain itu (termasuk `vercel dev`) = `lokal`. */
  LINGKUNGAN: Lingkungan;
  /** Origin yang diterima untuk request mutasi (cek header `Origin`). */
  APP_ORIGINS: string[];
};

const serverEnvSchema = baseSchema.superRefine((env, ctx) => {
  const wajib = (key: keyof typeof env, alasan: string) => {
    if (env[key] === undefined) {
      ctx.addIssue({ code: 'custom', path: [key], message: `wajib diisi ${alasan}` });
    }
  };

  if (env.VERCEL_ENV === 'production') {
    wajib('APP_URL', 'di Production');
    wajib('UPSTASH_REDIS_REST_URL', 'di Production');
    wajib('UPSTASH_REDIS_REST_TOKEN', 'di Production');
  } else if (env.VERCEL_ENV === 'preview') {
    wajib('VERCEL_URL', 'di Preview (disediakan Vercel)');
  } else {
    wajib('APP_URL', 'di lokal (contoh http://localhost:3000)');
  }
});

function keOrigin(hostAtauUrl: string): string {
  const url = /^https?:\/\//.test(hostAtauUrl) ? hostAtauUrl : `https://${hostAtauUrl}`;
  return new URL(url).origin;
}

export function hitungAppOrigins(env: z.infer<typeof baseSchema>): string[] {
  if (env.VERCEL_ENV === 'preview') {
    const hosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL].filter(
      (host): host is string => host !== undefined,
    );
    return [...new Set(hosts.map(keOrigin))];
  }
  return env.APP_URL === undefined ? [] : [keOrigin(env.APP_URL)];
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const hasil = serverEnvSchema.safeParse(kosongJadiUndefined(source));
  if (!hasil.success) throw formatEnvError('server', hasil.error);
  const env = hasil.data;
  const LINGKUNGAN: Lingkungan =
    env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview' ? env.VERCEL_ENV : 'lokal';
  return { ...env, LINGKUNGAN, APP_ORIGINS: hitungAppOrigins(env) };
}
