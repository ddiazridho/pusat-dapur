import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Placeholder #1a. Root layout lengkap (font, Toaster, nonce CSP) dikerjakan #1b.
export const metadata: Metadata = {
  title: 'Pusat Dapur',
  description: 'POS dan stok bahan baku untuk warung',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
