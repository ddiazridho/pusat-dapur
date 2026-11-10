import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import type { ZonaWaktu } from './schemas/enum';

/** Nomor struk `YYMMDD-XXXXXX-NNN` (FRD `struk.md` → Nomor Struk). */

/** Payload dari perangkat. */
export const POLA_NOMOR_STRUK_PERANGKAT = /^\d{6}-[0-9A-F]{6}-\d{3,}$/;
/** Nomor final tersimpan (boleh bersufiks bentrok `-2`, `-3`, …); sama dengan CHECK DB. */
export const POLA_NOMOR_STRUK_FINAL = /^\d{6}-[0-9A-F]{6}-\d{3,}(-\d+)?$/;

/** `YYMMDD` tanggal konfirmasi di zona outlet. */
export function prefiksTanggalStruk(waktu: Date | string | number, tz: ZonaWaktu): string {
  return format(new TZDate(new Date(waktu).getTime(), tz), 'yyMMdd');
}

/** 6 hex pertama `device_id`, huruf besar (tanda hubung UUID diabaikan). */
export function prefiksPerangkat(deviceId: string): string {
  const hex = deviceId.replace(/-/g, '').slice(0, 6).toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex)) throw new RangeError('device_id bukan UUID');
  return hex;
}

/**
 * Bentuk nomor struk. `urutan` = counter per perangkat per tanggal (mulai 1),
 * disimpan `client/offline/nomor-struk.ts`.
 */
export function buatNomorStruk(input: {
  waktu: Date | string | number;
  tz: ZonaWaktu;
  deviceId: string;
  urutan: number;
}): string {
  if (!Number.isInteger(input.urutan) || input.urutan < 1) throw new RangeError('urutan mulai 1');
  const nnn = String(input.urutan).padStart(3, '0');
  return `${prefiksTanggalStruk(input.waktu, input.tz)}-${prefiksPerangkat(input.deviceId)}-${nnn}`;
}

/** Nomor dengan sufiks bentrok berikutnya (server): `n` ≥ 2 → `…-014-2`. */
export function nomorStrukBersufiks(nomor: string, n: number): string {
  return `${nomor}-${n}`;
}
