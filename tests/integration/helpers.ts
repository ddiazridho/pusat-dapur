import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

// Postgres Supabase CLI lokal (CI: sama). Tidak pernah DB remote.
export const URL_LOKAL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
export const prisma = new PrismaClient({ datasourceUrl: URL_LOKAL });

export type Tx = Prisma.TransactionClient;
const ROLLBACK = Symbol('rollback');

/** Menjalankan `fn` dalam transaksi yang selalu di-rollback: DB tetap bersih per tes. */
export async function dalamRollback(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        await fn(tx);
        throw ROLLBACK;
      },
      { timeout: 20_000 },
    );
  } catch (err) {
    if (err !== ROLLBACK) throw err;
  }
}

/** Statement yang diharapkan gagal; transaksi di-rollback, mengembalikan pesan error. */
export async function harusGagal(
  siapkan: (tx: Tx) => Promise<void>,
  aksi: (tx: Tx) => Promise<unknown>,
): Promise<string> {
  let siap = false;
  try {
    await prisma.$transaction(
      async (tx) => {
        await siapkan(tx);
        siap = true;
        await aksi(tx);
      },
      { timeout: 20_000 },
    );
  } catch (err) {
    if (!siap) throw err;
    // P2002 menaruh nama index/kolom di `meta`, bukan di pesan.
    const meta = (err as { meta?: unknown }).meta;
    return `${err instanceof Error ? err.message : String(err)} ${JSON.stringify(meta ?? {})}`;
  }
  throw new Error('aksi seharusnya ditolak database');
}

export type Fixture = {
  outletId: string;
  pemilikId: string;
  kasirId: string;
  bahanId: string;
  menuId: string;
};

/** Outlet + pemilik + kasir (auth.users juga) + 1 bahan + 1 menu. */
export async function buatOutlet(tx: Tx, opsi: { isDemo?: boolean } = {}): Promise<Fixture> {
  const f: Fixture = {
    outletId: randomUUID(),
    pemilikId: randomUUID(),
    kasirId: randomUUID(),
    bahanId: randomUUID(),
    menuId: randomUUID(),
  };
  const kasir = `kasir_${f.kasirId.slice(0, 8)}`;
  await tx.$executeRaw`INSERT INTO auth.users (id, email) VALUES
    (${f.pemilikId}::uuid, ${`p-${f.pemilikId}@uji.invalid`}),
    (${f.kasirId}::uuid, ${`${kasir}@kasir.pusatdapur.invalid`})`;
  await tx.outlet.create({
    data: { id: f.outletId, nama_outlet: 'Outlet Uji', is_demo: opsi.isDemo ?? false },
  });
  await tx.user.createMany({
    data: [
      { id: f.pemilikId, outlet_id: f.outletId, peran: 'pemilik', nama: 'Pemilik' },
      { id: f.kasirId, outlet_id: f.outletId, peran: 'kasir', nama: 'Kasir', username: kasir },
    ],
  });
  await tx.bahanBaku.create({
    data: {
      id: f.bahanId,
      outlet_id: f.outletId,
      nama: 'Gula pasir',
      satuan: 'gram',
      stok_saat_ini: '100',
      threshold_min: '10',
      harga_beli_per_satuan: '16',
    },
  });
  await tx.menu.create({
    data: { id: f.menuId, outlet_id: f.outletId, nama: 'Es Teh Manis', harga_jual: 5000 },
  });
  return f;
}

export async function buatTransaksi(tx: Tx, f: Fixture, id = randomUUID()) {
  await tx.transaksi.create({
    data: {
      id,
      outlet_id: f.outletId,
      client_tx_id: randomUUID(),
      device_id: randomUUID(),
      nomor_struk: `261110-ABCDEF-${String(Math.floor(Math.random() * 1e6)).padStart(3, '0')}`,
      token_struk: randomUUID().replace(/-/g, '').slice(0, 22),
      user_id: f.kasirId,
      dibuat_oleh: f.kasirId,
      waktu_transaksi: new Date(),
      dibuat_offline: false,
      tipe_pesanan: 'dine_in',
      metode_bayar: 'qris',
      total: 5000,
    },
  });
  return id;
}
