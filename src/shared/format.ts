import { TZDate } from '@date-fns/tz';
import { differenceInCalendarDays, format as formatDateFns } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import { DIGIT_HARGA_SATUAN, DIGIT_KUANTITAS, MAKS_DIGIT_WA, MIN_DIGIT_WA } from './konstanta';
import { dariSkala, keSkala, type InputDesimal } from './rumus/desimal';
import type { MetodeBayar, PeriodeLaporan, TipePesanan, ZonaWaktu } from './schemas/enum';

/**
 * Semua format angka & tanggal UI (`docs/design/konten-aksesibilitas.md` §3,
 * NFR-07). Komponen tidak memanggil `toLocaleString` sendiri.
 * Tanggal/jam selalu memakai zona outlet, bukan zona perangkat.
 */

/** Tanda minus tipografis (U+2212), sesuai contoh `−Rp3.000`. */
const MINUS = '−';

function kelompokRibuan(bulat: string): string {
  return bulat.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Angka bulat dengan titik ribuan, tanpa `Rp` (`30.000`); dipakai baris item struk. */
export function ribuan(n: number): string {
  const bulat = Math.round(n);
  const teks = kelompokRibuan(Math.abs(bulat).toString());
  return bulat < 0 ? `${MINUS}${teks}` : teks;
}

/** `Rp12.500`, `−Rp3.000`. Pecahan dibulatkan ke Rupiah. */
export function rupiah(n: number): string {
  const bulat = Math.round(n);
  const teks = `Rp${kelompokRibuan(Math.abs(bulat).toString())}`;
  return bulat < 0 ? `${MINUS}${teks}` : teks;
}

/** Sumbu grafik: `Rp1,2 jt`, `Rp350 rb`, di bawah seribu sama dengan `rupiah`. */
export function rupiahRingkas(n: number): string {
  const abs = Math.abs(n);
  const tanda = n < 0 ? MINUS : '';
  if (abs >= 1_000_000) {
    const jt = Math.round(abs / 100_000) / 10;
    return `${tanda}Rp${desimalKoma(jt, 1)} jt`;
  }
  if (abs >= 1_000) return `${tanda}Rp${Math.round(abs / 1_000)} rb`;
  return rupiah(n);
}

/** 1 desimal maks, nol di belakang dibuang (`1,2`, `3`). */
function desimalKoma(n: number, digit: number): string {
  const teks = n.toFixed(digit).replace(/\.?0+$/, '');
  const [bulat = '0', pecahan] = teks.split('.');
  return pecahan ? `${kelompokRibuan(bulat)},${pecahan}` : kelompokRibuan(bulat);
}

/** String desimal → teks koma Indonesia dengan `digit` pecahan tetap atau dibuang nolnya. */
function desimalIndonesia(nilai: InputDesimal, skala: number, buangNol: boolean): string {
  const teks = dariSkala(keSkala(nilai, skala), skala);
  const negatif = teks.startsWith('-');
  const [bulat = '0', pecahanAsli = ''] = (negatif ? teks.slice(1) : teks).split('.');
  const pecahan = buangNol ? pecahanAsli.replace(/0+$/, '') : pecahanAsli;
  const isi = pecahan ? `${kelompokRibuan(bulat)},${pecahan}` : kelompokRibuan(bulat);
  return negatif ? `${MINUS}${isi}` : isi;
}

/** `Rp14,00 / gram`, `Rp2.200,00 / buah`. */
export function hargaSatuan(nilai: InputDesimal, satuan: string): string {
  return `Rp${desimalIndonesia(nilai, DIGIT_HARGA_SATUAN, false)} / ${satuan}`;
}

/** Angka kuantitas saja: `12.400`, `0,5`, `1,25` (maks 3 desimal, nol dibuang). */
export function angkaKuantitas(nilai: InputDesimal): string {
  return desimalIndonesia(nilai, DIGIT_KUANTITAS, true);
}

/** `12.400 gram`, `0,5 buah`, `1,25 liter`. */
export function kuantitas(nilai: InputDesimal, satuan: string): string {
  return `${angkaKuantitas(nilai)} ${satuan}`;
}

/** `67,3%`, `−4,0%`. */
export function persen(n: number): string {
  const [bulat = '0', pecahan = '0'] = Math.abs(n).toFixed(1).split('.');
  const teks = `${kelompokRibuan(bulat)},${pecahan}%`;
  return n < 0 && teks !== '0,0%' ? `${MINUS}${teks}` : teks;
}

const LABEL_PEMBANDING: Record<PeriodeLaporan, string> = {
  hari_ini: 'dibanding kemarin',
  '7_hari': 'dibanding 7 hari sebelumnya',
  '30_hari': 'dibanding 30 hari sebelumnya',
};

/** `▲ 12,4% dibanding kemarin`; `null` → "Belum ada pembanding" (`komponen.md` KartuKPI). */
export function perubahan(p: number | null, periode: PeriodeLaporan): string {
  if (p === null) return 'Belum ada pembanding';
  const panah = p > 0 ? '▲' : p < 0 ? '▼' : '—';
  return `${panah} ${persen(Math.abs(p))} ${LABEL_PEMBANDING[periode]}`;
}

// ── Tanggal & jam ───────────────────────────────────────────────────────────

const LABEL_ZONA: Record<ZonaWaktu, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

export function labelZona(tz: ZonaWaktu): string {
  return LABEL_ZONA[tz];
}

type InputWaktu = Date | string | number;

function diZona(d: InputWaktu, tz: ZonaWaktu): TZDate {
  return new TZDate(new Date(d).getTime(), tz);
}

function fmt(d: InputWaktu, tz: ZonaWaktu, pola: string): string {
  return formatDateFns(diZona(d, tz), pola, { locale: localeId });
}

/** `2 Nov 2026`. */
export function tanggal(d: InputWaktu, tz: ZonaWaktu): string {
  return fmt(d, tz, 'd MMM yyyy');
}

/** `Selasa, 10 Nov 2026`. */
export function tanggalPanjang(d: InputWaktu, tz: ZonaWaktu): string {
  return fmt(d, tz, 'EEEE, d MMM yyyy');
}

/** Tooltip grafik: `Sen, 9 Nov`. */
export function tanggalPendek(d: InputWaktu, tz: ZonaWaktu): string {
  return fmt(d, tz, 'EEE, d MMM');
}

/** `12.45 WIB`. */
export function jam(d: InputWaktu, tz: ZonaWaktu): string {
  return `${fmt(d, tz, 'HH.mm')} ${labelZona(tz)}`;
}

/** `10 Nov 2026 12.45 WIB` (struk, NFR-07). */
export function tanggalJam(d: InputWaktu, tz: ZonaWaktu): string {
  return `${tanggal(d, tz)} ${jam(d, tz)}`;
}

/**
 * Waktu relatif: `baru saja`, `2 mnt lalu`, `3 jam lalu` (hari yang sama),
 * `kemarin 21.10`, lalu tanggal.
 */
export function relatif(d: InputWaktu, tz: ZonaWaktu, sekarang: InputWaktu = Date.now()): string {
  const selisihMs = new Date(sekarang).getTime() - new Date(d).getTime();
  const menit = Math.floor(selisihMs / 60_000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} mnt lalu`;
  const hari = differenceInCalendarDays(diZona(sekarang, tz), diZona(d, tz));
  if (hari === 0) return `${Math.floor(menit / 60)} jam lalu`;
  if (hari === 1) return `kemarin ${fmt(d, tz, 'HH.mm')}`;
  return tanggal(d, tz);
}

// ── Label enum (`konten-aksesibilitas.md` §1, `struk.md`) ───────────────────

export const LABEL_TIPE_PESANAN: Record<TipePesanan, string> = {
  dine_in: 'Makan di tempat',
  takeaway: 'Bawa pulang',
};

export const LABEL_METODE_BAYAR: Record<MetodeBayar, string> = {
  tunai: 'Tunai',
  qris: 'QRIS',
};

// ── Teks struk WhatsApp (`struk.md`, `layar-publik-auth.md` §7) ─────────────

export interface DataTeksStruk {
  nama_outlet: string;
  nomor_struk: string;
  waktu_transaksi: InputWaktu;
  tipe_pesanan: TipePesanan;
  metode_bayar: MetodeBayar;
  items: ReadonlyArray<{ nama_menu: string; qty: number; subtotal: number }>;
  total: number;
  uang_diterima: number | null;
  kembalian: number | null;
  /** Diisi bila transaksi dibatalkan (`struk.md` → Status). */
  dibatalkan_at?: InputWaktu | null;
  /** URL `/s/[token]` absolut; hanya bila transaksi sudah tersinkron. */
  url_struk?: string | null;
}

const LEBAR_TEKS_STRUK = 32;
const GARIS_STRUK = '-'.repeat(LEBAR_TEKS_STRUK);

function barisKiriKanan(kiri: string, kanan: string): string {
  const spasi = Math.max(1, LEBAR_TEKS_STRUK - kiri.length - kanan.length);
  return `${kiri}${' '.repeat(spasi)}${kanan}`;
}

/** Teks polos struk, satu item per baris, ditutup link bila sudah tersinkron. */
export function teksStruk(data: DataTeksStruk, tz: ZonaWaktu): string {
  const baris = [
    data.nama_outlet,
    `No. ${data.nomor_struk}`,
    `${tanggalJam(data.waktu_transaksi, tz)} · ${LABEL_TIPE_PESANAN[data.tipe_pesanan]}`,
  ];
  if (data.dibatalkan_at) baris.push(`DIBATALKAN ${tanggalJam(data.dibatalkan_at, tz)}`);
  baris.push(GARIS_STRUK);
  for (const item of data.items) {
    baris.push(barisKiriKanan(`${item.qty}x ${item.nama_menu}`, ribuan(item.subtotal)));
  }
  baris.push(GARIS_STRUK, barisKiriKanan('Total', rupiah(data.total)));
  if (data.metode_bayar === 'tunai' && data.uang_diterima !== null) {
    baris.push(barisKiriKanan('Tunai', rupiah(data.uang_diterima)));
    if (data.kembalian !== null) baris.push(barisKiriKanan('Kembalian', rupiah(data.kembalian)));
  } else {
    baris.push(barisKiriKanan(LABEL_METODE_BAYAR[data.metode_bayar], rupiah(data.total)));
  }
  baris.push('Terima kasih!');
  if (data.url_struk) baris.push(`Struk: ${data.url_struk}`);
  return baris.join('\n');
}

/** `https://wa.me/?text=…` atau ke nomor tertentu (`62…`, dari `normalisasiNomorWa`). */
export function urlWhatsApp(teks: string, nomor62?: string): string {
  return `https://wa.me/${nomor62 ?? ''}?text=${encodeURIComponent(teks)}`;
}

/**
 * Nomor WhatsApp pelanggan `08…`/`+62…` (10–15 digit, `struk.md`) → `62…`
 * untuk `wa.me`. `null` bila format tidak dikenali. Nomor tidak disimpan.
 */
export function normalisasiNomorWa(input: string): string | null {
  const bersih = input.replace(/[\s-]/g, '');
  if (!/^\+?\d+$/.test(bersih)) return null;
  const digitAsli = bersih.replace('+', '');
  if (digitAsli.length < MIN_DIGIT_WA || digitAsli.length > MAKS_DIGIT_WA) return null;
  if (bersih.startsWith('+62')) return digitAsli;
  if (bersih.startsWith('08')) return `62${bersih.slice(1)}`;
  return null;
}
