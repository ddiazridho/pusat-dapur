import type { NextConfig } from 'next';
import { parseServerEnv } from './src/server/env-schema';
import { parsePublicEnv } from './src/shared/env-public';

// Variabel wajib hilang → `next build` / `next dev` / `next start` gagal di sini
// (docs/architecture/infra-operasional.md → Environment Variable).
parsePublicEnv(process.env);
parseServerEnv(process.env);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
