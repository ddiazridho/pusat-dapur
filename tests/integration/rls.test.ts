import { afterAll, describe, expect, test } from 'vitest';
import { buatOutlet, dalamRollback, prisma, type Fixture, type Tx } from './helpers';

// RLS lapis 2 (auth-akses.md, data-model.md → RLS): `set local role authenticated` +
// `request.jwt.claims` meniru JWT Supabase.
afterAll(() => prisma.$disconnect());

async function sebagai(tx: Tx, role: 'authenticated' | 'anon', klaim?: Record<string, unknown>) {
  await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
  await tx.$executeRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify(klaim ?? {})}, true)`;
}

const jwt = (outletId: string, peran: 'pemilik' | 'kasir') => ({
  role: 'authenticated',
  app_metadata: { outlet_id: outletId, peran, read_only: false },
});

async function hitung(tx: Tx): Promise<Record<string, number>> {
  const [baris] = await tx.$queryRaw<Record<string, bigint>[]>`SELECT
    (SELECT count(*) FROM outlets) AS outlets,
    (SELECT count(*) FROM users) AS users,
    (SELECT count(*) FROM bahan_baku) AS bahan_baku,
    (SELECT count(*) FROM menus) AS menus,
    (SELECT count(*) FROM stok_alert) AS stok_alert`;
  return Object.fromEntries(Object.entries(baris!).map(([k, v]) => [k, Number(v)]));
}

describe('RLS', () => {
  test('NFR-05 pemilik hanya melihat baris outlet sendiri', async () => {
    await dalamRollback(async (tx) => {
      const a = await buatOutlet(tx);
      const b = await buatOutlet(tx);
      await tx.stokAlert.create({
        data: { outlet_id: b.outletId, bahan_baku_id: b.bahanId, jenis: 'stok_menipis' },
      });
      await sebagai(tx, 'authenticated', jwt(a.outletId, 'pemilik'));
      expect(await hitung(tx)).toEqual({
        outlets: 1,
        users: 2,
        bahan_baku: 1,
        menus: 1,
        stok_alert: 0,
      });
      const [o] = await tx.$queryRaw<{ id: string }[]>`SELECT id::text FROM outlets`;
      expect(o!.id).toBe(a.outletId);
    });
  });

  test('NFR-05 pemilik outlet B melihat stok_alert outlet B (Realtime)', async () => {
    await dalamRollback(async (tx) => {
      const b: Fixture = await buatOutlet(tx);
      await tx.stokAlert.create({
        data: { outlet_id: b.outletId, bahan_baku_id: b.bahanId, jenis: 'stok_menipis' },
      });
      await sebagai(tx, 'authenticated', jwt(b.outletId, 'pemilik'));
      expect((await hitung(tx)).stok_alert).toBe(1);
    });
  });

  test('NFR-05 kasir tidak punya akses SELECT di tabel mana pun', async () => {
    await dalamRollback(async (tx) => {
      const a = await buatOutlet(tx);
      await sebagai(tx, 'authenticated', jwt(a.outletId, 'kasir'));
      expect(await hitung(tx)).toEqual({
        outlets: 0,
        users: 0,
        bahan_baku: 0,
        menus: 0,
        stok_alert: 0,
      });
    });
  });

  test('NFR-05 tanpa klaim outlet: tidak ada baris', async () => {
    await dalamRollback(async (tx) => {
      await buatOutlet(tx);
      await sebagai(tx, 'authenticated', { role: 'authenticated' });
      expect(await hitung(tx)).toEqual({
        outlets: 0,
        users: 0,
        bahan_baku: 0,
        menus: 0,
        stok_alert: 0,
      });
    });
  });

  test('NFR-05 authenticated tidak bisa menulis (hanya SELECT)', async () => {
    await expect(
      dalamRollback(async (tx) => {
        const a = await buatOutlet(tx);
        await sebagai(tx, 'authenticated', jwt(a.outletId, 'pemilik'));
        await tx.$executeRaw`UPDATE menus SET harga_jual = 1 WHERE id = ${a.menuId}::uuid`;
      }),
    ).rejects.toThrow(/permission denied/);
  });

  test('NFR-05 anon tidak punya akses ke tabel public', async () => {
    await expect(
      dalamRollback(async (tx) => {
        await sebagai(tx, 'anon');
        await tx.$queryRaw`SELECT count(*) FROM menus`;
      }),
    ).rejects.toThrow(/permission denied/);
  });
});
