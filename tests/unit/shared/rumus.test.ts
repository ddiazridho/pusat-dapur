import { describe, expect, test } from 'vitest';
import { bagiBulat, dariSkala, keSkala } from '@/shared/rumus/desimal';
import { hargaJualMinimum, hitungHpp, hppBelumLengkap, marginPersen, pratinjauResep, turunanMenu } from '@/shared/rumus/hpp';
import { hargaBerubahJauh, konversiRestock, perubahanHargaPersen } from '@/shared/rumus/restock';
import {
  dariMilli,
  hitungKebutuhanDesimal,
  hitungKebutuhanMilli,
  keMilli,
  pesanAlert,
  pesanStokTidakCukup,
  putuskanStok,
  putuskanStokDesimal,
  statusStok,
} from '@/shared/rumus/stok';
import { hitungKembalian, hitungTotal, marginKotorPersen, perubahanPersen, pilihanUangCepat, rataRataTransaksi } from '@/shared/rumus/uang';

describe('desimal', () => {
  test('keSkala/dariSkala bolak-balik dan half-up', () => {
    expect(keSkala('200.000', 3)).toBe(200000n);
    expect(keSkala('0.5', 3)).toBe(500n);
    expect(keSkala('1.2345', 3)).toBe(1235n);
    expect(keSkala({ toFixed: (d: number) => (14).toFixed(d) }, 2)).toBe(1400n);
    expect(dariSkala(1200n, 2)).toBe('12.00');
    expect(dariSkala(-5n, 3)).toBe('-0.005');
    expect(bagiBulat(5n, 2n)).toBe(3n);
    expect(bagiBulat(-5n, 2n)).toBe(-3n);
  });
});

describe('BR-01 HPP & margin (hpp-margin.md)', () => {
  const resep = [
    { harga_beli_per_satuan: '14.00', takaran: '200.000' },
    { harga_beli_per_satuan: '2000.00', takaran: '1.000' },
  ];

  test('BR-01 contoh FRD: 200 g @ Rp14,00 + 1 telur @ Rp2.000,00 → hpp_cached 4800.00', () => {
    expect(hitungHpp(resep)).toBe('4800.00');
  });

  test('BR-02 harga_jual 15000 → margin_persen 68.0', () => {
    expect(marginPersen(15_000, '4800.00')).toBe(68);
  });

  test('BR-02 harga_jual_minimum: hpp 4800, ambang 20 → Rp6.000', () => {
    expect(hargaJualMinimum('4800.00', 20, false)).toBe(6_000);
  });

  test('BR-02 harga_jual_minimum dibulatkan ke atas kelipatan Rp500; null untuk 100%, resep kosong, > 10 jt', () => {
    expect(hargaJualMinimum('4900.00', 20, false)).toBe(6_500); // 6125 → 6500
    expect(hargaJualMinimum('4800.00', 100, false)).toBeNull();
    expect(hargaJualMinimum('0.00', 20, true)).toBeNull();
    expect(hargaJualMinimum('9000000.00', 20, false)).toBeNull();
    expect(hargaJualMinimum('0.00', 0, false)).toBe(0);
  });

  test('BR-01 pembulatan half-up 2 desimal pada total, bukan per baris', () => {
    expect(hitungHpp([{ harga_beli_per_satuan: '0.01', takaran: '0.500' }])).toBe('0.01');
    expect(hitungHpp([{ harga_beli_per_satuan: '0.01', takaran: '0.499' }])).toBe('0.00');
    expect(hitungHpp([])).toBe('0.00');
  });

  test('BR-02 margin negatif dan 1 desimal half-up', () => {
    expect(marginPersen(4_000, '5000.00')).toBe(-25);
    expect(marginPersen(3_000, '1000.00')).toBe(66.7);
  });

  test('BR-02 resep kosong: margin null, tidak margin_rendah; hpp_belum_lengkap tetap bisa margin_rendah', () => {
    expect(
      turunanMenu({ harga_jual: 10_000, hpp_cached: '0', ambang_margin: 20, resep_kosong: true, hpp_belum_lengkap: false }),
    ).toEqual({ margin_persen: null, margin_rendah: false, resep_kosong: true, hpp_belum_lengkap: false, harga_jual_minimum: null });
    expect(hppBelumLengkap([{ harga_beli_per_satuan: '0.00' }])).toBe(true);
    const p = pratinjauResep([{ harga_beli_per_satuan: '0.00', takaran: '1' }, { harga_beli_per_satuan: '9000', takaran: '1' }], 10_000, 20);
    expect(p).toMatchObject({ hpp_cached: '9000.00', margin_persen: 10, margin_rendah: true, hpp_belum_lengkap: true });
  });
});

