/**
 * Email internal kasir (`akun-kasir.md`, `auth-akses.md` → Login Kasir).
 * Jalur cadangan R1 (spike #0): ganti ke `kasir.example.com` + FRD di PR yang sama.
 */
export const DOMAIN_EMAIL_KASIR = 'kasir.pusatdapur.invalid';

export const POLA_USERNAME = /^[a-z0-9._]+$/;

/** Identitas login tanpa `@` dianggap username kasir (`auth.md` → Login). */
export function adalahUsername(identitas: string): boolean {
  return !identitas.includes('@');
}

export function emailKasir(username: string): string {
  return `${username.trim().toLowerCase()}@${DOMAIN_EMAIL_KASIR}`;
}

/** Email atau username → email untuk `signInWithPassword`. */
export function emailLogin(identitas: string): string {
  const bersih = identitas.trim();
  return adalahUsername(bersih) ? emailKasir(bersih) : bersih.toLowerCase();
}
