import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, test } from 'vitest';
import { prisma, URL_LOKAL } from './helpers';

// Pengganti `prisma migrate diff` (data-model.md → Migrasi, Drift): setiap objek di
// prisma/manual-objects.sql.md harus ada setelah `migrate deploy` dari nol.
type Objek = { jenis: string; nama: string; tabel: string };

const daftar: Objek[] = readFileSync('prisma/manual-objects.sql.md', 'utf8')
  .split(/\r?\n/)
  .map((baris) => baris.split('|').map((s) => s.trim()))
  .filter((k) => k.length === 6 && /^[a-z]+$/.test(k[1]!) && k[1] !== 'jenis')
  .map((k) => ({ jenis: k[1]!, nama: k[2]!, tabel: k[3]! }));

async function ada({ jenis, nama, tabel }: Objek): Promise<boolean> {
  const q: Record<string, Promise<{ n: bigint }[]>> = {
    constraint: prisma.$queryRaw`SELECT count(*) AS n FROM pg_constraint
      WHERE conname = ${nama} AND conrelid = ${`public.${tabel}`}::regclass`,
    index: prisma.$queryRaw`SELECT count(*) AS n FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = ${nama} AND tablename = ${tabel}`,
    trigger: prisma.$queryRaw`SELECT count(*) AS n FROM pg_trigger
      WHERE tgname = ${nama} AND tgrelid = ${`public.${tabel}`}::regclass AND NOT tgisinternal`,
    policy: prisma.$queryRaw`SELECT count(*) AS n FROM pg_policies
      WHERE schemaname = 'public' AND policyname = ${nama} AND tablename = ${tabel}`,
    function: prisma.$queryRaw`SELECT count(*) AS n FROM pg_proc p
      JOIN pg_namespace s ON s.oid = p.pronamespace WHERE s.nspname = ${tabel} AND p.proname = ${nama}`,
    rls: prisma.$queryRaw`SELECT count(*) AS n FROM pg_class
      WHERE oid = ${`public.${tabel}`}::regclass AND relrowsecurity`,
    publication: prisma.$queryRaw`SELECT count(*) AS n FROM pg_publication_tables
      WHERE pubname = ${nama} AND schemaname = 'public' AND tablename = ${tabel}`,
  };
  const hasil = q[jenis];
  if (!hasil) throw new Error(`jenis tidak dikenal: ${jenis}`);
  return (await hasil)[0]!.n > 0n;
}

afterAll(() => prisma.$disconnect());

describe('skema', () => {
  test('NFR-05 manual-objects.sql.md terbaca', () => {
    expect(daftar.length).toBeGreaterThan(60);
  });

  test.each(daftar)('NFR-05 objek manual $jenis $nama ($tabel) ada', async (o) => {
    expect(await ada(o)).toBe(true);
  });

  test('NFR-01 NFR-05 14 tabel bisnis ada dan RLS aktif di semuanya', async () => {
    const tabel = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'`;
    expect(tabel).toHaveLength(14);
    expect(tabel.filter((t) => !t.relrowsecurity)).toEqual([]);
  });

  test('NFR-02 index wajib ada', async () => {
    const wajib = [
      ['transaksi', 'idx_transaksi_outlet_date'],
      ['stok_alert', 'idx_alert_unread'],
      ['resep_detail', 'idx_resep_menu'],
      ['stok_mutasi', 'idx_mutasi_bahan'],
      ['detail_transaksi', 'idx_detail_transaksi'],
      ['resep_detail', 'idx_resep_bahan'],
      // [S] data-model.md → Index Wajib
      ['transaksi', 'idx_transaksi_outlet_created'],
      ['detail_transaksi', 'idx_detail_outlet_menu'],
      ['stok_mutasi', 'idx_mutasi_ref'],
      ['riwayat_harga_beli', 'idx_riwayat_harga_bahan'],
      ['restock_log', 'idx_restock_outlet_created'],
      ['stok_opname', 'idx_opname_outlet_created'],
      ['stok_opname_detail', 'idx_opname_detail_bahan_created'],
    ];
    for (const [tabel, nama] of wajib)
      expect(await ada({ jenis: 'index', nama: nama!, tabel: tabel! }), nama).toBe(true);
  });

  test('NFR-01 stok_mutasi.seq bigint autoincrement unik', async () => {
    const [kolom] = await prisma.$queryRaw<{ data_type: string; column_default: string }[]>`
      SELECT data_type, column_default FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stok_mutasi' AND column_name = 'seq'`;
    expect(kolom!.data_type).toBe('bigint');
    expect(kolom!.column_default).toMatch(/^nextval\(/);
  });

  test('NFR-05 publication supabase_realtime hanya berisi stok_alert', async () => {
    const isi = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`;
    expect(isi.map((t) => t.tablename)).toEqual(['stok_alert']);
  });

  test('NFR-05 prisma validate lulus', () => {
    execFileSync('pnpm', ['exec', 'prisma', 'validate'], {
      env: { ...process.env, DATABASE_URL: URL_LOKAL, DIRECT_URL: URL_LOKAL },
      shell: process.platform === 'win32',
      stdio: 'pipe',
    });
  });
});
