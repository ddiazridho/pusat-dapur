import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

// docs/design/tokens.md §2 Tipografi.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Pusat Dapur',
  description: 'POS dan stok bahan baku untuk warung',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nonce CSP diisi middleware (#4/#23) lewat header `x-nonce`. Next.js memasang nonce ke
  // script bawaannya dari header CSP; di sini nonce diekspos untuk script inline milik
  // aplikasi. Header kosong → tidak dipasang.
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <html lang="id" className={inter.variable}>
      <head>{nonce && <meta property="csp-nonce" nonce={nonce} />}</head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
