'use client';

import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Toast (docs/design/komponen.md §8, tokens.md §7): atas-tengah di mobile agar tidak
// menutupi bar keranjang, kanan bawah di desktop (≥ lg), maks 3, selalu ikon + teks,
// tampil 4 detik (toast error memakai `duration: 6000` saat dipanggil). Light only.
const KUERI_DESKTOP = '(min-width: 1024px)';

function langgananDesktop(onChange: () => void) {
  const mql = window.matchMedia(KUERI_DESKTOP);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function useDesktop() {
  return useSyncExternalStore(
    langgananDesktop,
    () => window.matchMedia(KUERI_DESKTOP).matches,
    () => false,
  );
}

export function Toaster(props: ToasterProps) {
  const desktop = useDesktop();

  return (
    <Sonner
      theme="light"
      position={desktop ? 'bottom-right' : 'top-center'}
      visibleToasts={3}
      duration={4000}
      icons={{
        success: <CircleCheck aria-hidden className="size-5 text-status-aman" />,
        error: <CircleX aria-hidden className="size-5 text-status-habis" />,
        info: <Info aria-hidden className="size-5 text-status-info" />,
        warning: <TriangleAlert aria-hidden className="size-5 text-status-menipis" />,
        loading: <LoaderCircle aria-hidden className="size-5 animate-spin text-status-info" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'bg-card! text-card-foreground! border-border! rounded-lg! shadow-lg! font-sans! text-sm! gap-3!',
          title: 'font-medium!',
          description: 'text-muted-foreground!',
          icon: 'size-5!',
          actionButton:
            'min-h-touch! h-auto! rounded-md! px-4! bg-primary! text-primary-foreground! text-sm! font-medium!',
          cancelButton:
            'min-h-touch! h-auto! rounded-md! px-4! bg-secondary! text-secondary-foreground! text-sm! font-medium!',
        },
      }}
      {...props}
    />
  );
}
