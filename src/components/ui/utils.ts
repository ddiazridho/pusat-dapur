import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Ukuran teks kustom dari `globals.css` (@theme `--text-display`) didaftarkan agar
// `text-display` tidak dianggap warna dan terhapus saat digabung dengan `text-<warna>`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display'] }],
    },
  },
});

/** Gabung kelas Tailwind (pola shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
