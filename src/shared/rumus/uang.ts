import { PECAHAN_UANG_CEPAT } from '../konstanta';
import { bagiBulat } from './desimal';

/** Uang integer Rupiah (NFR-01): total, kembalian, uang cepat, metrik laporan. */

export interface ItemHarga {
  harga_jual: number;
  qty: number;
}

/** Σ harga_jual × qty, tanpa diskon/pajak (`pos.md`). */
export function hitungTotal(items: readonly ItemHarga[]): number {
  return items.reduce((t, i) => t + i.harga_jual * i.qty, 0);
}

/** `uang_diterima − total` untuk tunai; `null` untuk QRIS atau uang kurang. */
export function hitungKembalian(total: number, uangDiterima: number | null): number | null {
  if (uangDiterima === null || uangDiterima < total) return null;
  return uangDiterima - total;
}

/** "Uang pas" (= total) lalu pecahan Rp10rb/20rb/50rb/100rb yang > total (`pos.md`). */
export function pilihanUangCepat(total: number): number[] {
  return [total, ...PECAHAN_UANG_CEPAT.filter((p) => p > total)];
}

/** Persen 1 desimal half-up dari pecahan integer; `null` bila penyebut 0. */
export function persenDari(pembilang: number, penyebut: number): number | null {
  if (penyebut === 0) return null;
  return Number(bagiBulat(BigInt(pembilang) * 1000n, BigInt(penyebut))) / 10;
}

/** `laba_kotor / total_penjualan × 100` (`laporan.md`); `null` jika penjualan 0. */
export function marginKotorPersen(labaKotor: number, totalPenjualan: number): number | null {
  return persenDari(labaKotor, totalPenjualan);
}

/** `perubahan_persen` metrik terhadap pembanding; `null` jika pembanding 0 (`laporan.md`). */
export function perubahanPersen(sekarang: number, pembanding: number): number | null {
  return persenDari(sekarang - pembanding, pembanding);
}

/** `total_penjualan / jumlah_transaksi` dibulatkan ke Rupiah; 0 bila tanpa transaksi. */
export function rataRataTransaksi(totalPenjualan: number, jumlahTransaksi: number): number {
  if (jumlahTransaksi === 0) return 0;
  return Number(bagiBulat(BigInt(totalPenjualan), BigInt(jumlahTransaksi)));
}
