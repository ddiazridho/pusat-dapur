import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit test (tests/unit/**). Integrasi & HTTP memakai vitest.config.int.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` melempar error di luar bundel React Server; di Vitest cukup modul kosong.
      'server-only': fileURLToPath(new URL('./tests/support/server-only.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    restoreMocks: true,
    unstubEnvs: true,
  },
});
