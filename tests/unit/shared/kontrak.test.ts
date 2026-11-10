import { describe, expect, test } from 'vitest';
import { aksesRoute, bolehAkses } from '@/shared/akses';
import { DOMAIN_EMAIL_KASIR, emailLogin } from '@/shared/akun';
import { RATE_LIMIT } from '@/shared/konstanta';
import { detailDariZod, KODE_ERROR, kodeDariZod, statusKode } from '@/shared/kode-error';
import * as s from '@/shared/schemas';
import { cariTemplate, cocokkanBahan, TEMPLATE_RESEP } from '@/shared/templates/resep';
import { bahan, bahanKasir, menu, snapshot } from '@/client/fixtures';

const UUID = '3fa9c2d1-0b4e-4c8a-9f21-6a7d5e0c1b2a';
const UUID2 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function gagal(schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }, v: unknown) {
  const r = schema.safeParse(v) as { success: boolean; error?: import('zod').ZodError };
  expect(r.success).toBe(false);
  return { detail: detailDariZod(r.error!), kode: kodeDariZod(r.error!) };
}

const transaksiValid = {
  client_tx_id: UUID2,
  device_id: UUID,
  dibuat_oleh: UUID,
  nomor_struk: '261110-3FA9C2-014',
  waktu_transaksi: '2026-11-10T05:45:00.000Z',
  dibuat_offline: false,
  tipe_pesanan: 'dine_in',
  metode_bayar: 'tunai',
  uang_diterima: 50_000,
  items: [{ menu_id: UUID, qty: 2, harga_jual: 15_000 }],
};

describe('NFR-01 skema .strict() tanpa outlet_id (api.md)', () => {
  test('NFR-01 outlet_id di body ditolak 422 VALIDASI_GAGAL dengan detail per field', () => {
    const { detail, kode } = gagal(s.buatBahanSchema, {
      nama: 'Telur ayam',
      satuan: 'buah',
      stok_saat_ini: '10',
      threshold_min: '10',
      harga_beli_per_satuan: '2000',
      outlet_id: UUID,
    });
    expect(kode).toBe('VALIDASI_GAGAL');
    expect(detail).toEqual({ outlet_id: 'Field tidak dikenal' });
  });

  test('NFR-01 semua skema objek menolak kunci tak dikenal', () => {
    // Semua skema payload/query endpoint api.md.
    const endpoint = {
      daftarSchema: s.daftarSchema, gantiPasswordSchema: s.gantiPasswordSchema, bodyKosongSchema: s.bodyKosongSchema,
      buatKasirSchema: s.buatKasirSchema, ubahKasirSchema: s.ubahKasirSchema, ubahPengaturanSchema: s.ubahPengaturanSchema,
      buatBahanSchema: s.buatBahanSchema, ubahBahanSchema: s.ubahBahanSchema, daftarBahanQuery: s.daftarBahanQuery,
      daftarMutasiQuery: s.daftarMutasiQuery, idParam: s.idParam, buatMenuSchema: s.buatMenuSchema,
      ubahMenuSchema: s.ubahMenuSchema, daftarMenuQuery: s.daftarMenuQuery, konfirmasiFotoSchema: s.konfirmasiFotoSchema,
      simpanResepSchema: s.simpanResepSchema, terapkanTemplateSchema: s.terapkanTemplateSchema, kodeTemplateParam: s.kodeTemplateParam,
      simpanRestockSchema: s.simpanRestockSchema, pratinjauRestockQuery: s.pratinjauRestockQuery, daftarRestockQuery: s.daftarRestockQuery,
      simpanOpnameSchema: s.simpanOpnameSchema, daftarOpnameQuery: s.daftarOpnameQuery, transaksiSchema: s.transaksiSchema,
      daftarTransaksiQuery: s.daftarTransaksiQuery, clientTxIdParam: s.clientTxIdParam, batalTransaksiSchema: s.batalTransaksiSchema,
      laporGagalSchema: s.laporGagalSchema, daftarGagalQuery: s.daftarGagalQuery, tandaiGagalSchema: s.tandaiGagalSchema,
      logClientSchema: s.logClientSchema, daftarAlertQuery: s.daftarAlertQuery, tandaiAlertSchema: s.tandaiAlertSchema,
      laporanQuery: s.laporanQuery,
    };
    for (const [nama, schema] of Object.entries(endpoint)) {
      const r = (schema as import('zod').ZodType).safeParse({ outlet_id: UUID });
      expect(r.success, nama).toBe(false);
      expect(detailDariZod(r.error!), nama).toHaveProperty('outlet_id');
    }
  });
});

