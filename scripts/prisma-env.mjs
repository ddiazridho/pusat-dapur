// Menjalankan Prisma CLI dengan database target yang dikunci.
//   node scripts/prisma-env.mjs local <args prisma...>   → Postgres Supabase CLI lokal saja
//   node scripts/prisma-env.mjs dev   <args prisma...>   → Supabase dev, kredensial dari .env.dev
// `local` menolak URL non-lokal agar `prisma migrate dev` tidak pernah mengarah ke Supabase
// remote; `dev` hanya mengizinkan `migrate deploy` (docs/architecture/data-model.md → Migrasi).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const URL_LOKAL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const [target, ...args] = process.argv.slice(2);

function gagal(pesan) {
  console.error(`prisma-env: ${pesan}`);
  process.exit(1);
}

function hostLokal(url) {
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

const env = { ...process.env };

if (target === 'local') {
  // Selalu Postgres Supabase CLI lokal; env shell tidak dipakai.
  env.DATABASE_URL = URL_LOKAL;
  env.DIRECT_URL = URL_LOKAL;
} else if (target === 'dev') {
  if (args.join(' ') !== 'migrate deploy') gagal('target dev hanya mengizinkan `migrate deploy`.');
  if (!existsSync('.env.dev'))
    gagal('.env.dev tidak ditemukan (DATABASE_URL & DIRECT_URL Supabase dev).');
  // Nilai .env.dev selalu menimpa env shell, agar target tidak tertukar.
  const dariFile = parseEnv(readFileSync('.env.dev', 'utf8'));
  if (!dariFile.DIRECT_URL) gagal('DIRECT_URL wajib di .env.dev.');
  env.DIRECT_URL = dariFile.DIRECT_URL;
  env.DATABASE_URL = dariFile.DATABASE_URL ?? dariFile.DIRECT_URL;
  if (hostLokal(env.DIRECT_URL))
    gagal('DIRECT_URL di .env.dev menunjuk ke lokal, bukan Supabase dev.');
} else {
  gagal('target harus `local` atau `dev`.');
}

const hasil = spawnSync('pnpm', ['exec', 'prisma', ...args], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
process.exit(hasil.status ?? 1);
