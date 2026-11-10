import { describe, expect, test } from 'vitest';
import {
  hargaSatuan,
  jam,
  kuantitas,
  normalisasiNomorWa,
  perubahan,
  persen,
  relatif,
  rupiah,
  rupiahRingkas,
  tanggal,
  tanggalJam,
  tanggalPanjang,
  teksStruk,
  urlWhatsApp,
} from '@/shared/format';
import { buatNomorStruk, POLA_NOMOR_STRUK_FINAL, POLA_NOMOR_STRUK_PERANGKAT, prefiksPerangkat } from '@/shared/nomor-struk';
import {
  dalamBatasRiwayat,
  hariIni,
  rentangPeriode,
  rentangTanggal,
  tanggalDi,
  tanggalTertuaRiwayat,
  transaksiHariIni,
} from '@/shared/waktu';
import { transaksiContoh } from '@/client/fixtures';

describe('NFR-01 batas hari 3 zona (waktu.ts)', () => {
  // 16:59:59Z = 23:59:59 WIB = 00:59:59 WITA (besok) = 01:59:59 WIT (besok)
  const jelangTengahMalamWib = '2026-11-10T16:59:59.999Z';
  const tengahMalamWib = '2026-11-10T17:00:00.000Z';

  test.each([
    ['Asia/Jakarta', '2026-11-10', '2026-11-11', '2026-11-09T17:00:00.000Z'],
    ['Asia/Makassar', '2026-11-11', '2026-11-11', '2026-11-09T16:00:00.000Z'],
    ['Asia/Jayapura', '2026-11-11', '2026-11-11', '2026-11-09T15:00:00.000Z'],
  ] as const)('NFR-01 %s: tanggal lokal & 00:00 dalam UTC', (tz, tglA, tglB, mulai10Nov) => {
    expect(tanggalDi(jelangTengahMalamWib, tz)).toBe(tglA);
    expect(tanggalDi(tengahMalamWib, tz)).toBe(tglB);
    const r = rentangTanggal('2026-11-10', tz);
    expect(r.mulai.toISOString()).toBe(mulai10Nov);
    expect(r.akhir.getTime() - r.mulai.getTime()).toBe(86_400_000);
  });

  test('NFR-01 pergantian tanggal tepat 00:00 zona outlet', () => {
    expect(tanggalDi('2026-11-09T14:59:59.999Z', 'Asia/Jayapura')).toBe('2026-11-09');
    expect(tanggalDi('2026-11-09T15:00:00.000Z', 'Asia/Jayapura')).toBe('2026-11-10');
    expect(tanggalDi('2026-11-09T15:59:59.999Z', 'Asia/Makassar')).toBe('2026-11-09');
    expect(tanggalDi('2026-11-09T16:00:00.000Z', 'Asia/Makassar')).toBe('2026-11-10');
  });

  test('BR-12 kasir/pembatalan: hari ini jika waktu_transaksi ATAU created_at hari ini', () => {
    const sekarang = '2026-11-10T05:00:00.000Z';
    const tz = 'Asia/Jakarta';
    expect(transaksiHariIni({ waktu_transaksi: '2026-11-09T05:00:00Z', created_at: '2026-11-10T01:00:00Z' }, tz, sekarang)).toBe(true);
    expect(transaksiHariIni({ waktu_transaksi: '2026-11-10T01:00:00Z', created_at: '2026-11-10T01:00:00Z' }, tz, sekarang)).toBe(true);
    expect(transaksiHariIni({ waktu_transaksi: '2026-11-09T05:00:00Z', created_at: '2026-11-09T16:59:00Z' }, tz, sekarang)).toBe(false);
  });

  test('US-12 laporan.md periode: 00:00 (hari ini − 0/6/29) s.d. sekarang + pembanding', () => {
    const sekarang = '2026-11-10T05:45:00.000Z'; // 12.45 WIB
    const h = rentangPeriode('hari_ini', 'Asia/Jakarta', sekarang);
    expect(h.mulai.toISOString()).toBe('2026-11-09T17:00:00.000Z');
    expect(h.akhir.toISOString()).toBe(sekarang);
    expect(h.pembanding.mulai.toISOString()).toBe('2026-11-08T17:00:00.000Z');
    expect(h.pembanding.akhir.toISOString()).toBe('2026-11-09T05:45:00.000Z');
    const t = rentangPeriode('7_hari', 'Asia/Jayapura', sekarang);
    expect(t.mulai.toISOString()).toBe('2026-11-03T15:00:00.000Z');
    expect(t.tanggal).toHaveLength(7);
    expect(t.tanggal.at(-1)).toBe('2026-11-10');
    expect(rentangPeriode('30_hari', 'Asia/Makassar', sekarang).tanggal[0]).toBe('2026-10-12');
  });

  test('NFR-10 batas riwayat 90 hari', () => {
    const sekarang = '2026-11-10T05:00:00Z';
    expect(hariIni('Asia/Jakarta', sekarang)).toBe('2026-11-10');
    expect(tanggalTertuaRiwayat('Asia/Jakarta', sekarang)).toBe('2026-08-13');
    expect(dalamBatasRiwayat('2026-08-13', 'Asia/Jakarta', sekarang)).toBe(true);
    expect(dalamBatasRiwayat('2026-08-12', 'Asia/Jakarta', sekarang)).toBe(false);
    expect(dalamBatasRiwayat('2026-11-11', 'Asia/Jakarta', sekarang)).toBe(false);
  });
});

