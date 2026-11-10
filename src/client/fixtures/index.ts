import { hitungHpp, turunanMenu } from '@/shared/rumus/hpp';
import { statusStok } from '@/shared/rumus/stok';
import type {
  BahanResponse,
  DetailTransaksiResponse,
  KasirResponse,
  MenuResponse,
  PengaturanResponse,
  Peran,
  Satuan,
  SnapshotResponse,
} from '@/shared/schemas';
import { TEMPLATE_RESEP } from '@/shared/templates/resep';

/** Bentuk store `profil` IndexedDB (`auth-akses.md` → Login); tipe resmi milik #5. */
interface ProfilFixture {
  user_id: string;
  outlet_id: string;
  peran: Peran;
  read_only: boolean;
  nama: string;
}

/**
 * Data contoh UI (model konten `docs/design/README.md` → Model Konten Demo).
 * Hanya untuk wireframe-first, katalog `/dev/komponen`, dan tes komponen.
 * Nilai turunan (HPP, margin, status) dihitung lewat rumus bersama agar konsisten.
 */

export const OUTLET_ID = '00000000-0000-4000-8000-000000000001';
export const ZONA = 'Asia/Jakarta' as const;
/** 10 Nov 2026 12.45 WIB. */
export const WAKTU_CONTOH = '2026-11-10T05:45:00.000Z';
export const DEVICE_ID = '3fa9c2d1-0b4e-4c8a-9f21-6a7d5e0c1b2a';
export const NOMOR_STRUK_CONTOH = '261110-3FA9C2-014';

export const pengaturan: PengaturanResponse = {
  nama_outlet: 'Warung Demo Pusat Dapur',
  zona_waktu: ZONA,
  ambang_margin: 20,
  blokir_stok_kurang: true,
  onboarding_selesai: true,
};

export const PENGGUNA = {
  pemilik: { id: '00000000-0000-4000-8000-0000000000a1', nama: 'Bu Sari' },
  dimas: { id: '00000000-0000-4000-8000-0000000000b1', nama: 'Dimas' },
  rina: { id: '00000000-0000-4000-8000-0000000000b2', nama: 'Rina' },
} as const;

export const profil: Record<'pemilik' | 'kasir' | 'demo', ProfilFixture> = {
  pemilik: { user_id: PENGGUNA.pemilik.id, outlet_id: OUTLET_ID, peran: 'pemilik', read_only: false, nama: 'Bu Sari' },
  kasir: { user_id: PENGGUNA.dimas.id, outlet_id: OUTLET_ID, peran: 'kasir', read_only: false, nama: 'Dimas' },
  demo: { user_id: PENGGUNA.pemilik.id, outlet_id: OUTLET_ID, peran: 'pemilik', read_only: true, nama: 'Bu Sari' },
};

export const kasir: KasirResponse[] = [
  {
    id: PENGGUNA.dimas.id,
    nama: 'Dimas',
    username: 'dimas',
    aktif: true,
    created_at: '2026-10-01T02:00:00.000Z',
    login_terakhir_at: '2026-11-10T00:05:00.000Z',
  },
  {
    id: PENGGUNA.rina.id,
    nama: 'Rina',
    username: 'rina',
    aktif: false,
    created_at: '2026-10-02T02:00:00.000Z',
    login_terakhir_at: null,
  },
];

// ── Bahan: 17 bahan unik dari 8 template (`akun-demo.md`) ───────────────────

interface BahanSeed {
  stok: string;
  min: string;
  harga: string;
}

/** Stok, batas minimum, harga beli per satuan contoh; mencakup status Habis/Menipis/Aman dan harga 0. */
const SEED_BAHAN: Record<string, BahanSeed> = {
  'Nasi putih': { stok: '12400.000', min: '2000.000', harga: '14.00' },
  'Telur ayam': { stok: '0.000', min: '10.000', harga: '2000.00' },
  'Kecap manis': { stok: '850.000', min: '200.000', harga: '0.00' },
  'Minyak goreng': { stok: '1850.000', min: '1000.000', harga: '18.00' },
  'Bawang merah': { stok: '400.000', min: '250.000', harga: '40.00' },
  'Bawang putih': { stok: '300.000', min: '250.000', harga: '38.00' },
  Garam: { stok: '900.000', min: '100.000', harga: '6.00' },
  'Mie basah': { stok: '3000.000', min: '1000.000', harga: '16.00' },
  'Daging ayam': { stok: '1500.000', min: '1000.000', harga: '55.00' },
  'Sawi hijau': { stok: '450.000', min: '500.000', harga: '12.00' },
  'Mi instan': { stok: '24.000', min: '10.000', harga: '3200.00' },
  'Teh celup': { stok: '80.000', min: '20.000', harga: '250.00' },
  'Gula pasir': { stok: '300.000', min: '500.000', harga: '17.50' },
  'Es batu': { stok: '5000.000', min: '2000.000', harga: '1.00' },
  'Jeruk peras': { stok: '30.000', min: '10.000', harga: '1500.00' },
  'Kopi bubuk': { stok: '500.000', min: '100.000', harga: '120.00' },
  'Susu kental manis': { stok: '1200.000', min: '370.000', harga: '30.00' },
};

function idBahan(i: number): string {
  return `00000000-0000-4000-8000-${String(1000 + i).padStart(12, '0')}`;
}

