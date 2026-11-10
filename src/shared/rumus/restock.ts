import { AMBANG_PERUBAHAN_HARGA_PERSEN, DIGIT_HARGA_SATUAN, DIGIT_KUANTITAS, MAKS_HARGA_BELI } from '../konstanta';
import type { Satuan, SatuanInput } from '../schemas/enum';
import { bagiBulat, dariSkala, keSkala, type InputDesimal } from './desimal';

/** Konversi restock (FRD `restock.md` → Konversi, PRD BR-04). */

/** Satuan input yang boleh per satuan bahan. */
export const SATUAN_INPUT_PER_SATUAN: Record<Satuan, readonly SatuanInput[]> = {
  gram: ['gram', 'kg'],
  ml: ['ml', 'liter'],
  buah: ['buah'],
};

export function satuanInputCocok(satuanBahan: Satuan, satuanInput: SatuanInput): boolean {
  return SATUAN_INPUT_PER_SATUAN[satuanBahan].includes(satuanInput);
}

export type HasilKonversiRestock =
  | { ok: true; jumlah: string; harga_beli_per_satuan: string }
  /** `field` = kunci `detail` 422 `VALIDASI_GAGAL` (`api.md`). */
  | { ok: false; field: 'satuan_input' | 'total_harga'; pesan: string };

/**
 * `jumlah` = jumlah_input × 1000 untuk kg/liter; harga = total / jumlah,
 * half-up 2 desimal. Contoh FRD: 5 kg, Rp60.000 → 5000 gram, "12.00".
 */
export function konversiRestock(input: {
  jumlahInput: InputDesimal;
  satuanInput: SatuanInput;
  totalHarga: number;
  satuanBahan: Satuan;
}): HasilKonversiRestock {
  if (!satuanInputCocok(input.satuanBahan, input.satuanInput)) {
    return { ok: false, field: 'satuan_input', pesan: `Pilih satuan ${SATUAN_INPUT_PER_SATUAN[input.satuanBahan].join(' atau ')}` };
  }
  const faktor = input.satuanInput === 'kg' || input.satuanInput === 'liter' ? 1000n : 1n;
  const jumlahMilli = keSkala(input.jumlahInput, DIGIT_KUANTITAS) * faktor;
  if (jumlahMilli <= 0n) return { ok: false, field: 'total_harga', pesan: 'Jumlah harus lebih dari 0' };
  // harga_sen = total × 100 / (jumlahMilli / 1000)
  const hargaSen = bagiBulat(BigInt(input.totalHarga) * 100n * 1000n, jumlahMilli);
  if (hargaSen > BigInt(MAKS_HARGA_BELI) * 100n) {
    return { ok: false, field: 'total_harga', pesan: 'Harga per satuan lebih dari Rp10.000.000. Cek lagi angkanya' };
  }
  return {
    ok: true,
    jumlah: dariSkala(jumlahMilli, DIGIT_KUANTITAS),
    harga_beli_per_satuan: dariSkala(hargaSen, DIGIT_HARGA_SATUAN),
  };
}

/** (baru − lama) / lama × 100, half-up 1 desimal; `null` jika harga lama 0. */
export function perubahanHargaPersen(lama: InputDesimal, baru: InputDesimal): number | null {
  const l = keSkala(lama, DIGIT_HARGA_SATUAN);
  if (l === 0n) return null;
  const b = keSkala(baru, DIGIT_HARGA_SATUAN);
  return Number(bagiBulat((b - l) * 1000n, l)) / 10;
}

/** Peringatan "Harga berubah jauh, cek lagi angkanya" bila > +50% atau < −50%. */
export function hargaBerubahJauh(perubahan: number | null): boolean {
  return perubahan !== null && Math.abs(perubahan) > AMBANG_PERUBAHAN_HARGA_PERSEN;
}

export const PESAN_HARGA_BERUBAH_JAUH = 'Harga berubah jauh, cek lagi angkanya';
