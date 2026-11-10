import type { Satuan } from '../schemas/enum';

/** Template resep MVP (FRD `resep.md` → Daftar Template MVP). Data statis, persis FRD. */

export interface BahanTemplate {
  nama_bahan: string;
  satuan: Satuan;
  /** String desimal, format API kuantitas. */
  takaran: string;
}

export interface TemplateResep {
  kode: string;
  nama_menu: string;
  bahan: readonly BahanTemplate[];
}

const b = (nama_bahan: string, takaran: number, satuan: Satuan): BahanTemplate => ({
  nama_bahan,
  satuan,
  takaran: takaran.toFixed(3),
});

export const TEMPLATE_RESEP: readonly TemplateResep[] = [
  {
    kode: 'nasi-goreng',
    nama_menu: 'Nasi Goreng',
    bahan: [
      b('Nasi putih', 200, 'gram'),
      b('Telur ayam', 1, 'buah'),
      b('Kecap manis', 15, 'ml'),
      b('Minyak goreng', 15, 'ml'),
      b('Bawang merah', 10, 'gram'),
      b('Bawang putih', 5, 'gram'),
      b('Garam', 2, 'gram'),
    ],
  },
  {
    kode: 'mie-ayam',
    nama_menu: 'Mie Ayam',
    bahan: [
      b('Mie basah', 150, 'gram'),
      b('Daging ayam', 50, 'gram'),
      b('Sawi hijau', 30, 'gram'),
      b('Kecap manis', 10, 'ml'),
      b('Minyak goreng', 10, 'ml'),
      b('Bawang putih', 5, 'gram'),
    ],
  },
  {
    kode: 'mie-goreng-telur',
    nama_menu: 'Mie Goreng Telur',
    bahan: [
      b('Mi instan', 1, 'buah'),
      b('Telur ayam', 1, 'buah'),
      b('Sawi hijau', 20, 'gram'),
      b('Minyak goreng', 10, 'ml'),
    ],
  },
  {
    kode: 'nasi-telur-dadar',
    nama_menu: 'Nasi Telur Dadar',
    bahan: [
      b('Nasi putih', 200, 'gram'),
      b('Telur ayam', 2, 'buah'),
      b('Minyak goreng', 15, 'ml'),
      b('Garam', 1, 'gram'),
    ],
  },
  {
    kode: 'es-teh-manis',
    nama_menu: 'Es Teh Manis',
    bahan: [b('Teh celup', 1, 'buah'), b('Gula pasir', 20, 'gram'), b('Es batu', 150, 'gram')],
  },
  {
    kode: 'teh-manis-panas',
    nama_menu: 'Teh Manis Panas',
    bahan: [b('Teh celup', 1, 'buah'), b('Gula pasir', 20, 'gram')],
  },
  {
    kode: 'es-jeruk',
    nama_menu: 'Es Jeruk',
    bahan: [b('Jeruk peras', 2, 'buah'), b('Gula pasir', 20, 'gram'), b('Es batu', 150, 'gram')],
  },
  {
    kode: 'kopi-susu',
    nama_menu: 'Kopi Susu',
    bahan: [
      b('Kopi bubuk', 15, 'gram'),
      b('Susu kental manis', 30, 'ml'),
      b('Gula pasir', 10, 'gram'),
      b('Es batu', 150, 'gram'),
    ],
  },
];

export function cariTemplate(kode: string): TemplateResep | undefined {
  return TEMPLATE_RESEP.find((t) => t.kode === kode);
}

/** Kunci pencocokan bahan: nama trim + case-insensitive, satuan sama (`resep.md`). */
export function kunciBahan(nama: string): string {
  return nama.trim().toLowerCase();
}

/** `bahan_baku_id` outlet yang cocok (nama & satuan sama, tidak diarsipkan) atau `null`. */
export function cocokkanBahan(
  bahan: BahanTemplate,
  bahanOutlet: readonly { id: string; nama: string; satuan: Satuan }[],
): string | null {
  const kunci = kunciBahan(bahan.nama_bahan);
  return bahanOutlet.find((o) => kunciBahan(o.nama) === kunci && o.satuan === bahan.satuan)?.id ?? null;
}
