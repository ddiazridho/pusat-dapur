import type { z } from 'zod';

/**
 * Semua kode error API (NFR-01, `docs/architecture/api.md` → Kode Error):
 * kode → status HTTP + pesan default Bahasa Indonesia. Dipakai server
 * (`AppError`) dan client (pesan fallback bila respons tanpa `pesan`).
 * Pesan umum mengikuti `docs/design/konten-aksesibilitas.md` §2.
 */
export const KODE_ERROR = {
  // Umum
  TIDAK_TERAUTENTIKASI: { status: 401, pesan: 'Sesi berakhir. Silakan masuk lagi.' },
  AKSES_DITOLAK: { status: 403, pesan: 'Halaman ini hanya untuk pemilik warung.' },
  READ_ONLY: { status: 403, pesan: 'Akun demo hanya bisa melihat, tidak bisa mengubah data.' },
  TIDAK_DITEMUKAN: { status: 404, pesan: 'Data tidak ditemukan atau sudah dihapus.' },
  VALIDASI_GAGAL: { status: 422, pesan: 'Periksa lagi isian yang ditandai.' },
  TERLALU_BANYAK_REQUEST: { status: 429, pesan: 'Terlalu banyak permintaan. Tunggu sebentar.' },
  KESALAHAN_SERVER: { status: 500, pesan: 'Gagal menyimpan. Data Anda belum berubah. Coba lagi.' },
  LAYANAN_TIDAK_TERSEDIA: { status: 503, pesan: 'Layanan sedang sibuk. Data Anda belum berubah. Coba lagi.' },

  // auth.md
  EMAIL_SUDAH_TERDAFTAR: { status: 409, pesan: 'Email ini sudah terdaftar.' },
  PASSWORD_LAMA_SALAH: { status: 422, pesan: 'Kata sandi lama salah.' },
  // akun-kasir.md
  USERNAME_SUDAH_ADA: { status: 409, pesan: 'Username sudah dipakai.' },
  KUOTA_KASIR_PENUH: { status: 409, pesan: 'Maksimal 3 akun kasir aktif.' },
  // bahan-baku.md
  NAMA_BAHAN_SUDAH_ADA: { status: 409, pesan: 'Nama bahan sudah ada.' },
  BAHAN_DIPAKAI_RESEP: { status: 409, pesan: 'Bahan masih dipakai di resep menu.' },
  // NFR-01, restock.md
  STOK_MELEBIHI_BATAS: { status: 422, pesan: 'Stok melebihi batas yang bisa dicatat.' },
  // menu.md
  NAMA_MENU_SUDAH_ADA: { status: 409, pesan: 'Nama menu sudah ada.' },
  // resep.md
  BAHAN_DUPLIKAT: { status: 422, pesan: 'Bahan yang sama dipilih lebih dari sekali.' },
  // pengurangan-stok.md, pos.md
  STOK_TIDAK_CUKUP: { status: 409, pesan: 'Stok bahan tidak cukup.' },
  HARGA_BERUBAH: { status: 409, pesan: 'Harga menu sudah berubah. Cek total baru.' },
  MENU_TIDAK_AKTIF: { status: 422, pesan: 'Menu sudah tidak dijual.' },
  UANG_KURANG: { status: 422, pesan: 'Uang diterima kurang dari total.' },
  // pembatalan-transaksi.md
  SUDAH_DIBATALKAN: { status: 409, pesan: 'Transaksi ini sudah dibatalkan.' },
  BATAS_PEMBATALAN_LEWAT: { status: 409, pesan: 'Transaksi hanya bisa dibatalkan di hari yang sama.' },
} as const satisfies Record<string, { status: number; pesan: string }>;

export type KodeError = keyof typeof KODE_ERROR;

export function isKodeError(kode: string): kode is KodeError {
  return Object.hasOwn(KODE_ERROR, kode);
}

export function statusKode(kode: KodeError): number {
  return KODE_ERROR[kode].status;
}

export function pesanKode(kode: KodeError): string {
  return KODE_ERROR[kode].pesan;
}

/**
 * Kode spesifik yang ditandai skema lewat `params.kode` (mis. `BAHAN_DUPLIKAT`,
 * `resep.md` langkah 1). Selain itu semua pelanggaran Zod = `VALIDASI_GAGAL`.
 */
export const PARAM_KODE = 'kode';

export function kodeDariZod(error: z.ZodError): KodeError {
  for (const issue of error.issues) {
    if (issue.code !== 'custom') continue;
    const kode = (issue.params as Record<string, unknown> | undefined)?.[PARAM_KODE];
    if (typeof kode === 'string' && isKodeError(kode)) return kode;
  }
  return 'VALIDASI_GAGAL';
}

/** `detail` 422 `VALIDASI_GAGAL`: `{ "<field>": "<pesan>" }` (api.md). */
export type DetailValidasi = Record<string, string>;

/**
 * Ubah error Zod ke `detail` 422. Path bersarang digabung titik (`items.0.qty`);
 * issue tanpa path (mis. kunci tak dikenal `.strict()`) memakai nama kuncinya,
 * sehingga `outlet_id` di body → `{ outlet_id: "Field tidak dikenal" }`.
 * Hanya pesan pertama per field yang disimpan.
 */
export function detailDariZod(error: z.ZodError): DetailValidasi {
  const detail: DetailValidasi = {};
  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      const awalan = issue.path.length ? `${issue.path.join('.')}.` : '';
      for (const kunci of issue.keys) detail[`${awalan}${kunci}`] ??= 'Field tidak dikenal';
      continue;
    }
    const field = issue.path.length ? issue.path.join('.') : '_';
    detail[field] ??= issue.message;
  }
  return detail;
}
