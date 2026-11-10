// Menjalankan Prisma CLI dengan database target yang dikunci.
//   node scripts/prisma-env.mjs local <args prisma...>   → Postgres Supabase CLI lokal saja
//   node scripts/prisma-env.mjs dev   <args prisma...>   → Supabase dev, kredensial dari .env.dev
// `local` selalu memakai URL lokal agar migrasi tidak pernah dibuat terhadap Supabase remote;
// `dev` hanya mengizinkan `migrate deploy` (docs/architecture/data-model.md → Migrasi).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

function prisma(argPrisma, opsi = {}) {
  const hasil = spawnSync('pnpm', ['exec', 'prisma', ...argPrisma], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
    encoding: 'utf8',
    ...opsi,
  });
  if (hasil.status !== 0) process.exit(hasil.status ?? 1);
  return hasil.stdout;
}

// `local migrate dev [--create-only] [--name x]` tidak memanggil `prisma migrate dev`: cek
// drift-nya mengintrospeksi DB lokal dan gagal P4002 karena FK users.id → auth.users (lintas
// schema). Penggantinya: migrate diff (folder migrasi → schema.prisma, via shadow DB lokal
// `prisma_shadow` yang dibuat ulang) → tulis migrasi baru → migrate deploy + generate.
if (target === 'local' && args[0] === 'migrate' && args[1] === 'dev') {
  const createOnly = args.includes('--create-only');
  const iNama = args.indexOf('--name');
  const nama = iNama >= 0 ? args[iNama + 1] : undefined;
  const shadow = URL_LOKAL.replace(/\/postgres$/, '/prisma_shadow');
  for (const sql of [
    'DROP DATABASE IF EXISTS prisma_shadow WITH (FORCE);',
    'CREATE DATABASE prisma_shadow;',
  ])
    prisma(['db', 'execute', '--url', URL_LOKAL, '--stdin'], {
      input: sql,
      stdio: ['pipe', 'ignore', 'inherit'],
    });
  const diff = prisma(
    [
      'migrate',
      'diff',
      '--from-migrations',
      'prisma/migrations',
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--shadow-database-url',
      shadow,
      '--script',
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  if (!diff.includes('This is an empty migration.')) {
    if (!nama || !/^[a-z0-9_]+$/.test(nama))
      gagal('schema.prisma berubah: beri `--name nama_migrasi` (huruf kecil, angka, _).');
    const stempel = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const dir = `prisma/migrations/${stempel}_${nama}`;
    mkdirSync(dir);
    writeFileSync(`${dir}/migration.sql`, diff);
    console.log(`prisma-env: migrasi dibuat ${dir}/migration.sql (cek baris DROP objek manual).`);
  } else console.log('prisma-env: schema.prisma tidak berubah.');
  if (createOnly) process.exit(0);
  prisma(['migrate', 'deploy']);
  prisma(['generate']);
  process.exit(0);
}

prisma(args);
process.exit(0);