describe('batas nilai FRD', () => {
  test('US-03 bahan-baku.md: stok awal ≤ 100.000.000, maks 3 desimal, harga ≤ 10 jt 2 desimal; PATCH hanya 3 field', () => {
    const dasar = { nama: '  Telur ayam ', satuan: 'buah', stok_saat_ini: '100000000', threshold_min: '0', harga_beli_per_satuan: '10000000' };
    expect(s.buatBahanSchema.parse(dasar).nama).toBe('Telur ayam');
    expect(gagal(s.buatBahanSchema, { ...dasar, stok_saat_ini: '100000000.001' }).detail).toHaveProperty('stok_saat_ini');
    expect(gagal(s.buatBahanSchema, { ...dasar, stok_saat_ini: '1.0001' }).detail.stok_saat_ini).toBe('Maksimal 3 angka di belakang koma');
    expect(gagal(s.buatBahanSchema, { ...dasar, harga_beli_per_satuan: '10000000.01' }).detail).toHaveProperty('harga_beli_per_satuan');
    expect(gagal(s.buatBahanSchema, { ...dasar, harga_beli_per_satuan: '14.505' }).detail).toHaveProperty('harga_beli_per_satuan');
    expect(gagal(s.buatBahanSchema, { ...dasar, nama: '   ' }).detail.nama).toBe('Nama bahan wajib diisi');
    expect(gagal(s.buatBahanSchema, { ...dasar, nama: 'x'.repeat(101) }).detail).toHaveProperty('nama');
    expect(gagal(s.buatBahanSchema, { ...dasar, satuan: 'kg' }).detail).toHaveProperty('satuan');
    expect(gagal(s.ubahBahanSchema, { satuan: 'gram' }).detail).toHaveProperty('satuan');
    expect(gagal(s.ubahBahanSchema, { stok_saat_ini: '5' }).detail).toHaveProperty('stok_saat_ini');
    expect(s.ubahBahanSchema.parse({ threshold_min: '999999999.999' })).toEqual({ threshold_min: '999999999.999' });
  });

  test('US-04 menu.md & resep.md: harga 1–10 jt integer, takaran > 0 ≤ 100.000, 0–30 item, duplikat → BAHAN_DUPLIKAT', () => {
    expect(gagal(s.buatMenuSchema, { nama: 'Nasi Goreng', harga_jual: 0 }).detail).toHaveProperty('harga_jual');
    expect(gagal(s.buatMenuSchema, { nama: 'Nasi Goreng', harga_jual: 10_000_001 }).detail).toHaveProperty('harga_jual');
    expect(gagal(s.buatMenuSchema, { nama: 'Nasi Goreng', harga_jual: 1500.5 }).detail).toHaveProperty('harga_jual');
    expect(s.simpanResepSchema.parse({ items: [] })).toEqual({ items: [] });
    expect(gagal(s.simpanResepSchema, { items: [{ bahan_baku_id: UUID, takaran: '0' }] }).detail).toHaveProperty(['items.0.takaran']);
    expect(gagal(s.simpanResepSchema, { items: [{ bahan_baku_id: UUID, takaran: '100000.001' }] }).detail).toHaveProperty(['items.0.takaran']);
    const dup = gagal(s.simpanResepSchema, {
      items: [
        { bahan_baku_id: UUID, takaran: '1' },
        { bahan_baku_id: UUID, takaran: '2' },
      ],
    });
    expect(dup.kode).toBe('BAHAN_DUPLIKAT');
    expect(statusKode(dup.kode)).toBe(422);
    const items31 = Array.from({ length: 31 }, (_, i) => ({ bahan_baku_id: `3fa9c2d1-0b4e-4c8a-9f21-${String(i).padStart(12, '0')}`, takaran: '1' }));
    expect(gagal(s.simpanResepSchema, { items: items31 }).detail).toHaveProperty('items');
    expect(gagal(s.ubahMenuSchema, { hpp_cached: '1' }).detail).toHaveProperty('hpp_cached');
  });

  test('US-04 resep.md terapkan template: 1–30 item, bahan lama atau bahan baru', () => {
    expect(
      s.terapkanTemplateSchema.parse({
        harga_jual: 15_000,
        items: [
          { bahan_baku_id: UUID, takaran: '200' },
          { nama_bahan_baru: 'Kecap manis', satuan: 'ml', takaran: '15' },
        ],
      }).items,
    ).toHaveLength(2);
    expect(gagal(s.terapkanTemplateSchema, { harga_jual: 15_000, items: [] }).detail).toHaveProperty('items');
    expect(
      gagal(s.terapkanTemplateSchema, {
        harga_jual: 15_000,
        items: [
          { nama_bahan_baru: 'Garam', satuan: 'gram', takaran: '1' },
          { nama_bahan_baru: 'garam', satuan: 'gram', takaran: '2' },
        ],
      }).kode,
    ).toBe('BAHAN_DUPLIKAT');
  });

  test('US-09 restock.md: jumlah > 0 ≤ 100.000 maks 3 desimal, total 0–100 jt; query di-coerce', () => {
    const p = { bahan_baku_id: UUID, jumlah_input: '5', satuan_input: 'kg', total_harga: 60_000 };
    expect(s.simpanRestockSchema.parse(p)).toEqual(p);
    expect(gagal(s.simpanRestockSchema, { ...p, jumlah_input: '0' }).detail).toHaveProperty('jumlah_input');
    expect(gagal(s.simpanRestockSchema, { ...p, jumlah_input: '100000.001' }).detail).toHaveProperty('jumlah_input');
    expect(gagal(s.simpanRestockSchema, { ...p, total_harga: 100_000_001 }).detail).toHaveProperty('total_harga');
    expect(s.pratinjauRestockQuery.parse({ ...p, total_harga: '60000' }).total_harga).toBe(60_000);
    expect(s.daftarRestockQuery.parse({}).limit).toBe(50);
    expect(gagal(s.daftarRestockQuery, { limit: '101' }).detail).toHaveProperty('limit');
  });

  test('US-05 pos.md: transaksi valid; qty 1–99; 1–50 item; menu unik; tunai wajib uang, qris null; nama_menu offline', () => {
    expect(s.transaksiSchema.parse(transaksiValid).items).toHaveLength(1);
    expect(gagal(s.transaksiSchema, { ...transaksiValid, items: [{ menu_id: UUID, qty: 100, harga_jual: 1 }] }).detail).toHaveProperty(['items.0.qty']);
    expect(gagal(s.transaksiSchema, { ...transaksiValid, items: [] }).detail).toHaveProperty('items');
    expect(
      gagal(s.transaksiSchema, {
        ...transaksiValid,
        items: Array.from({ length: 51 }, () => ({ menu_id: UUID, qty: 1, harga_jual: 1 })),
      }).detail,
    ).toHaveProperty('items');
    expect(
      gagal(s.transaksiSchema, { ...transaksiValid, items: [transaksiValid.items[0], transaksiValid.items[0]] }).detail,
    ).toHaveProperty(['items.1.menu_id']);
    expect(gagal(s.transaksiSchema, { ...transaksiValid, uang_diterima: null }).detail).toHaveProperty('uang_diterima');
    expect(gagal(s.transaksiSchema, { ...transaksiValid, metode_bayar: 'qris' }).detail).toHaveProperty('uang_diterima');
    expect(s.transaksiSchema.safeParse({ ...transaksiValid, metode_bayar: 'qris', uang_diterima: null }).success).toBe(true);
    expect(gagal(s.transaksiSchema, { ...transaksiValid, uang_diterima: 1_000_000_000_001 }).detail).toHaveProperty('uang_diterima');
    expect(gagal(s.transaksiSchema, { ...transaksiValid, dibuat_offline: true }).detail).toHaveProperty(['items.0.nama_menu']);
    expect(gagal(s.transaksiSchema, { ...transaksiValid, nomor_struk: '261110-3FA9C2-014-2' }).detail).toHaveProperty('nomor_struk');
    expect(gagal(s.transaksiSchema, { ...transaksiValid, total: 42_000 }).detail).toHaveProperty('total');
    // UUID v1 bukan v4
    expect(gagal(s.transaksiSchema, { ...transaksiValid, client_tx_id: 'a0eebc99-9c0b-11ee-b9d1-0242ac120002' }).detail).toHaveProperty('client_tx_id');
  });

  test('BR-12 pembatalan-transaksi.md: catatan wajib ≥ 5 karakter jika lainnya, maks 200', () => {
    expect(s.batalTransaksiSchema.safeParse({ alasan_batal: 'salah_input' }).success).toBe(true);
    expect(gagal(s.batalTransaksiSchema, { alasan_batal: 'lainnya', catatan_batal: ' abc ' }).detail).toHaveProperty('catatan_batal');
    expect(s.batalTransaksiSchema.safeParse({ alasan_batal: 'lainnya', catatan_batal: 'tamu pergi' }).success).toBe(true);
    expect(gagal(s.batalTransaksiSchema, { alasan_batal: 'salah_input', catatan_batal: 'x'.repeat(201) }).detail).toHaveProperty('catatan_batal');
  });

  test('US-13 stok-opname.md: 1–200 item unik, stok_fisik ≥ 0 ≤ MAKS_STOK, catatan ≤ 200', () => {
    const item = { bahan_baku_id: UUID, stok_fisik: '0' };
    expect(s.simpanOpnameSchema.safeParse({ items: [item] }).success).toBe(true);
    expect(gagal(s.simpanOpnameSchema, { items: [] }).detail).toHaveProperty('items');
    expect(gagal(s.simpanOpnameSchema, { items: [item, item] }).detail).toHaveProperty('items');
    expect(gagal(s.simpanOpnameSchema, { items: [{ ...item, stok_fisik: '1000000000' }] }).detail).toHaveProperty(['items.0.stok_fisik']);
    expect(gagal(s.simpanOpnameSchema, { items: [{ ...item, stok_fisik: '-1' }] }).detail).toHaveProperty(['items.0.stok_fisik']);
  });

  test('US-01 US-02 auth.md & akun-kasir.md: password 8–72, ganti ≠ lama, username regex 3–30', () => {
    expect(gagal(s.daftarSchema, { email: 'a@b.co', password: '1234567', nama: 'Sari', nama_outlet: 'W' }).detail).toHaveProperty('password');
    expect(gagal(s.daftarSchema, { email: 'bukan-email', password: '12345678', nama: 'Sari', nama_outlet: 'W' }).detail).toHaveProperty('email');
    expect(s.daftarSchema.parse({ email: ' Sari@Mail.COM ', password: '12345678', nama: 'Sari', nama_outlet: 'W' }).email).toBe('sari@mail.com');
    expect(gagal(s.gantiPasswordSchema, { password_lama: '12345678', password_baru: '12345678' }).detail).toHaveProperty('password_baru');
    expect(gagal(s.buatKasirSchema, { nama: 'Dimas', username: 'Dimas', password: '12345678' }).detail).toHaveProperty('username');
    expect(gagal(s.buatKasirSchema, { nama: 'Dimas', username: 'di', password: '12345678' }).detail).toHaveProperty('username');
    expect(s.buatKasirSchema.safeParse({ nama: 'Dimas', username: 'dimas.k_1', password: '12345678' }).success).toBe(true);
    expect(gagal(s.ubahKasirSchema, { username: 'baru' }).detail).toHaveProperty('username');
  });

  test('US-11 pengaturan-outlet.md & alert-stok.md: onboarding & sudah_dibaca hanya true; ambang 0–100', () => {
    expect(gagal(s.ubahPengaturanSchema, { onboarding_selesai: false }).detail).toHaveProperty('onboarding_selesai');
    expect(gagal(s.ubahPengaturanSchema, { ambang_margin: 101 }).detail).toHaveProperty('ambang_margin');
    expect(gagal(s.ubahPengaturanSchema, { zona_waktu: 'Asia/Singapore' }).detail).toHaveProperty('zona_waktu');
    expect(gagal(s.tandaiAlertSchema, { sudah_dibaca: false }).detail).toHaveProperty('sudah_dibaca');
    expect(s.laporanQuery.parse({})).toEqual({ periode: 'hari_ini' });
    expect(gagal(s.laporanQuery, { periode: 'bulan_ini' }).detail).toHaveProperty('periode');
  });

  test('NFR-04 log-client: url pola route tanpa parameter struk; ≤ 4 KB', () => {
    const ok = { pesan: 'TypeError', url: '/struk/[clientTxId]' };
    expect(s.logClientSchema.safeParse(ok).success).toBe(true);
    expect(s.logClientSchema.safeParse({ ...ok, url: '/kasir' }).success).toBe(true);
    expect(gagal(s.logClientSchema, { ...ok, url: '/s/q1w2e3r4t5y6u7i8o9p0aZ' }).detail).toHaveProperty('url');
    expect(gagal(s.logClientSchema, { ...ok, url: `/struk/${UUID}` }).detail).toHaveProperty('url');
    expect(gagal(s.logClientSchema, { ...ok, url: '/kasir?x=1' }).detail).toHaveProperty('url');
    expect(gagal(s.logClientSchema, { ...ok, url: 'https://evil.example/x' }).detail).toHaveProperty('url');
    expect(s.logClientSchema.safeParse({ ...ok, stack: 'é'.repeat(3000), pesan: 'x'.repeat(10) }).success).toBe(false);
  });

  test('NFR-04 batas rate limit sesuai infra-operasional.md', () => {
    expect(RATE_LIMIT).toEqual({
      transaksi: { batas: 10, jendelaDetik: 1 },
      daftar: { batas: 5, jendelaDetik: 3600 },
      struk_publik: { batas: 30, jendelaDetik: 60 },
      mutasi: { batas: 60, jendelaDetik: 60 },
    });
  });

  test('NFR-01 query: tanggal kalender valid, rentang mutasi, pencarian min 2', () => {
    expect(gagal(s.daftarTransaksiQuery, { tanggal: '2026-02-30' }).detail).toHaveProperty('tanggal');
    expect(s.daftarTransaksiQuery.parse({ dibuat_offline: 'true' }).dibuat_offline).toBe(true);
    expect(gagal(s.daftarMutasiQuery, { dari: '2026-11-10', sampai: '2026-11-01' }).detail).toHaveProperty('sampai');
    expect(gagal(s.daftarBahanQuery, { q: 'a' }).detail).toHaveProperty('q');
  });
});

