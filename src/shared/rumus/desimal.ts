/**
 * Aritmetika desimal eksak berbasis `bigint` berskala (tanpa float).
 *
 * API mengirim kuantitas, harga per satuan, dan HPP sebagai string desimal
 * (`"200.000"`, `"14.00"`; `docs/architecture/api.md`). Semua rumus bersama
 * bekerja di atas bilangan bulat berskala agar hasil client sama persis dengan
 * server (`numeric` Postgres, pembulatan half-up, NFR-01).
 */

const POLA_DESIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;

/** Objek mirip `Prisma.Decimal` (cukup punya `toFixed`); adaptor tanpa impor server. */
export interface DesimalLike {
  toFixed(digit: number): string;
}

export type InputDesimal = string | number | bigint | DesimalLike;

function keString(nilai: InputDesimal, skala: number): string {
  if (typeof nilai === 'string') return nilai.trim();
  if (typeof nilai === 'bigint') return nilai.toString();
  if (typeof nilai === 'number') {
    if (!Number.isFinite(nilai)) throw new RangeError(`Bukan angka hingga: ${nilai}`);
    // toFixed membulatkan representasi biner; skala+2 digit cukup untuk input yang
    // memang berasal dari desimal pendek (mis. 0.5, 14.25).
    return nilai.toFixed(Math.min(skala + 2, 20));
  }
  return nilai.toFixed(skala + 2);
}

/** Bagi bilangan bulat dengan pembulatan half-up (menjauhi nol), seperti `ROUND` Postgres. */
export function bagiBulat(pembilang: bigint, penyebut: bigint): bigint {
  if (penyebut === 0n) throw new RangeError('Pembagian dengan nol');
  const negatif = pembilang < 0n !== penyebut < 0n;
  const a = pembilang < 0n ? -pembilang : pembilang;
  const b = penyebut < 0n ? -penyebut : penyebut;
  const hasil = (a * 2n + b) / (b * 2n);
  return negatif ? -hasil : hasil;
}

/** Bagi bilangan bulat non-negatif dengan pembulatan ke atas. */
export function bagiAtas(pembilang: bigint, penyebut: bigint): bigint {
  if (penyebut <= 0n || pembilang < 0n) throw new RangeError('bagiAtas hanya untuk nilai non-negatif');
  return (pembilang + penyebut - 1n) / penyebut;
}

/**
 * Ubah desimal ke bilangan bulat berskala `10^skala`, dibulatkan half-up bila
 * digit pecahan lebih panjang dari skala. `keSkala("14.5", 2) === 1450n`.
 */
export function keSkala(nilai: InputDesimal, skala: number): bigint {
  const teks = keString(nilai, skala);
  const cocok = POLA_DESIMAL.exec(teks);
  if (!cocok) throw new RangeError(`Format desimal tidak dikenali: "${teks}"`);
  const [, minus, bulat = '0', pecahan = ''] = cocok;
  const digit = BigInt(bulat + pecahan.padEnd(skala, '0').slice(0, skala));
  let hasil = digit;
  if (pecahan.length > skala) {
    const sisa = pecahan.slice(skala);
    if (sisa[0] !== undefined && sisa[0] >= '5') hasil += 1n;
  }
  return minus ? -hasil : hasil;
}

/** Bilangan bulat berskala → string desimal dengan tepat `skala` digit pecahan. */
export function dariSkala(nilai: bigint, skala: number): string {
  const negatif = nilai < 0n;
  const abs = negatif ? -nilai : nilai;
  const teks = abs.toString().padStart(skala + 1, '0');
  const bulat = teks.slice(0, teks.length - skala);
  const pecahan = teks.slice(teks.length - skala);
  const isi = skala > 0 ? `${bulat}.${pecahan}` : bulat;
  return negatif ? `-${isi}` : isi;
}

/** Jumlah digit pecahan pada string desimal (`"1.250"` → 3). */
export function jumlahDigitPecahan(teks: string): number {
  const titik = teks.indexOf('.');
  return titik === -1 ? 0 : teks.length - titik - 1;
}
