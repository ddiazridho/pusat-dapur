import { DIGIT_KUANTITAS } from '../konstanta';
import { kuantitas as formatKuantitas } from '../format';
import type { Satuan, StatusStok } from '../schemas/enum';
import { dariSkala, keSkala, type InputDesimal } from './desimal';

/**
 * Keputusan stok (FRD `pengurangan-stok.md` → Keputusan Saat Stok Kurang,
 * PRD BR-06/BR-07). Inti bekerja di milli-unit `bigint`; adaptor menerima
 * milli-unit `number` (client, ADR-09) atau Decimal/string (server).
 */

// ── Milli-unit (ADR-09) ─────────────────────────────────────────────────────

/** `"200.000"` / Decimal → 200000. Aman: MAKS_STOK_MILLI < 2⁵³. */
export function keMilli(nilai: InputDesimal): number {
  return Number(keSkala(nilai, DIGIT_KUANTITAS));
}

/** 200000 → `"200.000"` (format API). */
export function dariMilli(milli: number | bigint): string {
  return dariSkala(BigInt(milli), DIGIT_KUANTITAS);
}

// ── Status stok (`bahan-baku.md`) ───────────────────────────────────────────

export function statusStok(stok: InputDesimal, thresholdMin: InputDesimal): StatusStok {
  const s = keSkala(stok, DIGIT_KUANTITAS);
  if (s <= 0n) return 'habis';
  return s < keSkala(thresholdMin, DIGIT_KUANTITAS) ? 'menipis' : 'aman';
}

// ── Kebutuhan bahan ─────────────────────────────────────────────────────────

export interface ItemKebutuhan {
  menu_id: string;
  qty: number;
}

export interface ResepKebutuhan<T> {
  menu_id: string;
  bahan_baku_id: string;
  takaran: T;
}

function kebutuhanInti(
  items: readonly ItemKebutuhan[],
  resep: readonly ResepKebutuhan<bigint>[],
): Map<string, bigint> {
  const qtyPerMenu = new Map<string, bigint>();
  for (const i of items) qtyPerMenu.set(i.menu_id, (qtyPerMenu.get(i.menu_id) ?? 0n) + BigInt(i.qty));
  const hasil = new Map<string, bigint>();
  for (const r of resep) {
    const qty = qtyPerMenu.get(r.menu_id);
    if (!qty) continue;
    hasil.set(r.bahan_baku_id, (hasil.get(r.bahan_baku_id) ?? 0n) + qty * r.takaran);
  }
  return hasil;
}

/** Kebutuhan per bahan (milli-unit number) = Σ qty × takaran; menu tanpa resep tidak mengurangi. */
export function hitungKebutuhanMilli(
  items: readonly ItemKebutuhan[],
  resep: readonly ResepKebutuhan<number>[],
): Map<string, number> {
  const inti = kebutuhanInti(
    items,
    resep.map((r) => ({ ...r, takaran: BigInt(r.takaran) })),
  );
  return new Map([...inti].map(([k, v]) => [k, Number(v)]));
}

/** Varian server: takaran Decimal/string → kebutuhan string desimal 3 digit. */
export function hitungKebutuhanDesimal(
  items: readonly ItemKebutuhan[],
  resep: readonly ResepKebutuhan<InputDesimal>[],
): Map<string, string> {
  const inti = kebutuhanInti(
    items,
    resep.map((r) => ({ ...r, takaran: keSkala(r.takaran, DIGIT_KUANTITAS) })),
  );
  return new Map([...inti].map(([k, v]) => [k, dariMilli(v)]));
}

// ── Tabel keputusan ─────────────────────────────────────────────────────────

export interface Kekurangan<T> {
  bahan_baku_id: string;
  dibutuhkan: T;
  tersedia: T;
  kekurangan: T;
}

export interface KeputusanStok<T> {
  /** `true` → 409 `STOK_TIDAK_CUKUP` online / tolak di perangkat. */
  ditolak: boolean;
  /** Semua bahan yang kurang (urut `bahan_baku_id`), untuk pesan & `detail.kekurangan[]`. */
  kekurangan: Kekurangan<T>[];
  /** Bahan yang dikoreksi ke 0 bila diterima (kosong bila ditolak). */
  koreksi: Kekurangan<T>[];
}

export interface InputPutuskanStok<T> {
  dibuatOffline: boolean;
  blokir: boolean;
  /** Kebutuhan per `bahan_baku_id`. */
  kebutuhan: ReadonlyMap<string, T> | Readonly<Record<string, T>>;
  /** Stok saat ini per `bahan_baku_id`; bahan tanpa entri dianggap 0. */
  stok: ReadonlyMap<string, T> | Readonly<Record<string, T>>;
}