describe('kode-error.ts (api.md → Kode Error)', () => {
  test('NFR-01 status per kode sesuai api.md', () => {
    expect(statusKode('VALIDASI_GAGAL')).toBe(422);
    expect(statusKode('STOK_TIDAK_CUKUP')).toBe(409);
    expect(statusKode('PASSWORD_LAMA_SALAH')).toBe(422);
    expect(statusKode('READ_ONLY')).toBe(403);
    expect(statusKode('LAYANAN_TIDAK_TERSEDIA')).toBe(503);
    expect(Object.keys(KODE_ERROR)).toHaveLength(8 + 15); // umum + spesifik api.md
    for (const [kode, { pesan }] of Object.entries(KODE_ERROR)) expect(pesan, kode).not.toBe('');
  });
});

describe('akses.ts ROUTE_ACCESS (auth.md → Matriks Akses)', () => {
  test.each([
    ['/kasir', 'kasir', true],
    ['/kasir/riwayat', 'kasir', true],
    ['/struk/abc', 'kasir', true],
    ['/bahan/123', 'kasir', true],
    ['/menu/baru', 'kasir', false],
    ['/dashboard', 'kasir', false],
    ['/pengaturan/kasir', 'kasir', false],
    ['/onboarding', 'kasir', false],
    ['/akun', 'kasir', true],
    ['/dashboard', 'pemilik', true],
    ['/api/bahan-baku', 'kasir', true],
    ['/api/bahan-baku/123/mutasi', 'kasir', false],
    ['/api/bahan-baku/123/mutasi', 'pemilik', true],
    ['/api/menu', 'kasir', false],
    ['/api/transaksi/abc/batal', 'kasir', false],
    ['/api/transaksi/abc/batal', 'pemilik', true],
    ['/api/transaksi/abc', 'kasir', true],
    ['/api/akun/password', 'kasir', true],
    ['/api/akun/password-reset-selesai', 'kasir', false],
    ['/api/sync/snapshot', 'kasir', true],
    ['/api/laporan', 'kasir', false],
    ['/api/alert?sudah_dibaca=false', 'kasir', false],
    ['/login', 'kasir', true],
  ] as const)('BR-12 %s untuk %s → %s', (path, peran, boleh) => {
    expect(bolehAkses(path, peran)).toBe(boleh);
  });

  test('BR-12 publik, cron, tidak dikenal', () => {
    expect(aksesRoute('/s/tokenxyz')).toBe('publik');
    expect(aksesRoute('/api/health')).toBe('publik');
    expect(aksesRoute('/api/demo/reset')).toBe('cron');
    expect(bolehAkses('/api/cron/cek-invarian', 'pemilik')).toBe(false);
    expect(aksesRoute('/menu-palsu')).toBeNull();
    expect(aksesRoute('/')).toBe('publik');
  });
});

