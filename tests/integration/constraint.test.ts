import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, test } from 'vitest';
import {
  buatOutlet,
  buatTransaksi,
  dalamRollback,
  harusGagal,
  prisma,
  type Fixture,
  type Tx,
} from './helpers';

afterAll(() => prisma.$disconnect());

let f: Fixture;
const siapkan = async (tx: Tx) => {
  f = await buatOutlet(tx);
};

describe('NFR-05 constraint integritas', () => {
  test('NFR-05 stok negatif ditolak (CHECK stok_saat_ini >= 0)', async () => {
    const pesan = await harusGagal(siapkan, (tx) =>
      tx.bahanBaku.update({ where: { id: f.bahanId }, data: { stok_saat_ini: '-0.001' } }),
    );
    expect(pesan).toContain('bahan_baku_stok_check');
  });

  test('NFR-05 stok melebihi MAKS_STOK ditolak', async () => {
    const pesan = await harusGagal(
      siapkan,
      (tx) =>
        tx.$executeRaw`UPDATE bahan_baku SET stok_saat_ini = 1000000000 WHERE id = ${f.bahanId}::uuid`,
    );
    expect(pesan).toMatch(/bahan_baku_stok_check|overflow/);
  });

  test('ADR-07 composite FK lintas outlet ditolak (resep_detail ke bahan outlet lain)', async () => {
    let lain: Fixture;
    const pesan = await harusGagal(
      async (tx) => {
        await siapkan(tx);
        lain = await buatOutlet(tx);
      },
      (tx) =>
        tx.resepDetail.create({
          data: {
            outlet_id: f.outletId,
            menu_id: f.menuId,
            bahan_baku_id: lain.bahanId,
            takaran: '1',
          },
        }),
    );
    expect(pesan).toContain('resep_detail_bahan_baku_id_outlet_id_fkey');
  });

  test('ADR-07 composite FK lintas outlet ditolak (transaksi oleh kasir outlet lain)', async () => {
    let lain: Fixture;
    const pesan = await harusGagal(
      async (tx) => {
        await siapkan(tx);
        lain = await buatOutlet(tx);
      },
      (tx) => buatTransaksi(tx, { ...f, kasirId: lain.kasirId }),
    );
    expect(pesan).toMatch(/transaksi_(user_id|dibuat_oleh)_outlet_id_fkey/);
  });

  test('NFR-05 stok_mutasi tidak bisa di-update/delete (append-only)', async () => {
    const tambahMutasi = async (tx: Tx) => {
      await siapkan(tx);
      await tx.stokMutasi.create({
        data: {
          outlet_id: f.outletId,
          bahan_baku_id: f.bahanId,
          jenis: 'stok_awal',
          jumlah: '100',
          user_id: f.pemilikId,
        },
      });
    };
    expect(
      await harusGagal(tambahMutasi, (tx) =>
        tx.stokMutasi.updateMany({ where: { bahan_baku_id: f.bahanId }, data: { jumlah: '5' } }),
      ),
    ).toContain('append-only');
    expect(
      await harusGagal(tambahMutasi, (tx) =>
        tx.stokMutasi.deleteMany({ where: { bahan_baku_id: f.bahanId } }),
      ),
    ).toContain('append-only');
  });

  test('NFR-05 riwayat_harga_beli dan detail_transaksi append-only', async () => {
    expect(
      await harusGagal(
        async (tx) => {
          await siapkan(tx);
          await tx.riwayatHargaBeli.create({
            data: {
              outlet_id: f.outletId,
              bahan_baku_id: f.bahanId,
              harga_baru: '16',
              sumber: 'awal',
              user_id: f.pemilikId,
            },
          });
        },
        (tx) => tx.riwayatHargaBeli.deleteMany({ where: { bahan_baku_id: f.bahanId } }),
      ),
    ).toContain('append-only');

    expect(
      await harusGagal(
        async (tx) => {
          await siapkan(tx);
          const id = await buatTransaksi(tx, f);
          await tx.detailTransaksi.create({
            data: {
              outlet_id: f.outletId,
              transaksi_id: id,
              menu_id: f.menuId,
              nama_menu: 'Es Teh Manis',
              harga_jual: 5000,
              hpp_snapshot: '320',
              qty: 1,
              subtotal: 5000,
            },
          });
        },
        (tx) =>
          tx.detailTransaksi.updateMany({ where: { menu_id: f.menuId }, data: { nama_menu: 'X' } }),
      ),
    ).toContain('append-only');
  });

  test('NFR-05 akun-demo: reset demo boleh menghapus mutasi outlet is_demo saja', async () => {
    await dalamRollback(async (tx) => {
      const demo = await buatOutlet(tx, { isDemo: true });
      await tx.stokMutasi.create({
        data: {
          outlet_id: demo.outletId,
          bahan_baku_id: demo.bahanId,
          jenis: 'stok_awal',
          jumlah: '1',
          user_id: demo.pemilikId,
        },
      });
      await tx.$executeRaw`SET LOCAL app.reset_demo = 'on'`;
      expect(await tx.stokMutasi.deleteMany({ where: { outlet_id: demo.outletId } })).toEqual({
        count: 1,
      });
    });
    const pesan = await harusGagal(
      async (tx) => {
        await siapkan(tx);
        await tx.stokMutasi.create({
          data: {
            outlet_id: f.outletId,
            bahan_baku_id: f.bahanId,
            jenis: 'stok_awal',
            jumlah: '1',
            user_id: f.pemilikId,
          },
        });
        await tx.$executeRaw`SET LOCAL app.reset_demo = 'on'`;
      },
      (tx) => tx.stokMutasi.deleteMany({ where: { outlet_id: f.outletId } }),
    );
    expect(pesan).toContain('append-only');
  });

  test('NFR-05 transaksi immutable: kolom selain pembatalan ditolak', async () => {
    let id = '';
    const pesan = await harusGagal(
      async (tx) => {
        await siapkan(tx);
        id = await buatTransaksi(tx, f);
      },
      (tx) => tx.transaksi.update({ where: { id }, data: { total: 1 } }),
    );
    expect(pesan).toContain('transaksi immutable');
  });

  test('NFR-05 transaksi: pembatalan selesai → dibatalkan diterima, tidak bisa kembali', async () => {
    await dalamRollback(async (tx) => {
      f = await buatOutlet(tx);
      const id = await buatTransaksi(tx, f);
      const batal = await tx.transaksi.update({
        where: { id },
        data: {
          status: 'dibatalkan',
          dibatalkan_at: new Date(),
          dibatalkan_oleh: f.pemilikId,
          alasan_batal: 'salah_input',
        },
      });
      expect(batal.status).toBe('dibatalkan');
    });
    let id = '';
    const pesan = await harusGagal(
      async (tx) => {
        await siapkan(tx);
        id = await buatTransaksi(tx, f);
        await tx.transaksi.update({
          where: { id },
          data: { status: 'dibatalkan', dibatalkan_at: new Date(), alasan_batal: 'salah_input' },
        });
      },
      (tx) =>
        tx.transaksi.update({ where: { id }, data: { status: 'selesai', dibatalkan_at: null } }),
    );
    expect(pesan).toContain('selesai -> dibatalkan');
  });

  test('NFR-05 alert tidak ganda: partial unique (bahan, jenis) WHERE sudah_dibaca = false', async () => {
    const alert = (tx: Tx) =>
      tx.stokAlert.create({
        data: { outlet_id: f.outletId, bahan_baku_id: f.bahanId, jenis: 'stok_menipis' },
      });
    expect(
      await harusGagal(async (tx) => {
        await siapkan(tx);
        await alert(tx);
      }, alert),
    ).toContain('"target":["bahan_baku_id","jenis"]');

    await dalamRollback(async (tx) => {
      f = await buatOutlet(tx);
      const a = await alert(tx);
      await tx.stokAlert.update({
        where: { id: a.id },
        data: { sudah_dibaca: true, dibaca_at: new Date() },
      });
      await alert(tx); // alert lama sudah dibaca → boleh alert baru
    });
  });

  test('NFR-05 nama bahan unik case-insensitive di antara bahan aktif', async () => {
    const bahan = (tx: Tx, nama: string) =>
      tx.bahanBaku.create({
        data: {
          outlet_id: f.outletId,
          nama,
          satuan: 'gram',
          stok_saat_ini: '0',
          threshold_min: '0',
          harga_beli_per_satuan: '0',
        },
      });
    expect(await harusGagal(siapkan, (tx) => bahan(tx, 'GULA PASIR'))).toContain(
      '"modelName":"BahanBaku","target":["outlet_id","lower(nama)"]',
    );
    await dalamRollback(async (tx) => {
      f = await buatOutlet(tx);
      await tx.bahanBaku.update({ where: { id: f.bahanId }, data: { diarsipkan_at: new Date() } });
      await bahan(tx, 'gula pasir');
    });
  });

  test('NFR-05 nama menu dan username unik case-insensitive', async () => {
    expect(
      await harusGagal(siapkan, (tx) =>
        tx.menu.create({ data: { outlet_id: f.outletId, nama: 'es teh manis', harga_jual: 1 } }),
      ),
    ).toContain('"modelName":"Menu","target":["outlet_id","lower(nama)"]');

    const kasirLain = randomUUID();
    expect(
      await harusGagal(
        async (tx) => {
          await siapkan(tx);
          await tx.$executeRaw`INSERT INTO auth.users (id, email) VALUES (${kasirLain}::uuid, ${`${kasirLain}@uji.invalid`})`;
        },
        async (tx) => {
          const ada = await tx.user.findFirstOrThrow({ where: { id: f.kasirId } });
          await tx.user.create({
            data: {
              id: kasirLain,
              outlet_id: f.outletId,
              peran: 'kasir',
              nama: 'K',
              username: ada.username!.toUpperCase(),
            },
          });
        },
      ),
    ).toContain('lower(username)');
  });

  test('NFR-05 idempotensi: client_tx_id unik per outlet', async () => {
    const pesan = await harusGagal(siapkan, async (tx) => {
      const id = await buatTransaksi(tx, f);
      const t = await tx.transaksi.findFirstOrThrow({ where: { id } });
      await tx.transaksi.create({
        data: {
          ...t,
          id: randomUUID(),
          nomor_struk: '261110-ABCDEF-999',
          token_struk: 'b'.repeat(22),
        },
      });
    });
    expect(pesan).toMatch(/client_tx_id/);
  });

  test('NFR-05 CHECK tanda mutasi per jenis, satu pemilik per outlet, username hanya kasir', async () => {
    expect(
      await harusGagal(siapkan, (tx) =>
        tx.stokMutasi.create({
          data: {
            outlet_id: f.outletId,
            bahan_baku_id: f.bahanId,
            jenis: 'penjualan',
            jumlah: '5',
            ref_id: randomUUID(),
            user_id: f.kasirId,
          },
        }),
      ),
    ).toContain('stok_mutasi_tanda_check');

    const id = randomUUID();
    const pemilikKedua = async (tx: Tx) => {
      await siapkan(tx);
      await tx.$executeRaw`INSERT INTO auth.users (id, email) VALUES (${id}::uuid, ${`${id}@uji.invalid`})`;
    };
    expect(
      await harusGagal(pemilikKedua, (tx) =>
        tx.user.create({ data: { id, outlet_id: f.outletId, peran: 'pemilik', nama: 'P2' } }),
      ),
    ).toContain('"modelName":"User","target":["outlet_id"]');
    expect(
      await harusGagal(pemilikKedua, (tx) =>
        tx.user.create({ data: { id, outlet_id: f.outletId, peran: 'kasir', nama: 'K2' } }),
      ),
    ).toContain('users_username_kasir_check');
  });

  test('ADR-07 outlet_id tidak bisa diubah selama punya baris anak (ON UPDATE RESTRICT)', async () => {
    let lain: Fixture;
    const pesan = await harusGagal(
      async (tx) => {
        await siapkan(tx);
        lain = await buatOutlet(tx);
        await tx.resepDetail.create({
          data: {
            outlet_id: f.outletId,
            menu_id: f.menuId,
            bahan_baku_id: f.bahanId,
            takaran: '1',
          },
        });
      },
      (tx) =>
        tx.$executeRaw`UPDATE menus SET outlet_id = ${lain.outletId}::uuid, nama = 'Pindah' WHERE id = ${f.menuId}::uuid`,
    );
    expect(pesan).toContain('resep_detail_menu_id_outlet_id_fkey');
  });

  test('NFR-01 users.id wajib ada di auth.users', async () => {
    const pesan = await harusGagal(siapkan, (tx) =>
      tx.user.create({
        data: {
          id: randomUUID(),
          outlet_id: f.outletId,
          peran: 'kasir',
          nama: 'X',
          username: 'tanpa_auth',
        },
      }),
    );
    expect(pesan).toContain('users_id_auth_fkey');
  });

  test('NFR-01 trg_updated_at mengisi updated_at saat UPDATE', async () => {
    await dalamRollback(async (tx) => {
      f = await buatOutlet(tx);
      await tx.$executeRaw`UPDATE menus SET updated_at = '2000-01-01' WHERE id = ${f.menuId}::uuid`;
      const m = await tx.menu.findFirstOrThrow({ where: { id: f.menuId } });
      expect(m.updated_at.getUTCFullYear()).toBeGreaterThan(2000);
    });
  });
});