function entri<T>(m: ReadonlyMap<string, T> | Readonly<Record<string, T>>): [string, T][] {
  return m instanceof Map ? [...m.entries()] : Object.entries(m as Record<string, T>);
}

function ambil<T>(m: ReadonlyMap<string, T> | Readonly<Record<string, T>>, k: string): T | undefined {
  return m instanceof Map ? m.get(k) : (m as Record<string, T>)[k];
}

function putuskanInti(input: InputPutuskanStok<bigint>): KeputusanStok<bigint> {
  const kekurangan: Kekurangan<bigint>[] = [];
  for (const [id, butuh] of entri(input.kebutuhan).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const ada = ambil(input.stok, id) ?? 0n;
    if (ada < butuh) {
      kekurangan.push({ bahan_baku_id: id, dibutuhkan: butuh, tersedia: ada, kekurangan: butuh - ada });
    }
  }
  // Tabel FRD: tanpa kekurangan → diterima; online + blokir → ditolak; selain itu koreksi.
  const ditolak = kekurangan.length > 0 && !input.dibuatOffline && input.blokir;
  return { ditolak, kekurangan, koreksi: ditolak ? [] : kekurangan };
}

function petakan<A, B>(k: KeputusanStok<A>, f: (a: A) => B): KeputusanStok<B> {
  const m = (x: Kekurangan<A>): Kekurangan<B> => ({
    bahan_baku_id: x.bahan_baku_id,
    dibutuhkan: f(x.dibutuhkan),
    tersedia: f(x.tersedia),
    kekurangan: f(x.kekurangan),
  });
  return { ditolak: k.ditolak, kekurangan: k.kekurangan.map(m), koreksi: k.koreksi.map(m) };
}

function konversiMap<A>(
  m: ReadonlyMap<string, A> | Readonly<Record<string, A>>,
  f: (a: A) => bigint,
): Map<string, bigint> {
  return new Map(entri(m).map(([k, v]) => [k, f(v)]));
}

/** Client: milli-unit `number` (stok lokal efektif, snapshot). */
export function putuskanStok(input: InputPutuskanStok<number>): KeputusanStok<number> {
  const k = putuskanInti({
    ...input,
    kebutuhan: konversiMap(input.kebutuhan, BigInt),
    stok: konversiMap(input.stok, BigInt),
  });
  return petakan(k, Number);
}

/** Server: `Prisma.Decimal`/string → hasil string desimal 3 digit (`"3.000"`). */
export function putuskanStokDesimal(input: InputPutuskanStok<InputDesimal>): KeputusanStok<string> {
  const ke = (v: InputDesimal) => keSkala(v, DIGIT_KUANTITAS);
  const k = putuskanInti({
    ...input,
    kebutuhan: konversiMap(input.kebutuhan, ke),
    stok: konversiMap(input.stok, ke),
  });
  return petakan(k, dariMilli);
}

/** Stok setelah penjualan = max(0, stok − kebutuhan) (langkah 6). */
export function stokSetelahPenjualanMilli(stok: number, kebutuhan: number): number {
  return Math.max(0, stok - kebutuhan);
}

// ── Pesan ───────────────────────────────────────────────────────────────────

export interface BahanPesan {
  nama: string;
  satuan: Satuan;
  dibutuhkan: InputDesimal;
  tersedia: InputDesimal;
}

/** "Stok Telur ayam kurang: butuh 3 buah, sisa 1 buah." per bahan, dipisah spasi. */
export function pesanStokTidakCukup(bahan: readonly BahanPesan[]): string {
  return bahan
    .map(
      (b) =>
        `Stok ${b.nama} kurang: butuh ${formatKuantitas(b.dibutuhkan, b.satuan)}, sisa ${formatKuantitas(b.tersedia, b.satuan)}.`,
    )
    .join(' ');
}

/** Pesan alert (`alert-stok.md` → Pembuatan Alert). */
export function pesanAlert(
  jenis: 'stok_menipis' | 'stok_tidak_sinkron',
  bahan: { nama: string; satuan: Satuan; stok_saat_ini: InputDesimal },
): string {
  if (jenis === 'stok_tidak_sinkron') return `Stok ${bahan.nama} tidak sinkron, lakukan opname.`;
  if (keSkala(bahan.stok_saat_ini, DIGIT_KUANTITAS) <= 0n) return `Stok ${bahan.nama} habis.`;
  return `Stok ${bahan.nama} tinggal ${formatKuantitas(bahan.stok_saat_ini, bahan.satuan)}, segera belanja.`;
}
