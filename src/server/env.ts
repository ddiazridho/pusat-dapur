import 'server-only';
import { parseServerEnv, type ServerEnv } from './env-schema';

/**
 * Env server tervalidasi. Satu-satunya pintu kode aplikasi membaca rahasia;
 * jangan membaca `process.env` langsung di modul lain.
 */
export const env: ServerEnv = parseServerEnv(process.env);
