import type { Peran } from './schemas/enum';

/**
 * Matriks akses level modul (FRD `auth.md` → Matriks Akses, `api.md`).
 * Dipakai middleware (peran vs prefix), navigasi shell, dan uji HTTP.
 * Aturan halus (method per peran, kasir hanya hari ini, field biaya,
 * `read_only` non-GET) ada di `route()` dan domain, bukan di sini.
 *
 * Pola = segmen path; `*` cocok satu segmen. Pola terpanjang yang cocok menang.
 * `'publik'` tanpa sesi; `'cron'` wajib `Authorization: Bearer CRON_SECRET`.
 */
export type Akses = 'publik' | 'cron' | readonly Peran[];

const P: readonly Peran[] = ['pemilik'];
const PK: readonly Peran[] = ['pemilik', 'kasir'];

export const ROUTE_ACCESS: Readonly<Record<string, Akses>> = {
  // Halaman
  '/': 'publik', // page.tsx sendiri mengalihkan sesuai sesi (auth-akses.md → Rute `/`)
  '/login': 'publik',
  '/daftar': 'publik',
  '/lupa-password': 'publik',
  '/reset-password': 'publik',
  '/s': 'publik',
  '/offline': 'publik',
  '/dev': 'publik', // 404 bila VERCEL_ENV = production (api.md)
  '/onboarding': P,
  '/dashboard': P,
  '/bahan': PK,
  '/menu': P,
  '/restock': P,
  '/opname': P,
  '/pengaturan': P,
  '/akun': PK,
  '/kasir': PK,
  '/struk': PK,

  // API
  '/api/auth/daftar': 'publik',
  '/api/akun': PK,
  '/api/kasir': P,
  '/api/pengaturan': P,
  '/api/bahan-baku': PK,
  '/api/bahan-baku/*/mutasi': P,
  '/api/menu': P,
  '/api/resep-template': P,
  '/api/restock': P,
  '/api/opname': P,
  '/api/transaksi': PK,
  '/api/sync': PK,
  '/api/alert': P,
  '/api/laporan': P,
  '/api/health': 'publik',
  '/api/log-client': PK,
  '/api/demo': 'cron',
  '/api/cron': 'cron',
};

function segmen(path: string): string[] {
  return path.split('?')[0]!.split('/').filter(Boolean);
}

const POLA = Object.entries(ROUTE_ACCESS)
  .map(([pola, akses]) => ({ seg: segmen(pola), akses }))
  .sort((a, b) => b.seg.length - a.seg.length);

/** Akses untuk path; `null` = route tidak dikenal (biarkan Next mengembalikan 404). */
export function aksesRoute(path: string): Akses | null {
  const s = segmen(path);
  if (s.length === 0) return ROUTE_ACCESS['/']!;
  for (const { seg, akses } of POLA) {
    if (seg.length === 0 || seg.length > s.length) continue;
    if (seg.every((p, i) => p === '*' || p === s[i])) return akses;
  }
  return null;
}

/** Peran (sesi valid) boleh membuka path? Rute publik selalu boleh; cron tidak lewat sesi. */
export function bolehAkses(path: string, peran: Peran): boolean {
  const akses = aksesRoute(path);
  if (akses === null || akses === 'publik') return true;
  if (akses === 'cron') return false;
  return akses.includes(peran);
}

/** Tujuan halaman yang ditolak peran (middleware) & default setelah login (`auth.md`). */
export const HALAMAN_AWAL: Readonly<Record<Peran, string>> = {
  pemilik: '/dashboard',
  kasir: '/kasir',
};