describe('US-09 konversi restock (restock.md)', () => {
  test('US-09 contoh FRD: 5 kg beras Rp60.000 → jumlah 5000 gram, harga 12.00', () => {
    expect(konversiRestock({ jumlahInput: '5', satuanInput: 'kg', totalHarga: 60_000, satuanBahan: 'gram' })).toEqual({
      ok: true,
      jumlah: '5000.000',
      harga_beli_per_satuan: '12.00',
    });
  });

  test('US-09 liter ×1000, half-up 2 desimal, satuan tidak cocok, harga > 10 jt', () => {
    expect(konversiRestock({ jumlahInput: '1.5', satuanInput: 'liter', totalHarga: 25_000, satuanBahan: 'ml' })).toMatchObject({
      jumlah: '1500.000',
      harga_beli_per_satuan: '16.67',
    });
    expect(konversiRestock({ jumlahInput: '3', satuanInput: 'buah', totalHarga: 10_000, satuanBahan: 'buah' })).toMatchObject({
      harga_beli_per_satuan: '3333.33',
    });
    expect(konversiRestock({ jumlahInput: '1', satuanInput: 'kg', totalHarga: 1, satuanBahan: 'ml' })).toMatchObject({
      ok: false,
      field: 'satuan_input',
    });
    expect(konversiRestock({ jumlahInput: '0.001', satuanInput: 'buah', totalHarga: 100_000_000, satuanBahan: 'buah' })).toMatchObject({
      ok: false,
      field: 'total_harga',
    });
  });

  test('US-09 perubahan_persen null jika harga lama 0; peringatan > ±50%', () => {
    expect(perubahanHargaPersen('0.00', '12.00')).toBeNull();
    expect(perubahanHargaPersen('2000.00', '2200.00')).toBe(10);
    expect(hargaBerubahJauh(perubahanHargaPersen('10.00', '16.00'))).toBe(true);
    expect(hargaBerubahJauh(perubahanHargaPersen('10.00', '15.00'))).toBe(false);
    expect(hargaBerubahJauh(perubahanHargaPersen('10.00', '4.00'))).toBe(true);
    expect(hargaBerubahJauh(null)).toBe(false);
  });
});

