import { act, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { expect, it } from 'vitest';
import { Toaster } from '@/components/ui/sonner';

// Smoke setup jsdom + Testing Library + fake-indexeddb (#1b) dan Toaster (komponen.md §8).
it('Toaster menampilkan toast dengan teks, posisi atas-tengah di mobile', async () => {
  render(<Toaster />);
  act(() => {
    toast.success('Belanja bahan tersimpan.');
  });
  expect(await screen.findByText('Belanja bahan tersimpan.')).toBeInTheDocument();
  expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-y-position', 'top');
});

it('fake-indexeddb tersedia', () => {
  expect(indexedDB.open('uji')).toBeDefined();
});
