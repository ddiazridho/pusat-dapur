import { TZDate } from '@date-fns/tz';
import { addDays, format, startOfDay } from 'date-fns';
import { MAKS_RIWAYAT_LAPORAN_HARI } from './konstanta';
import type { PeriodeLaporan, ZonaWaktu } from './schemas/enum';

/**
 * Batas hari dalam zona outlet (NFR-01 → Waktu). Semua "hari ini", tanggal
 * struk, periode laporan, dan batas pembatalan lewat modul ini, bukan
 * `new Date()` lokal perangkat/server.
 */

type InputWaktu = Date | string | number;

/** Rentang setengah terbuka `[mulai, akhir)` dalam UTC. */
export interface Rentang {
  mulai: Date;
  akhir: Date;
}

function diZona(d: InputWaktu, tz: ZonaWaktu): TZDate {
  return new TZDate(new Date(d).getTime(), tz);
}

function keDate(d: Date): Date {
  return new Date(d.getTime());
}

/** Tanggal kalender `YYYY-MM-DD` di zona outlet. */
export function tanggalDi(d: InputWaktu, tz: ZonaWaktu): string {
  return format(diZona(d, tz), 'yyyy-MM-dd');
}

export function hariIni(tz: ZonaWaktu, sekarang: InputWaktu = Date.now()): string {
  return tanggalDi(sekarang, tz);
}

/** Selisih hari kalender `tanggal` + n (n boleh negatif). */
export function geserTanggal(tanggal: string, n: number): string {
  const [y, m, d] = tanggal.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** `[00:00, 00:00 besok)` tanggal `YYYY-MM-DD` di zona outlet, dalam UTC. */
export function rentangTanggal(tanggal: string, tz: ZonaWaktu): Rentang {
  const [y, m, d] = tanggal.split('-').map(Number) as [number, number, number];
  const mulai = new TZDate(y, m - 1, d, tz);
  return { mulai: keDate(mulai), akhir: keDate(addDays(mulai, 1)) };
}

/** `[dari 00:00, sampai+1 00:00)` untuk filter `dari`/`sampai` (mutasi). */
export function rentangTanggalInklusif(dari: string, sampai: string, tz: ZonaWaktu): Rentang {
  return { mulai: rentangTanggal(dari, tz).mulai, akhir: rentangTanggal(sampai, tz).akhir };
}

export function samaHari(a: InputWaktu, b: InputWaktu, tz: ZonaWaktu): boolean {
  return tanggalDi(a, tz) === tanggalDi(b, tz);
}

export function adalahHariIni(d: InputWaktu, tz: ZonaWaktu, sekarang: InputWaktu = Date.now()): boolean {
  return samaHari(d, sekarang, tz);
}

/**
 * Akses kasir ke satu transaksi & batas pembatalan (`pos.md`,
 * `pembatalan-transaksi.md`): hari ini jika tanggal `waktu_transaksi` **atau**
 * `created_at` adalah hari ini.
 */
export function transaksiHariIni(
  t: { waktu_transaksi: InputWaktu; created_at: InputWaktu },
  tz: ZonaWaktu,
  sekarang: InputWaktu = Date.now(),
): boolean {
  return adalahHariIni(t.waktu_transaksi, tz, sekarang) || adalahHariIni(t.created_at, tz, sekarang);
}

/**
 * Tanggal tertua yang boleh diakses riwayat/laporan. Ponytail: "maks 90 hari ke
 * belakang" ditafsirkan 90 hari termasuk hari ini (sama dengan pola `30_hari`).
 */
export function tanggalTertuaRiwayat(tz: ZonaWaktu, sekarang: InputWaktu = Date.now()): string {
  return geserTanggal(hariIni(tz, sekarang), -(MAKS_RIWAYAT_LAPORAN_HARI - 1));
}

/** `tanggal` di rentang riwayat dan tidak di masa depan. */
export function dalamBatasRiwayat(tanggal: string, tz: ZonaWaktu, sekarang: InputWaktu = Date.now()): boolean {
  return tanggal >= tanggalTertuaRiwayat(tz, sekarang) && tanggal <= hariIni(tz, sekarang);
}

const HARI_MUNDUR: Record<PeriodeLaporan, number> = { hari_ini: 0, '7_hari': 6, '30_hari': 29 };
const GESER_PEMBANDING: Record<PeriodeLaporan, number> = { hari_ini: 1, '7_hari': 7, '30_hari': 30 };

/**
 * Rentang periode laporan (`laporan.md`): 00:00 (hari ini − n) s.d. sekarang,
 * plus `pembanding` dengan panjang sama digeser 1/7/30 hari kalender.
 */
export function rentangPeriode(
  periode: PeriodeLaporan,
  tz: ZonaWaktu,
  sekarang: InputWaktu = Date.now(),
): Rentang & { pembanding: Rentang; tanggal: string[] } {
  const kini = diZona(sekarang, tz);
  const mulai = addDays(startOfDay(kini), -HARI_MUNDUR[periode]);
  const geser = GESER_PEMBANDING[periode];
  const hari = hariIni(tz, sekarang);
  const tanggal = Array.from({ length: HARI_MUNDUR[periode] + 1 }, (_, i) =>
    geserTanggal(hari, i - HARI_MUNDUR[periode]),
  );
  return {
    mulai: keDate(mulai),
    akhir: keDate(kini),
    pembanding: { mulai: keDate(addDays(mulai, -geser)), akhir: keDate(addDays(kini, -geser)) },
    tanggal,
  };
}

/** Sejak 00:00 enam hari lalu (zona outlet): dasar `jumlah_terjual_7_hari` (`menu.md`). */
export function mulaiTujuhHari(tz: ZonaWaktu, sekarang: InputWaktu = Date.now()): Date {
  return rentangPeriode('7_hari', tz, sekarang).mulai;
}