describe('US-08 nomor struk (struk.md)', () => {
  test('format YYMMDD-XXXXXX-NNN dari tanggal zona outlet + device_id', () => {
    const deviceId = '3fa9c2d1-0b4e-4c8a-9f21-6a7d5e0c1b2a';
    expect(buatNomorStruk({ waktu: '2026-11-10T05:45:00Z', tz: 'Asia/Jakarta', deviceId, urutan: 14 })).toBe('261110-3FA9C2-014');
    // 16:30Z = 23.30 WIB tetapi 01.30 WIT besok
    expect(buatNomorStruk({ waktu: '2026-11-10T16:30:00Z', tz: 'Asia/Jayapura', deviceId, urutan: 1 })).toBe('261111-3FA9C2-001');
    expect(buatNomorStruk({ waktu: '2026-11-10T05:45:00Z', tz: 'Asia/Jakarta', deviceId, urutan: 1234 })).toBe('261110-3FA9C2-1234');
    expect(prefiksPerangkat('ab-cdef12-3456')).toBe('ABCDEF');
    expect(() => buatNomorStruk({ waktu: Date.now(), tz: 'Asia/Jakarta', deviceId, urutan: 0 })).toThrow();
  });

  test.each([
    ['261110-3FA9C2-014', true, true],
    ['261110-3FA9C2-1000', true, true],
    ['261110-3FA9C2-014-2', false, true],
    ['261110-3fa9c2-014', false, false],
    ['261110-3FA9C2-14', false, false],
    ['26111-3FA9C2-014', false, false],
    ['261110-3FA9C2-014-', false, false],
    ['261110-3FA9G2-014', false, false],
  ])('regex %s → perangkat %s, final %s', (nomor, perangkat, final) => {
    expect(POLA_NOMOR_STRUK_PERANGKAT.test(nomor)).toBe(perangkat);
    expect(POLA_NOMOR_STRUK_FINAL.test(nomor)).toBe(final);
  });
});

