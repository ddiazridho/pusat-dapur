import { defineConfig, devices } from '@playwright/test';

// E2E terhadap `next start` (build dulu: `pnpm build`). Port per worktree lewat PORT
// (slot 3100+n); BASE_URL menimpa untuk smoke URL Preview (#14).
const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

// Nilai placeholder non-rahasia (sama dengan step Build di ci.yml) agar validasi env
// next.config.ts lolos; env yang sudah di-set selalu menang.
const envPlaceholder = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'ci-placeholder',
  SUPABASE_SECRET_KEY: 'ci-placeholder',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  APP_URL: baseURL,
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, locale: 'id-ID', trace: 'retain-on-failure' },
  projects: [
    // Pixel 5 (UA, sentuh, DPR) dengan viewport target utama 360 × 640 (tokens.md §5).
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 640 } } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `pnpm start --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { ...envPlaceholder, ...(process.env as Record<string, string>) },
      },
});
