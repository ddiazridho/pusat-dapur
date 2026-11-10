import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit test (tests/unit/**). Integrasi & HTTP memakai vitest.config.int.ts.
// `client/` & `components/` berjalan di jsdom (Testing Library + fake-indexeddb); sisanya node.
const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  // `server-only` melempar error di luar bundel React Server; di Vitest cukup modul kosong.
  'server-only': fileURLToPath(new URL('./tests/support/server-only.ts', import.meta.url)),
};
const dom = ['tests/unit/client/**/*.test.{ts,tsx}', 'tests/unit/components/**/*.test.{ts,tsx}'];

export default defineConfig({
  resolve: { alias },
  esbuild: { jsx: 'automatic' },
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          exclude: dom,
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          include: dom,
          environment: 'jsdom',
          setupFiles: ['tests/support/setup-dom.ts'],
        },
      },
    ],
  },
});
