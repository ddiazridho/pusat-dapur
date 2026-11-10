import { z } from 'zod';

/** Enum domain (`docs/architecture/data-model.md` → Enum). */

export const PERAN = ['pemilik', 'kasir'] as const;
export const ZONA_WAKTU = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
export const SATUAN = ['gram', 'ml', 'buah'] as const;
export const SATUAN_INPUT = ['gram', 'kg', 'ml', 'liter', 'buah'] as const;
export const TIPE_PESANAN = ['dine_in', 'takeaway'] as const;
export const METODE_BAYAR = ['tunai', 'qris'] as const;
export const STATUS_TRANSAKSI = ['selesai', 'dibatalkan'] as const;
export const ALASAN_BATAL = ['salah_input', 'pelanggan_batal', 'lainnya'] as const;
export const JENIS_MUTASI = [
  'stok_awal',
  'penjualan',
  'restock',
  'opname',
  'koreksi_sync',
  'pembatalan',
] as const;
export const SUMBER_HARGA = ['awal', 'restock', 'koreksi'] as const;
export const ALASAN_OPNAME = ['susut', 'tumpah_rusak', 'salah_catat', 'lainnya'] as const;
export const JENIS_ALERT = ['stok_menipis', 'stok_tidak_sinkron'] as const;
/** Turunan, tidak disimpan (`bahan-baku.md` → Status Stok). Urutan = urutan default daftar. */
export const STATUS_STOK = ['habis', 'menipis', 'aman'] as const;
/** Lokal perangkat saja (`offline-sync.md`). */
export const STATUS_SYNC = ['pending', 'synced', 'gagal'] as const;
export const PERIODE_LAPORAN = ['hari_ini', '7_hari', '30_hari'] as const;
export const URUT_MENU = ['nama', 'margin_persen', 'jumlah_terjual_7_hari'] as const;

export type Peran = (typeof PERAN)[number];
export type ZonaWaktu = (typeof ZONA_WAKTU)[number];
export type Satuan = (typeof SATUAN)[number];
export type SatuanInput = (typeof SATUAN_INPUT)[number];
export type TipePesanan = (typeof TIPE_PESANAN)[number];
export type MetodeBayar = (typeof METODE_BAYAR)[number];
export type StatusTransaksi = (typeof STATUS_TRANSAKSI)[number];
export type AlasanBatal = (typeof ALASAN_BATAL)[number];
export type JenisMutasi = (typeof JENIS_MUTASI)[number];
export type SumberHarga = (typeof SUMBER_HARGA)[number];
export type AlasanOpname = (typeof ALASAN_OPNAME)[number];
export type JenisAlert = (typeof JENIS_ALERT)[number];
export type StatusStok = (typeof STATUS_STOK)[number];
export type StatusSync = (typeof STATUS_SYNC)[number];
export type PeriodeLaporan = (typeof PERIODE_LAPORAN)[number];
export type UrutMenu = (typeof URUT_MENU)[number];

const pesanPilihan = { error: 'Pilih salah satu opsi yang tersedia' };

export const peranSchema = z.enum(PERAN, pesanPilihan);
export const zonaWaktuSchema = z.enum(ZONA_WAKTU, pesanPilihan);
export const satuanSchema = z.enum(SATUAN, pesanPilihan);
export const satuanInputSchema = z.enum(SATUAN_INPUT, pesanPilihan);
export const tipePesananSchema = z.enum(TIPE_PESANAN, pesanPilihan);
export const metodeBayarSchema = z.enum(METODE_BAYAR, pesanPilihan);
export const statusTransaksiSchema = z.enum(STATUS_TRANSAKSI, pesanPilihan);
export const alasanBatalSchema = z.enum(ALASAN_BATAL, pesanPilihan);
export const jenisMutasiSchema = z.enum(JENIS_MUTASI, pesanPilihan);
export const sumberHargaSchema = z.enum(SUMBER_HARGA, pesanPilihan);
export const alasanOpnameSchema = z.enum(ALASAN_OPNAME, pesanPilihan);
export const jenisAlertSchema = z.enum(JENIS_ALERT, pesanPilihan);
export const statusStokSchema = z.enum(STATUS_STOK, pesanPilihan);
export const periodeLaporanSchema = z.enum(PERIODE_LAPORAN, pesanPilihan);
export const urutMenuSchema = z.enum(URUT_MENU, pesanPilihan);
