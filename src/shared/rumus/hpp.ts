import { KELIPATAN_HARGA_MINIMUM, MAKS_HARGA_JUAL } from '../konstanta';
import { bagiAtas, bagiBulat, dariSkala, keSkala, type InputDesimal } from './desimal';

/**
 * Rumus HPP & margin (FRD `hpp-margin.md`, PRD BR-01/BR-02). Murni, dipakai
 * pratinjau client, serializer server, dan cek invarian. Semua eksak (bigint).
 */

export interface BarisResepHpp {
  harga_beli_per_satuan: InputDesimal;
  takaran: InputDesimal;
}

/** Σ (harga_beli_per_satuan × takaran), half-up 2 desimal → string `"4800.00"`. */
export function hitungHpp(resep: readonly BarisResepHpp[]): string {
  // harga skala 2 × takaran skala 3 = skala 5; jumlah dulu lalu bulatkan (sama dengan SQL).
  let total = 0n;
  for (const r of resep) total += keSkala(r.harga_beli_per_satuan, 2) * keSkala(r.takaran, 3);
  return dariSkala(bagiBulat(total, 1000n), 2);
}

/** Ada bahan resep dengan harga beli 0. */
export function hppBelumLengkap(resep: readonly Pick<BarisResepHpp, 'harga_beli_per_satuan'>[]): boolean {
  return resep.some((r) => keSkala(r.harga_beli_per_satuan, 2) === 0n);
}

/**
 * (harga_jual − hpp) / harga_jual × 100, half-up 1 desimal; boleh negatif.
 * Menu tanpa resep → `null` (FRD `menu.md`), ditangani `turunanMenu`.
 */
export function marginPersen(hargaJual: number, hpp: InputDesimal): number {
  const harga = BigInt(hargaJual);
  if (harga <= 0n) throw new RangeError('harga_jual harus > 0');
  const hppSen = keSkala(hpp, 2);
  // (100·H − hpp_sen) / H = persen; ×10 untuk 1 desimal.
  return Number(bagiBulat((harga * 100n - hppSen) * 10n, harga)) / 10;
}

export function marginRendah(margin: number | null, ambangMargin: number): boolean {
  return margin !== null && margin < ambangMargin;
}

/**
 * ceil(hpp / (1 − ambang/100)) lalu naik ke kelipatan Rp500.
 * `null` jika ambang 100, resep kosong, atau hasil > batas harga jual.
 */
export function hargaJualMinimum(
  hpp: InputDesimal,
  ambangMargin: number,
  resepKosong: boolean,
): number | null {
  if (resepKosong || ambangMargin >= 100) return null;
  const hppSen = keSkala(hpp, 2);
  // hpp_rp / (1 − a/100) = hpp_sen / (100 − a)
  const minimal = bagiAtas(hppSen, BigInt(100 - ambangMargin));
  const kelipatan = BigInt(KELIPATAN_HARGA_MINIMUM);
  const hasil = bagiAtas(minimal, kelipatan) * kelipatan;
  return hasil > BigInt(MAKS_HARGA_JUAL) ? null : Number(hasil);
}

export interface TurunanMenu {
  margin_persen: number | null;
  margin_rendah: boolean;
  resep_kosong: boolean;
  hpp_belum_lengkap: boolean;
  harga_jual_minimum: number | null;
}

/** Field turunan respons menu pemilik (`menu.md` → Field Turunan). */
export function turunanMenu(input: {
  harga_jual: number;
  hpp_cached: InputDesimal;
  ambang_margin: number;
  resep_kosong: boolean;
  hpp_belum_lengkap: boolean;
}): TurunanMenu {
  const margin = input.resep_kosong ? null : marginPersen(input.harga_jual, input.hpp_cached);
  return {
    margin_persen: margin,
    margin_rendah: marginRendah(margin, input.ambang_margin),
    resep_kosong: input.resep_kosong,
    hpp_belum_lengkap: input.hpp_belum_lengkap,
    harga_jual_minimum: hargaJualMinimum(input.hpp_cached, input.ambang_margin, input.resep_kosong),
  };
}

/** Pratinjau resep di form (`resep.md`): HPP + turunan dari harga bahan yang dimuat. */
export function pratinjauResep(
  resep: readonly BarisResepHpp[],
  hargaJual: number,
  ambangMargin: number,
): TurunanMenu & { hpp_cached: string } {
  const hpp = hitungHpp(resep);
  return {
    hpp_cached: hpp,
    ...turunanMenu({
      harga_jual: hargaJual,
      hpp_cached: hpp,
      ambang_margin: ambangMargin,
      resep_kosong: resep.length === 0,
      hpp_belum_lengkap: hppBelumLengkap(resep),
    }),
  };
}