const bahanUnik = new Map<string, Satuan>();
for (const t of TEMPLATE_RESEP) for (const b of t.bahan) bahanUnik.set(b.nama_bahan, b.satuan);

/** Bahan versi pemilik (dengan harga). */
export const bahan: BahanResponse[] = [...bahanUnik].map(([nama, satuan], i) => {
  const seed = SEED_BAHAN[nama]!;
  return {
    id: idBahan(i),
    nama,
    satuan,
    stok_saat_ini: seed.stok,
    threshold_min: seed.min,
    status_stok: statusStok(seed.stok, seed.min),
    dipakai_di_menu: TEMPLATE_RESEP.filter((t) => t.bahan.some((b) => b.nama_bahan === nama)).length,
    diarsipkan_at: null,
    harga_beli_per_satuan: seed.harga,
  };
});

/** Bahan versi kasir: field biaya tidak ada (bukan disembunyikan). */
export const bahanKasir: BahanResponse[] = bahan.map((b) => {
  const salinan = { ...b };
  delete salinan.harga_beli_per_satuan;
  return salinan;
});

const bahanPerNama = new Map(bahan.map((b) => [b.nama, b]));

// ── Menu: 8 dari template (`docs/design/README.md`) ─────────────────────────

const HARGA_MENU: Record<string, { harga: number; terjual: number; aktif?: boolean }> = {
  'nasi-goreng': { harga: 15_000, terjual: 64 },
  'mie-ayam': { harga: 13_000, terjual: 41 },
  'mie-goreng-telur': { harga: 12_000, terjual: 33 },
  'nasi-telur-dadar': { harga: 10_000, terjual: 28 },
  'es-teh-manis': { harga: 4_000, terjual: 92 },
  'teh-manis-panas': { harga: 3_000, terjual: 17 },
  'es-jeruk': { harga: 6_000, terjual: 25, aktif: false },
  'kopi-susu': { harga: 8_000, terjual: 39 },
};

export const menu: MenuResponse[] = TEMPLATE_RESEP.map((t, i) => {
  const info = HARGA_MENU[t.kode]!;
  const resep = t.bahan.map((b) => ({
    harga_beli_per_satuan: bahanPerNama.get(b.nama_bahan)!.harga_beli_per_satuan!,
    takaran: b.takaran,
  }));
  const hpp = hitungHpp(resep);
  return {
    id: `00000000-0000-4000-8000-${String(2000 + i).padStart(12, '0')}`,
    nama: t.nama_menu,
    harga_jual: info.harga,
    foto_url: null,
    aktif: info.aktif ?? true,
    hpp_cached: hpp,
    jumlah_terjual_7_hari: info.terjual,
    ...turunanMenu({
      harga_jual: info.harga,
      hpp_cached: hpp,
      ambang_margin: pengaturan.ambang_margin,
      resep_kosong: false,
      hpp_belum_lengkap: resep.some((r) => Number(r.harga_beli_per_satuan) === 0),
    }),
  };
});

/** Snapshot kasir (tanpa field biaya). */
export const snapshot: SnapshotResponse = {
  outlet: { nama_outlet: pengaturan.nama_outlet, zona_waktu: ZONA, blokir_stok_kurang: true },
  menu: menu
    .filter((m) => m.aktif)
    .map(({ id, nama, harga_jual, foto_url, jumlah_terjual_7_hari }) => ({
      id,
      nama,
      harga_jual,
      foto_url,
      jumlah_terjual_7_hari,
    })),
  resep: TEMPLATE_RESEP.flatMap((t, i) =>
    t.bahan.map((b) => ({
      menu_id: menu[i]!.id,
      bahan_baku_id: bahanPerNama.get(b.nama_bahan)!.id,
      takaran: b.takaran,
    })),
  ),
  bahan: bahan.map(({ id, nama, satuan, stok_saat_ini }) => ({ id, nama, satuan, stok_saat_ini })),
  waktu_server: WAKTU_CONTOH,
};

/** Struk contoh wireframe: Nasi Goreng ×2 + Es Teh Manis ×3, tunai Rp50.000. */
export const transaksiContoh: DetailTransaksiResponse = {
  id: '00000000-0000-4000-8000-000000003001',
  client_tx_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  nomor_struk: NOMOR_STRUK_CONTOH,
  token_struk: 'q1w2e3r4t5y6u7i8o9p0aZ',
  nama_outlet: pengaturan.nama_outlet,
  waktu_transaksi: WAKTU_CONTOH,
  created_at: WAKTU_CONTOH,
  status: 'selesai',
  tipe_pesanan: 'dine_in',
  metode_bayar: 'tunai',
  total: 42_000,
  uang_diterima: 50_000,
  kembalian: 8_000,
  nama_kasir: 'Dimas',
  dibuat_offline: false,
  koreksi_stok: false,
  items: [
    { menu_id: menu[0]!.id, nama_menu: 'Nasi Goreng', qty: 2, harga_jual: 15_000, subtotal: 30_000 },
    { menu_id: menu[4]!.id, nama_menu: 'Es Teh Manis', qty: 3, harga_jual: 4_000, subtotal: 12_000 },
  ],
  dibatalkan_at: null,
  dibatalkan_oleh_nama: null,
  alasan_batal: null,
  catatan_batal: null,
};