describe('BR-06/BR-07 tabel keputusan stok (pengurangan-stok.md)', () => {
  const kebutuhan = { telur: 3000 };
  const cukup = { telur: 5000 };
  const kurang = { telur: 1000 };
  const baris = [
    // [dibuat_offline, blokir, stok, ditolak, koreksi]
    ['any/any tanpa kekurangan (online, blokir)', false, true, cukup, false, 0],
    ['any/any tanpa kekurangan (offline, tanpa blokir)', true, false, cukup, false, 0],
    ['online + blokir + kurang → ditolak 409', false, true, kurang, true, 0],
    ['online + tanpa blokir + kurang → diterima dengan koreksi', false, false, kurang, false, 1],
    ['offline + blokir + kurang → selalu diterima dengan koreksi', true, true, kurang, false, 1],
    ['offline + tanpa blokir + kurang → selalu diterima dengan koreksi', true, false, kurang, false, 1],
  ] as const;

  test.each(baris)('BR-07 %s', (_nama, dibuatOffline, blokir, stok, ditolak, jumlahKoreksi) => {
    const hasil = putuskanStok({ dibuatOffline, blokir, kebutuhan, stok });
    expect(hasil.ditolak).toBe(ditolak);
    expect(hasil.koreksi).toHaveLength(jumlahKoreksi);
    expect(hasil.kekurangan).toHaveLength(stok === kurang ? 1 : 0);
  });

  test('BR-07 kekurangan = kebutuhan − stok; bahan tanpa stok dianggap 0; stok sama dengan kebutuhan = cukup', () => {
    const hasil = putuskanStok({
      dibuatOffline: true,
      blokir: true,
      kebutuhan: new Map([
        ['b', 600_000],
        ['a', 3000],
        ['c', 200],
      ]),
      stok: new Map([
        ['b', 400_000],
        ['c', 200],
      ]),
    });
    expect(hasil.koreksi).toEqual([
      { bahan_baku_id: 'a', dibutuhkan: 3000, tersedia: 0, kekurangan: 3000 },
      { bahan_baku_id: 'b', dibutuhkan: 600_000, tersedia: 400_000, kekurangan: 200_000 },
    ]);
  });

  test('BR-07 adaptor Decimal/string server memberi keputusan sama', () => {
    const hasil = putuskanStokDesimal({
      dibuatOffline: false,
      blokir: true,
      kebutuhan: { telur: { toFixed: (d: number) => (3).toFixed(d) } },
      stok: { telur: '1.000' },
    });
    expect(hasil).toEqual({
      ditolak: true,
      kekurangan: [{ bahan_baku_id: 'telur', dibutuhkan: '3.000', tersedia: '1.000', kekurangan: '2.000' }],
      koreksi: [],
    });
  });

  test('BR-06 kebutuhan = Σ qty × takaran; menu tanpa resep tidak mengurangi', () => {
    const items = [
      { menu_id: 'ng', qty: 2 },
      { menu_id: 'ntd', qty: 1 },
      { menu_id: 'titipan', qty: 5 },
    ];
    const resep = [
      { menu_id: 'ng', bahan_baku_id: 'telur', takaran: '1.000' },
      { menu_id: 'ntd', bahan_baku_id: 'telur', takaran: '2.000' },
      { menu_id: 'ng', bahan_baku_id: 'nasi', takaran: '200.000' },
    ];
    expect(hitungKebutuhanDesimal(items, resep)).toEqual(
      new Map([
        ['telur', '4.000'],
        ['nasi', '400.000'],
      ]),
    );
    expect(hitungKebutuhanMilli(items, resep.map((r) => ({ ...r, takaran: keMilli(r.takaran) })))).toEqual(
      new Map([
        ['telur', 4000],
        ['nasi', 400_000],
      ]),
    );
  });

  test('ADR-09 milli-unit tanpa error float', () => {
    expect(keMilli('0.1') + keMilli('0.2')).toBe(keMilli('0.3'));
    expect(dariMilli(999_999_999_999)).toBe('999999999.999');
  });

  test('BR-07 pesan STOK_TIDAK_CUKUP menyebut semua bahan', () => {
    expect(
      pesanStokTidakCukup([
        { nama: 'Telur ayam', satuan: 'buah', dibutuhkan: '3.000', tersedia: '1.000' },
        { nama: 'Nasi putih', satuan: 'gram', dibutuhkan: '600.000', tersedia: '400.000' },
      ]),
    ).toBe('Stok Telur ayam kurang: butuh 3 buah, sisa 1 buah. Stok Nasi putih kurang: butuh 600 gram, sisa 400 gram.');
  });

  test('status_stok habis/menipis/aman; threshold 0 hanya aman/habis; pesan alert', () => {
    expect(statusStok('0.000', '10')).toBe('habis');
    expect(statusStok('5', '10')).toBe('menipis');
    expect(statusStok('10', '10')).toBe('aman');
    expect(statusStok('0.001', '0')).toBe('aman');
    expect(pesanAlert('stok_menipis', { nama: 'Gula pasir', satuan: 'gram', stok_saat_ini: '300.000' })).toBe(
      'Stok Gula pasir tinggal 300 gram, segera belanja.',
    );
    expect(pesanAlert('stok_menipis', { nama: 'Telur ayam', satuan: 'buah', stok_saat_ini: '0' })).toBe('Stok Telur ayam habis.');
    expect(pesanAlert('stok_tidak_sinkron', { nama: 'Telur ayam', satuan: 'buah', stok_saat_ini: '0' })).toBe(
      'Stok Telur ayam tidak sinkron, lakukan opname.',
    );
  });
});

describe('uang (pos.md, laporan.md)', () => {
  test('total, kembalian, uang cepat di atas total', () => {
    const total = hitungTotal([
      { harga_jual: 15_000, qty: 2 },
      { harga_jual: 4_000, qty: 3 },
    ]);
    expect(total).toBe(42_000);
    expect(hitungKembalian(total, 50_000)).toBe(8_000);
    expect(hitungKembalian(total, 40_000)).toBeNull();
    expect(hitungKembalian(total, null)).toBeNull();
    expect(pilihanUangCepat(total)).toEqual([42_000, 50_000, 100_000]);
    expect(pilihanUangCepat(5_000)).toEqual([5_000, 10_000, 20_000, 50_000, 100_000]);
  });

  test('metrik laporan: margin kotor, perubahan, rata-rata; null jika penyebut 0', () => {
    expect(marginKotorPersen(673, 1000)).toBe(67.3);
    expect(marginKotorPersen(0, 0)).toBeNull();
    expect(perubahanPersen(1124, 1000)).toBe(12.4);
    expect(perubahanPersen(5, 0)).toBeNull();
    expect(rataRataTransaksi(100, 3)).toBe(33);
    expect(rataRataTransaksi(0, 0)).toBe(0);
  });
});