describe('akun.ts', () => {
  test('US-02 identitas tanpa @ dipetakan ke email internal kasir', () => {
    expect(DOMAIN_EMAIL_KASIR).toBe('kasir.pusatdapur.invalid');
    expect(emailLogin(' Dimas ')).toBe('dimas@kasir.pusatdapur.invalid');
    expect(emailLogin('Sari@Mail.com')).toBe('sari@mail.com');
  });
});

describe('templates/resep.ts (resep.md → Daftar Template MVP)', () => {
  test('US-04 8 template, 17 bahan unik, persis FRD', () => {
    expect(TEMPLATE_RESEP.map((t) => t.kode)).toEqual([
      'nasi-goreng', 'mie-ayam', 'mie-goreng-telur', 'nasi-telur-dadar', 'es-teh-manis', 'teh-manis-panas', 'es-jeruk', 'kopi-susu',
    ]);
    const unik = new Set(TEMPLATE_RESEP.flatMap((t) => t.bahan.map((b) => `${b.nama_bahan}|${b.satuan}`)));
    expect(unik.size).toBe(17);
    expect(new Set([...unik].map((k) => k.split('|')[1]))).toEqual(new Set(['gram', 'ml', 'buah']));
    expect(cariTemplate('nasi-goreng')!.bahan.map((b) => `${b.nama_bahan} ${Number(b.takaran)} ${b.satuan}`)).toEqual([
      'Nasi putih 200 gram', 'Telur ayam 1 buah', 'Kecap manis 15 ml', 'Minyak goreng 15 ml',
      'Bawang merah 10 gram', 'Bawang putih 5 gram', 'Garam 2 gram',
    ]);
    expect(cariTemplate('kopi-susu')!.bahan.map((b) => `${b.nama_bahan} ${Number(b.takaran)} ${b.satuan}`)).toEqual([
      'Kopi bubuk 15 gram', 'Susu kental manis 30 ml', 'Gula pasir 10 gram', 'Es batu 150 gram',
    ]);
    for (const t of TEMPLATE_RESEP) {
      expect(s.terapkanTemplateSchema.safeParse({ harga_jual: 1, items: t.bahan.map((b) => ({ nama_bahan_baru: b.nama_bahan, satuan: b.satuan, takaran: b.takaran })) }).success, t.kode).toBe(true);
    }
  });

  test('US-04 pencocokan: nama trim case-insensitive dan satuan sama', () => {
    const outlet = [
      { id: 'a', nama: ' telur AYAM ', satuan: 'buah' as const },
      { id: 'b', nama: 'Kecap manis', satuan: 'gram' as const },
    ];
    expect(cocokkanBahan({ nama_bahan: 'Telur ayam', satuan: 'buah', takaran: '1' }, outlet)).toBe('a');
    expect(cocokkanBahan({ nama_bahan: 'Kecap manis', satuan: 'ml', takaran: '15' }, outlet)).toBeNull();
  });
});

describe('fixtures (docs/design/README.md → Model Konten Demo)', () => {
  test('BR-12 8 menu, 17 bahan, Nasi Goreng Rp15.000, snapshot & bahan kasir tanpa field biaya', () => {
    expect(menu).toHaveLength(8);
    expect(bahan).toHaveLength(17);
    expect(menu[0]).toMatchObject({ nama: 'Nasi Goreng', harga_jual: 15_000 });
    expect(bahanKasir.every((b) => !('harga_beli_per_satuan' in b))).toBe(true);
    const json = JSON.stringify(snapshot);
    for (const kunci of ['harga_beli', 'hpp', 'margin']) expect(json).not.toContain(kunci);
    expect(new Set(bahan.map((b) => b.status_stok))).toEqual(new Set(['habis', 'menipis', 'aman']));
  });
});
