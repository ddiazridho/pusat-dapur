import { afterEach, describe, expect, test, vi } from 'vitest';
import { parsePublicEnv } from '@/shared/env-public';

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
};

describe('parsePublicEnv', () => {
  test('valid', () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  test('hanya mengembalikan variabel publik (tanpa rahasia server)', () => {
    const env = parsePublicEnv({ ...valid, SUPABASE_SECRET_KEY: 'rahasia' });
    expect(Object.keys(env).sort()).toEqual([
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
    ]);
  });

  test.each(Object.keys(valid))('%s wajib', (key) => {
    expect(() => parsePublicEnv({ ...valid, [key]: undefined })).toThrow(key);
    expect(() => parsePublicEnv({ ...valid, [key]: '' })).toThrow(key);
  });

  test('NEXT_PUBLIC_SUPABASE_URL harus URL', () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'bukan-url' })).toThrow(
      'NEXT_PUBLIC_SUPABASE_URL',
    );
  });
});

describe('envPublic()', () => {
  afterEach(() => {
    vi.resetModules();
  });

  test('membaca process.env NEXT_PUBLIC_*', async () => {
    for (const [key, value] of Object.entries(valid)) vi.stubEnv(key, value);
    const { envPublic } = await import('@/shared/env-public');
    expect(envPublic()).toEqual(valid);
  });

  test('gagal bila NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY kosong', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', valid.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    const { envPublic } = await import('@/shared/env-public');
    expect(() => envPublic()).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });
});
