import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Integrasi (tests/integration/**, Postgres lokal via `supabase start`) dan
// HTTP (tests/http/**, `next start` lokal). Skrip memilih folder lewat `--dir`.
// File dijalankan serial: satu database lokal dipakai bersama dan direset per file.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/support/server-only.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/{integration,http}/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    restoreMocks: true,
    unstubEnvs: true,
  },
});
