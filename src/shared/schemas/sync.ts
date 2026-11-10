import { z } from 'zod';
import { MAKS_PAYLOAD_GAGAL_BYTE, MAKS_PAYLOAD_LOG_CLIENT_BYTE } from '../konstanta';
import type { Satuan, ZonaWaktu } from './enum';
import { paginasiQuery, uuidV4Schema } from './umum';

/** FRD `offline-sync.md`; `api.md` → Sistem. */

const ukuranJson = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

/**
 * `POST /api/sync/gagal`: laporkan item antrean `gagal`. `payload` disimpan
 * apa adanya (bukan divalidasi sebagai transaksi, karena memang ditolak server).
 */
export const laporGagalSchema = z.strictObject({
  client_tx_id: uuidV4Schema,
  device_id: uuidV4Schema,
  payload: z
    .record(z.string(), z.unknown())
    .refine((v) => ukuranJson(v) <= MAKS_PAYLOAD_GAGAL_BYTE, 'Payload terlalu besar'),
  pesan_error: z.string().trim().min(1, 'Pesan error wajib diisi').max(1000),
});
export type LaporGagalPayload = z.infer<typeof laporGagalSchema>;

export const daftarGagalQuery = z.strictObject({ ...paginasiQuery });

/**
 * `PATCH /api/sync/gagal/[id]`: hanya tandai ditangani.
 * ponytail: bentuk body tidak dirinci FRD; `{ ditangani: true }` dipilih minimal (pola `tandaiAlertSchema`).
 */
export const tandaiGagalSchema = z.strictObject({ ditangani: z.literal(true) });

/** Pola route tanpa parameter, mis. `/struk/[clientTxId]`; tanpa query/hash. */
const POLA_ROUTE = /^\/[A-Za-z0-9_\-/[\]]*$/;
/** Path struk berparameter nyata (`/s/abc`, `/struk/uuid`) membocorkan token/ID transaksi. */
const PATH_STRUK_NYATA = /^\/(s|struk)\/(?!\[)/;

/**
 * `POST /api/log-client`: payload ≤ 4 KB, tanpa data struk (`infra-operasional.md`).
 * ponytail: field tidak dirinci dokumen; dipilih minimal `{ pesan, stack?, url }`.
 */
export const logClientSchema = z
  .strictObject({
    pesan: z.string().max(1000),
    stack: z.string().max(3000).optional(),
    /** Client wajib mengirim pola route Next (`/struk/[clientTxId]`), bukan URL aktual. */
    url: z
      .string()
      .max(500)
      .regex(POLA_ROUTE, 'Kirim pola route tanpa parameter')
      .refine((u) => !PATH_STRUK_NYATA.test(u), 'Kirim pola route tanpa parameter'),
  })
  .refine((v) => ukuranJson(v) <= MAKS_PAYLOAD_LOG_CLIENT_BYTE, 'Payload terlalu besar');
export type LogClientPayload = z.infer<typeof logClientSchema>;

// ── Respons ─────────────────────────────────────────────────────────────────

/** `GET /api/sync/snapshot`: tanpa field biaya untuk semua peran. */
export interface SnapshotResponse {
  outlet: { nama_outlet: string; zona_waktu: ZonaWaktu; blokir_stok_kurang: boolean };
  menu: { id: string; nama: string; harga_jual: number; foto_url: string | null; jumlah_terjual_7_hari: number }[];
  resep: { menu_id: string; bahan_baku_id: string; takaran: string }[];
  bahan: { id: string; nama: string; satuan: Satuan; stok_saat_ini: string }[];
  waktu_server: string;
}

export interface TransaksiGagalResponse {
  id: string;
  client_tx_id: string;
  device_id: string;
  nama_pengguna: string;
  payload: Record<string, unknown>;
  pesan_error: string;
  created_at: string;
  ditangani_at: string | null;
  ditangani_otomatis: boolean;
}
