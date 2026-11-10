import { Prisma } from '@prisma/client';
import { describe, expect, test } from 'vitest';
import { bolehUlang, MODEL_BISNIS, sisipkanOutlet } from '@/server/db';

const OUTLET = '11111111-1111-4111-8111-111111111111';
const LAIN = '22222222-2222-4222-8222-222222222222';

describe('forOutlet: injeksi outlet_id (NFR-05, auth-akses lapis 1)', () => {
  test('semua model ber-outlet_id terdaftar; Outlet tidak', () => {
    const modelBerOutlet = Prisma.dmmf.datamodel.models
      .filter((m) => m.fields.some((f) => f.name === 'outlet_id'))
      .map((m) => m.name)
      .sort();
    expect([...MODEL_BISNIS].sort()).toEqual(modelBerOutlet);
    expect(MODEL_BISNIS.has('Outlet')).toBe(false);
  });

  test.each([
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'update',
    'updateMany',
    'updateManyAndReturn',
    'delete',
    'deleteMany',
    'count',
    'aggregate',
    'groupBy',
  ])('%s menambah where.outlet_id dan menimpa nilai pemanggil', (op) => {
    expect(sisipkanOutlet('Menu', op, { where: { id: 'x', outlet_id: LAIN } }, OUTLET)).toEqual({
      where: { id: 'x', outlet_id: OUTLET },
    });
    expect(sisipkanOutlet('Menu', op, undefined, OUTLET)).toEqual({ where: { outlet_id: OUTLET } });
  });

  test('create menambah data.outlet_id dan menimpa nilai pemanggil', () => {
    expect(
      sisipkanOutlet('BahanBaku', 'create', { data: { nama: 'Gula', outlet_id: LAIN } }, OUTLET),
    ).toEqual({ data: { nama: 'Gula', outlet_id: OUTLET } });
  });

  test.each(['createMany', 'createManyAndReturn'])(
    '%s menambah outlet_id ke setiap baris',
    (op) => {
      expect(sisipkanOutlet('StokMutasi', op, { data: [{ a: 1 }, { a: 2 }] }, OUTLET)).toEqual({
        data: [
          { a: 1, outlet_id: OUTLET },
          { a: 2, outlet_id: OUTLET },
        ],
      });
    },
  );

  test.each(['findUnique', 'findUniqueOrThrow', 'upsert'])('%s ditolak pada model bisnis', (op) => {
    expect(() => sisipkanOutlet('Transaksi', op, { where: { id: 'x' } }, OUTLET)).toThrow();
  });

  test('model non-bisnis (Outlet) tidak diubah', () => {
    const args = { where: { id: OUTLET } };
    expect(sisipkanOutlet('Outlet', 'findUnique', args, OUTLET)).toBe(args);
  });
});

describe('withTx: retry', () => {
  const galat = (code: string, meta?: Record<string, unknown>) =>
    new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test', meta });

  test('P2034 dan 40001/40P01 diulang; error lain tidak', () => {
    expect(bolehUlang(galat('P2034'))).toBe(true);
    expect(bolehUlang(galat('P2010', { code: '40001' }))).toBe(true);
    expect(bolehUlang(galat('P2010', { code: '40P01' }))).toBe(true);
    expect(bolehUlang(galat('P2002'))).toBe(false);
    expect(bolehUlang(new Error('x'))).toBe(false);
  });
});
