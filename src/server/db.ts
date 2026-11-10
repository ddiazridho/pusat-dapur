import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Akses DB server (docs/architecture/struktur-kode.md → Prisma, `forOutlet()`).
 * - `db`: PrismaClient mentah. Hanya untuk `server/db.ts`, `domain/demo`, dan cron.
 * - `forOutlet(db, outletId)`: client yang memaksa `outlet_id` pada semua model bisnis.
 * - `withTx(ctx, fn)`: satu-satunya cara membuka transaksi. Di dalam `fn` dilarang memakai
 *   `db` global atau memanggil fungsi yang membuka transaksi lagi (`connection_limit=1`).
 * `$queryRaw`/`$executeRaw` tidak di-scope: query raw wajib memfilter `outlet_id` sendiri.
 */

const globalUntukPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalUntukPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalUntukPrisma.prisma = db;

/** Semua model yang punya kolom `outlet_id` (data-model.md). `Outlet` sendiri tidak. */
export const MODEL_BISNIS: ReadonlySet<string> = new Set<Prisma.ModelName>([
  'User',
  'BahanBaku',
  'RiwayatHargaBeli',
  'Menu',
  'ResepDetail',
  'Transaksi',
  'DetailTransaksi',
  'StokMutasi',
  'RestockLog',
  'StokOpname',
  'StokOpnameDetail',
  'StokAlert',
  'TransaksiGagal',
]);

type Args = Record<string, unknown>;

/**
 * Menyisipkan `outlet_id` ke argumen operasi Prisma. `outlet_id` dari pemanggil selalu
 * ditimpa nilai sesi. Create memakai input unchecked (`outlet_id` skalar, bukan `connect`).
 */
export function sisipkanOutlet(
  model: string,
  operation: string,
  args: Args | undefined,
  outletId: string,
): Args | undefined {
  if (!MODEL_BISNIS.has(model)) return args;
  if (operation === 'findUnique' || operation === 'findUniqueOrThrow')
    throw new Error(`${model}.${operation}: gunakan findFirst dengan outlet scope`);
  if (operation === 'upsert') throw new Error(`${model}.upsert tidak dipakai pada model bisnis`);

  const hasil: Args = { ...args };
  if (operation === 'create') {
    hasil.data = { ...(hasil.data as Args), outlet_id: outletId };
  } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
    const data = hasil.data as Args | Args[];
    hasil.data = Array.isArray(data)
      ? data.map((baris) => ({ ...baris, outlet_id: outletId }))
      : { ...data, outlet_id: outletId };
  } else {
    // find*, update*, delete*, count, aggregate, groupBy
    hasil.where = { ...(hasil.where as Args | undefined), outlet_id: outletId };
    // update*: baris tidak boleh dipindah ke outlet lain lewat data.outlet_id.
    if (operation.startsWith('update') && hasil.data !== undefined)
      hasil.data = { ...(hasil.data as Args), outlet_id: outletId };
  }
  return hasil;
}

export function forOutlet(client: PrismaClient, outletId: string) {
  return client.$extends({
    name: 'forOutlet',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          return query(sisipkanOutlet(model, operation, args as Args, outletId) as typeof args);
        },
      },
    },
  });
}

export type OutletDb = ReturnType<typeof forOutlet>;
/** Client di dalam `withTx`: sudah ber-outlet. */
export type OutletTx = Parameters<Parameters<OutletDb['$transaction']>[0]>[0];

export type OpsiTx = { timeout?: number; maxWait?: number };

const MAKS_PERCOBAAN = 3;

/** Serialisasi/deadlock (alur-domain.md → Retry): Prisma P2034, atau 40001/40P01 dari query raw. */
export function bolehUlang(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code === 'P2034') return true;
  const kode = (err.meta as { code?: unknown } | undefined)?.code;
  return kode === '40001' || kode === '40P01';
}

/**
 * `forOutlet(db, ctx.outletId).$transaction(fn)` ReadCommitted, timeout 10 s, maxWait 5 s,
 * diulang maks 3× untuk error serialisasi/deadlock. Retry khusus domain (bentrok
 * `nomor_struk`) ada di pembungkus domain masing-masing.
 */
export async function withTx<T>(
  ctx: { outletId: string },
  fn: (tx: OutletTx) => Promise<T>,
  opsi: OpsiTx = {},
): Promise<T> {
  const client = forOutlet(db, ctx.outletId);
  for (let percobaan = 1; ; percobaan++) {
    try {
      return await client.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: opsi.timeout ?? 10_000,
        maxWait: opsi.maxWait ?? 5_000,
      });
    } catch (err) {
      if (percobaan >= MAKS_PERCOBAAN || !bolehUlang(err)) throw err;
    }
  }
}