describe('NFR-07 format (konten-aksesibilitas.md §3)', () => {
  const tz = 'Asia/Jakarta';
  const d = '2026-11-10T05:45:00.000Z';

  test('Rupiah, ringkas, harga per satuan, kuantitas, persen, perubahan', () => {
    expect(rupiah(12_500)).toBe('Rp12.500');
    expect(rupiah(-3_000)).toBe('−Rp3.000');
    expect(rupiah(0)).toBe('Rp0');
    expect(rupiahRingkas(1_200_000)).toBe('Rp1,2 jt');
    expect(rupiahRingkas(350_000)).toBe('Rp350 rb');
    expect(rupiahRingkas(2_000_000)).toBe('Rp2 jt');
    expect(hargaSatuan('14.00', 'gram')).toBe('Rp14,00 / gram');
    expect(hargaSatuan('2200', 'buah')).toBe('Rp2.200,00 / buah');
    expect(kuantitas('12400.000', 'gram')).toBe('12.400 gram');
    expect(kuantitas('0.500', 'buah')).toBe('0,5 buah');
    expect(kuantitas('1.25', 'liter')).toBe('1,25 liter');
    expect(persen(67.3)).toBe('67,3%');
    expect(persen(-4)).toBe('−4,0%');
    expect(persen(1234.5)).toBe('1.234,5%');
    expect(perubahan(12.4, 'hari_ini')).toBe('▲ 12,4% dibanding kemarin');
    expect(perubahan(-3, '7_hari')).toBe('▼ 3,0% dibanding 7 hari sebelumnya');
    expect(perubahan(0, '30_hari')).toBe('— 0,0% dibanding 30 hari sebelumnya');
    expect(perubahan(null, 'hari_ini')).toBe('Belum ada pembanding');
  });

  test('tanggal & jam zona outlet', () => {
    expect(tanggal('2026-11-02T03:00:00Z', tz)).toBe('2 Nov 2026');
    expect(tanggalPanjang(d, tz)).toBe('Selasa, 10 Nov 2026');
    expect(jam(d, tz)).toBe('12.45 WIB');
    expect(jam(d, 'Asia/Makassar')).toBe('13.45 WITA');
    expect(jam(d, 'Asia/Jayapura')).toBe('14.45 WIT');
    expect(tanggalJam(d, tz)).toBe('10 Nov 2026 12.45 WIB');
  });

  test('relatif', () => {
    const now = '2026-11-10T05:45:00.000Z';
    expect(relatif('2026-11-10T05:44:30Z', tz, now)).toBe('baru saja');
    expect(relatif('2026-11-10T05:43:00Z', tz, now)).toBe('2 mnt lalu');
    expect(relatif('2026-11-10T02:40:00Z', tz, now)).toBe('3 jam lalu');
    expect(relatif('2026-11-09T14:10:00Z', tz, now)).toBe('kemarin 21.10');
    expect(relatif('2026-11-02T03:00:00Z', tz, now)).toBe('2 Nov 2026');
  });

  test('US-08 teks_struk WhatsApp: satu item per baris, link hanya bila tersinkron', () => {
    const teks = teksStruk({ ...transaksiContoh, url_struk: 'https://pusat-dapur.vercel.app/s/abc' }, tz);
    expect(teks.split('\n')).toEqual([
      'Warung Demo Pusat Dapur',
      'No. 261110-3FA9C2-014',
      '10 Nov 2026 12.45 WIB · Makan di tempat',
      '--------------------------------',
      '2x Nasi Goreng            30.000',
      '3x Es Teh Manis           12.000',
      '--------------------------------',
      'Total                   Rp42.000',
      'Tunai                   Rp50.000',
      'Kembalian                Rp8.000',
      'Terima kasih!',
      'Struk: https://pusat-dapur.vercel.app/s/abc',
    ]);
    const pending = teksStruk({ ...transaksiContoh, metode_bayar: 'qris', uang_diterima: null, kembalian: null }, tz);
    expect(pending).not.toContain('Struk:');
    expect(pending).toContain('QRIS                    Rp42.000');
    expect(urlWhatsApp('a b&c')).toBe('https://wa.me/?text=a%20b%26c');
    expect(urlWhatsApp('x', '6281234567890')).toBe('https://wa.me/6281234567890?text=x');
  });

  test.each([
    ['081234567890', '6281234567890'],
    ['+6281234567890', '6281234567890'],
    ['0812-3456-7890', '6281234567890'],
    ['08123', null],
    ['0812345678901234', null],
    ['6281234567890', null],
    ['+1 555 1234567', null],
  ])('US-08 struk.md nomor WhatsApp %s → %s', (input, hasil) => {
    expect(normalisasiNomorWa(input)).toBe(hasil);
  });
});
