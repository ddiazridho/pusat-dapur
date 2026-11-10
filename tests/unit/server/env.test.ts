import { afterEach, describe, expect, test, vi } from 'vitest';
import { parseServerEnv } from '@/server/env-schema';

const dasar = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  SUPABASE_SECRET_KEY: 'secret-key',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
};

const lokal = { ...dasar, APP_URL: 'http://localhost:3000' };

const production = {
  ...dasar,
  VERCEL_ENV: 'production',
  APP_URL: 'https://pusat-dapur.vercel.app',
  UPSTASH_REDIS_REST_URL: 'https://contoh.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token',
};

const preview = {
  ...dasar,
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'pusat-dapur-abc123-tim.vercel.app',
  VERCEL_BRANCH_URL: 'pusat-dapur-git-feat-x-tim.vercel.app',
};

function tanpa(source: Record<string, string>, key: string): Record<string, string | undefined> {
  return { ...source, [key]: undefined };
}

describe('parseServerEnv', () => {
  test('lokal: valid dengan APP_URL, tanpa Upstash', () => {
    const env = parseServerEnv(lokal);
    expect(env.LINGKUNGAN).toBe('lokal');
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(env.LOG_LEVEL).toBe('info');
  });

  test.each(['SUPABASE_SECRET_KEY', 'DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const)(
    'variabel wajib %s hilang → error menyebut nama variabel',
    (key) => {
      expect(() => parseServerEnv(tanpa(lokal, key))).toThrow(key);
    },
  );

  test('string kosong diperlakukan sebagai tidak diisi', () => {
    expect(() => parseServerEnv({ ...lokal, SUPABASE_SECRET_KEY: '' })).toThrow(
      'SUPABASE_SECRET_KEY',
    );
  });

  test('DATABASE_URL harus URL postgres', () => {
    expect(() => parseServerEnv({ ...lokal, DATABASE_URL: 'mysql://x' })).toThrow('DATABASE_URL');
  });

  test('lokal: APP_URL wajib', () => {
    expect(() => parseServerEnv(dasar)).toThrow('APP_URL');
  });

  test('Production: Upstash dan APP_URL wajib', () => {
    expect(() => parseServerEnv(production)).not.toThrow();
    for (const key of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'APP_URL'] as const) {
      expect(() => parseServerEnv(tanpa(production, key))).toThrow(key);
    }
  });

  test('Preview: tanpa Upstash dan tanpa APP_URL tetap valid; VERCEL_URL wajib', () => {
    expect(parseServerEnv(preview).LINGKUNGAN).toBe('preview');
    expect(() => parseServerEnv(tanpa(preview, 'VERCEL_URL'))).toThrow('VERCEL_URL');
  });

  test('LOG_LEVEL hanya debug|info|warn|error', () => {
    expect(parseServerEnv({ ...lokal, LOG_LEVEL: 'debug' }).LOG_LEVEL).toBe('debug');
    expect(() => parseServerEnv({ ...lokal, LOG_LEVEL: 'verbose' })).toThrow('LOG_LEVEL');
  });
});

describe('APP_ORIGINS', () => {
  test('S-22 Production = [APP_URL]', () => {
    expect(parseServerEnv(production).APP_ORIGINS).toEqual(['https://pusat-dapur.vercel.app']);
  });

  test('S-22 Preview = VERCEL_URL + VERCEL_BRANCH_URL (https), APP_URL diabaikan', () => {
    const env = parseServerEnv({ ...preview, APP_URL: 'https://pusat-dapur.vercel.app' });
    expect(env.APP_ORIGINS).toEqual([
      'https://pusat-dapur-abc123-tim.vercel.app',
      'https://pusat-dapur-git-feat-x-tim.vercel.app',
    ]);
  });

  test('S-22 Preview tanpa VERCEL_BRANCH_URL = [VERCEL_URL]', () => {
    expect(parseServerEnv(tanpa(preview, 'VERCEL_BRANCH_URL')).APP_ORIGINS).toEqual([
      'https://pusat-dapur-abc123-tim.vercel.app',
    ]);
  });

  test('S-22 lokal = [APP_URL] dinormalisasi ke origin', () => {
    expect(parseServerEnv({ ...lokal, APP_URL: 'http://localhost:3100/' }).APP_ORIGINS).toEqual([
      'http://localhost:3100',
    ]);
  });
});

describe('@/server/env', () => {
  afterEach(() => {
    vi.resetModules();
  });

  test('memvalidasi process.env saat modul dimuat (gagal bila wajib hilang)', async () => {
    for (const [key, value] of Object.entries(lokal)) vi.stubEnv(key, value);
    vi.stubEnv('VERCEL_ENV', '');
    const { env } = await import('@/server/env');
    expect(env.APP_ORIGINS).toEqual(['http://localhost:3000']);

    vi.resetModules();
    vi.stubEnv('DATABASE_URL', '');
    await expect(import('@/server/env')).rejects.toThrow('DATABASE_URL');
  });
});
