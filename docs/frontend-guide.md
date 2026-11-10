# Frontend Implementation Guide — Pusat Dapur

Panduan untuk agen/developer yang membangun UI. Menjelaskan **cara** mengubah dokumen desain menjadi kode yang konsisten. Bukan sumber fitur.

| Pertanyaan | Sumber kebenaran |
|---|---|
| Fitur apa, aturan apa, validasi apa? | FRD `docs/frd pusat dapur/` + PRD `docs/prd-pusat-dapur.md` |
| Endpoint, payload, error, offline engine? | `docs/architecture/` (`api.md`, `offline-pwa.md`, `auth-akses.md`) |
| Tampilan, copy, state, token? | `docs/design/` |
| Urutan & kepemilikan pekerjaan? | `docs/tasks.md` |
| Cara menulis kodenya? | **Dokumen ini** |

## 1. Status

Dokumen produk, arsitektur, dan desain **terkunci**. Pekerjaan frontend boleh menyempurnakan presentasi, layout, state komponen, dan perilaku responsif. Pekerjaan frontend **tidak boleh**:

- menambah field, filter, menu, atau fitur yang tidak ada di FRD (mis. kategori, SKU, diskon, pelanggan, ekspor, multi-outlet dari referensi Pawoon);
- menampilkan field biaya (`harga_beli_per_satuan`, `hpp_*`, margin) untuk kasir;
- memanggil Supabase langsung untuk data bisnis (hanya Auth, Realtime `stok_alert`, upload signed URL);
- memakai Server Actions untuk mutasi (semua mutasi lewat Route Handler `/api/*`, ADR-01);
- menghitung ulang total/HPP/stok sebagai nilai final di client (client hanya pratinjau; nilai final dari server);
- menyalin aset, logo, warna, atau teks Pawoon.

Perubahan di luar batas ini butuh perubahan FRD/architecture lebih dulu.

## 2. Workflow: Wireframe-First (tanpa Stitch)

Acuan visual langsung dari wireframe ASCII + token di `docs/design/` (keputusan D-01).

1. **Baca** issue di `docs/tasks.md`, file FRD yang dirujuk, dan bagian layar di `docs/design/layar-*.md`.
2. **Susun komponen statis** dari wireframe memakai komponen `docs/design/komponen.md` dan data fixture `src/client/fixtures/*` (model konten `docs/design/README.md`). Belum ada fetch.
3. **Lengkapi semua state** di matriks `docs/design/konten-aksesibilitas.md` §4 dengan fixture: memuat, kosong, error, offline, `read_only`, dan khusus kasir (stok kurang, harga berubah, belum terkirim, gagal).
4. **Sambungkan data** lewat `src/client/api.ts` (backoffice) atau IndexedDB + sync engine (kasir), memakai skema Zod `src/shared/schemas/*`.
5. **Bandingkan** render 360 × 640 dan 1280 × 800 dengan wireframe; jalankan axe dan checklist §14.
6. **PR** dengan screenshot kedua ukuran + daftar state yang sudah diuji.

### 2.1 Notasi Wireframe → Implementasi

| Di wireframe | Implementasi wajib |
|---|---|
| `[■ Teks]` | `<Button>` varian `default`, atau `cta` bila penyelesai transaksi (`komponen.md` §1) |
| `[ Teks ]` | `<Button variant="outline">` |
| `( • ) A  (   ) B` | `<Segmented>` (≤ 3 opsi) / `RadioGroup` |
| `[Rp │ …]` | `<InputRupiah>` |
| `[… ] gram` | `<InputKuantitas satuan="gram">` |
| `[… ▾]` pilih bahan/menu | `<Combobox>` (sheet di mobile) |
| `✓ Aman`, `⚠ Menipis`, `✕ Habis` | `<StatusBadge>`; simbol di wireframe = ikon lucide, bukan karakter |
| Kartu daftar (mobile) + tabel (desktop) | Satu `<DaftarData>` dengan definisi kolom |
| `‹…›` | Data dinamis dari props/API, diformat lewat `shared/format.ts` |
| Teks biasa | Copy final; salin persis (perubahan copy = perubahan dokumen desain) |
| `🔔³`, `⟳`, `⋮` | Ikon + `aria-label` + badge jumlah |
| Emoji di wireframe | Ikon `lucide-react` padanannya; **jangan** render emoji |

## 3. Kepemilikan

Sesuai `docs/tasks.md` → Tim & Kepemilikan. Agent B memiliki seluruh UI; Agent A memiliki API yang dikonsumsi.

| Permukaan | Komponen utama | Owner UI | Issue |
|---|---|---|---|
| Fondasi UI | `globals.css`, root layout, font, Toaster | B | #1b |
| Design system & shell | `components/ui/*`, `components/bersama/*`, `components/shell/*`, banner | B | #5 |
| Auth & akun | `/`, form login/daftar/reset, `/akun`, IndexedDB `profil` | B | #5 |
| Stok | `/bahan*`, `/restock`, sheet tambah bahan, tab riwayat | B | #10, #22b |
| Menu & onboarding | `/menu*`, form resep + panel HPP, template, `/onboarding` | B | #11 |
| Pengaturan | `/pengaturan`, `/pengaturan/kasir` | B | #12 |
| Kasir | `components/kasir/*`, `/kasir`, `/kasir/riwayat`, `/struk/*`, `/s/[token]` | B | #13 |
| Dashboard | `KartuKPI`, alert, grafik | B | #17 |
| Offline/PWA | `client/offline/*`, `app/sw.ts`, manifest | B | #18 |
| Gagal terkirim, opname, pembatalan, simulasi | UI terkait | B | #19b, #20b, #21b, #24b |

Butuh perubahan API/skema → komentar di issue Agent A; perubahan `src/shared/**` → PR berlabel `kontrak`.

## 4. Urutan Build

Urutan ini sama dengan urutan issue Agent B di `docs/tasks.md`:

1. (#1b) `globals.css` dari `docs/design/tokens.md` §8, font Inter, `Toaster` (Sonner), root layout.
2. (#5) Komponen dasar `komponen.md` §1–§10 + halaman katalog `/dev/komponen` (non-production).
3. (#5) Shell: publik → backoffice (bottom nav + sidebar) → kasir → struk; banner global.
4. (#5) Halaman auth + `/` + `/akun` tersambung API (#4); skema IndexedDB awal (`meta`, `profil`) dan penulisan `profil` saat login.
5. (#10–#12) Halaman backoffice dengan fixture → sambungkan API per issue A yang merge.
6. (#13) POS online: snapshot, keranjang, konfirmasi, hasil, struk, riwayat.
7. (#18) Offline engine + Service Worker, lalu (#17) Dashboard.
8. (#19b–#22b, #24b) Gagal terkirim, opname, pembatalan, riwayat mutasi, mode simulasi.

## 5. Struktur Route & Shell

| Route group | Isi | Render | Shell |
|---|---|---|---|
| `(publik)` | login, daftar, lupa/reset kata sandi, onboarding, `s/[token]` | RSC + client form | Publik; `s/[token]` memakai ShellStruk |
| `(pemilik)` | dashboard, bahan, menu, restock, opname, pengaturan | RSC untuk muat awal, client untuk interaksi | Backoffice |
| `(kasir)` | kasir, kasir/riwayat, struk/[clientTxId] | **Client penuh**; server hanya merender shell tanpa data | Kasir / Backoffice / Struk (lihat bawah) |

**Aturan umum (`struktur-kode.md` → Route group & layout):** `layout.tsx` route group tidak memasang shell dan tidak memeriksa peran. Setiap `page.tsx` memasang shell-nya sendiri dan (kecuali `(kasir)`) memanggil `getPageContext({ peran })`. Nama grup bukan batas akses: kasir tetap membuka `/bahan` (grup `(pemilik)`) karena `ROUTE_ACCESS` mengizinkannya, dan ShellBackoffice memilih navigasi sesuai peran.

**Contoh:** `/kasir/riwayat` bersarang di bawah segmen `/kasir` tetapi memakai shell berbeda dari `/kasir`. Jadi **jangan** taruh shell kasir di `layout.tsx` segmen `/kasir`. Shell dipasang sebagai komponen di masing-masing `page.tsx`:

```tsx
// src/app/(kasir)/kasir/page.tsx
export default function Page() {
  return <ShellKasir><PosScreen /></ShellKasir>;      // 'use client' di dalamnya
}
// src/app/(kasir)/kasir/riwayat/page.tsx
export default function Page() {
  return <ShellBackoffice judul="Riwayat Transaksi"><RiwayatScreen /></ShellBackoffice>;
}
```

Halaman `(kasir)` tidak boleh membaca cookie/DB di server (agar shell bisa di-cache Service Worker dan dibuka offline). Identitas diambil dari store `profil` IndexedDB (ditulis saat login, `auth-akses.md` → Login); jika kosong → `router.replace('/login')`. Shell ini di-cache SW lewat `WARM_SHELL` setelah login (`offline-pwa.md` → Pengisian Cache Shell Kasir).

## 6. Data Fetching & Mutasi

### 6.1 Backoffice (online)

| Kebutuhan | Pola |
|---|---|
| Muat awal halaman | RSC memanggil domain service lewat `getPageContext()` (milik A) dan meneruskan data ter-serialisasi sebagai props ke client component |
| Muat ulang, filter, paginasi | Hook `useApi(path, query)` di `src/client/hooks/` (fetch + state `memuat/data/error` + `muatUlang()`); tanpa TanStack Query (ADR, bundle) |
| Filter | Disimpan di URL search params (`useSearchParams` + `router.replace`), bukan state lokal; agar bisa dibagikan & kembali |
| Mutasi | `api.post/patch/put/delete()` dari `src/client/api.ts`; setelah sukses: perbarui state lokal atau `muatUlang()`, lalu `router.refresh()` bila data RSC terdampak |
| Optimistic update | **Tidak** untuk data uang/stok. Boleh untuk "tandai alert dibaca" |

### 6.2 `src/client/api.ts`

- Selalu `Content-Type: application/json` dan body `{}` untuk request tanpa data (CSRF, NFR-04).
- Respons error → `ApiError { status, kode, pesan, detail }` dari format `{ error: { kode, pesan, detail } }`.
- Timeout default 15 detik; POS 10 detik (FRD).
- 401 di backoffice → redirect `/login?next=…`; **di kasir tidak** redirect, melainkan alur offline (`offline-pwa.md`).
- 429 → baca `Retry-After`.
- Tidak pernah mengirim `outlet_id`, `user_id`, `total`, HPP; server mengambilnya sendiri.

### 6.3 Kasir (offline-first)

- Sumber data layar kasir = IndexedDB (`snapshot`, `antrean_transaksi`, `keranjang`, `profil`), bukan respons API langsung.
- Semua akses IndexedDB lewat modul `src/client/offline/*` (`docs/architecture/offline-pwa.md`); komponen tidak memanggil `idb` langsung.
- State reaktif: `useSyncExternalStore` atas store kecil di `client/offline` (hitungan antrean, status sync, snapshot). Perubahan lintas tab/SW lewat `BroadcastChannel('pusatdapur-sync')`.
- `client_tx_id` & `nomor_struk` dibuat **sekali per konfirmasi** dan disimpan di state konfirmasi sampai keranjang dikosongkan. Jangan pernah membuat ulang saat retry.

## 7. Form

| Aturan | Implementasi |
|---|---|
| Validasi | Skema Zod dari `src/shared/schemas/*`, **sama** dengan server. Tidak ada aturan validasi yang ditulis ulang di komponen |
| State | Hook ringan `useFormZod(schema, nilaiAwal)` di `src/client/hooks/` (nilai, error per field, `touched`, `submit`). Tanpa react-hook-form/Formik |
| Kapan validasi | Saat blur dan saat submit; jangan menampilkan error saat pengguna baru mulai mengetik |
| Error server | 422 `VALIDASI_GAGAL` → `detail` dipetakan ke field; 409 kode spesifik → field terkait (mis. `NAMA_BAHAN_SUDAH_ADA` → field nama) atau dialog bila tidak terkait field |
| Fokus | Setelah submit gagal, fokus ke field error pertama |
| Submit | Tombol `memuat` + `disabled`; cegah double submit |
| Tombol simpan | Nonaktif jika tidak ada perubahan (pengaturan, ubah bahan/menu) |
| Batas field | Form transaksi (POS, belanja bahan) maksimal 3 field input (NFR-07). Jangan menambah field "catatan" dll. |

## 8. Peran, Biaya, dan Akun Demo

| Aturan | Implementasi |
|---|---|
| Sumber peran | `profil.peran` / konteks sesi dari server, bukan dari URL |
| Field biaya | Komponen hanya merender field biaya jika ada di data (`if (data.hpp_cached !== undefined)`). Respons kasir memang tidak memuatnya; **jangan** mengandalkan `peran === 'kasir'` saja untuk menyembunyikan |
| Navigasi per peran | Dibangkitkan dari `ROUTE_ACCESS` (`src/shared/akses.ts`) agar sama dengan middleware |
| `read_only` (akun demo) | Semua tombol/field ubah `disabled` + teks/tooltip "Akun demo hanya bisa melihat" (`docs/design/README.md` aturan 7). Banner demo di semua halaman. Server tetap penegak akhir (403 `READ_ONLY`) |
| Mode simulasi | `/kasir` dengan `read_only` memakai implementasi konfirmasi simulasi: tidak menulis antrean, tidak memanggil API mutasi, struk "SIMULASI" (`layar-kasir.md` §6) |
| Hook bantu | `usePeran()` → `{ peran, readOnly, bolehUbah }`; komponen aksi memakai `bolehUbah` |

## 9. Angka, Uang, dan Waktu

| Aturan | Implementasi |
|---|---|
| Format | **Hanya** lewat `src/shared/format.ts` (`rupiah`, `kuantitas`, `hargaSatuan`, `persen`, `tanggal`, `jam`, `relatif`). Tidak ada `toLocaleString` ad hoc di komponen |
| Uang | `number` integer dari API; tampil `Rp12.500`, `tabular-nums` |
| Kuantitas & harga satuan | String desimal dari API → milli-unit integer di client untuk perhitungan (ADR-09); input koma desimal dinormalisasi oleh `InputKuantitas` |
| Pratinjau perhitungan | Pakai rumus `src/shared/rumus/*` (HPP, margin, konversi restock, `putuskanStok`); hasil diberi label pratinjau sampai nilai server diterima |
| Zona waktu | Semua tanggal/jam memakai `outlet.zona_waktu` (dari snapshot/konteks), bukan zona perangkat; label `WIB/WITA/WIT` |
| "Hari ini" | `shared/waktu.ts`, bukan `new Date()` lokal |

## 10. Gambar, Ikon, Grafik

| Elemen | Aturan |
|---|---|
| Foto menu | `<img>` biasa (bukan `next/image`) dengan `width`/`height`, `loading="lazy"`, `decoding="async"`, `alt` nama menu. Alasan: file sudah dikompresi WebP ≤ 300 KB di client, URL Supabase publik stabil harus di-cache Service Worker, dan tidak memakan kuota Image Optimization Vercel Hobby. Komponen tunggal `components/bersama/foto-menu.tsx`; aturan ESLint `@next/next/no-img-element` dimatikan **hanya** untuk file ini (override di `eslint.config`) |
| Upload foto | Kompresi di client ke WebP maks 800 px / 300 KB sebelum upload (`menu.md`); gagal memenuhi → tolak dengan pesan |
| Tanpa foto | `<AvatarInisial>` dengan warna deterministik dari `menu_id` |
| Ikon | `lucide-react` impor per ikon (`import { Package } from 'lucide-react'`); dekoratif `aria-hidden` |
| Grafik | Hanya `/dashboard`; Recharts via `next/dynamic({ ssr: false })` + tabel `sr-only`. Top menu memakai bar CSS |

## 11. Offline & PWA (Frontend)

Rangkuman kewajiban UI; detail engine di `docs/architecture/offline-pwa.md`.

- Kasir tidak pernah menampilkan spinner layar penuh menunggu jaringan; layar selalu dirender dari IndexedDB.
- Setiap transaksi lokal punya status terlihat: "Belum terkirim", "Mengirim…", "Gagal terkirim".
- Indikator sinkron selalu ada di `/kasir` (`layar-kasir.md` §8), dengan `aria-live="polite"`.
- Halaman pemilik offline → halaman `/offline` dari Service Worker; jangan mencoba merender data basi tanpa label.
- Logout diblokir selama antrean belum terkirim (`layar-kasir.md` §7).
- Prompt "Versi baru tersedia" hanya diterapkan saat keranjang kosong dan sync tidak berjalan.
- Uji offline memakai `context.setOffline(true)` Playwright, bukan hanya `navigator.onLine` palsu.

## 12. Performa

| Anggaran | Nilai | Cara menjaga |
|---|---|---|
| JS awal `/kasir` (gzip) | ≤ 170 KB | Tidak mengimpor Recharts, komponen tabel/kalender, date-fns locale penuh, atau modul `components/pemilik/*` di route kasir |
| LCP `/kasir` 3G, load pertama | ≤ 3 detik | Shell ringan, font `display: swap`, gambar lazy |
| Interaktif dari cache SW | ≤ 1 detik | Data dari IndexedDB, tanpa menunggu fetch |
| Tap menu → badge qty | < 100 ms | Update state lokal sinkron; tulis IndexedDB keranjang secara debounce |

Aturan tambahan:

- `'use client'` diletakkan sedalam mungkin; halaman backoffice tetap RSC di level atas.
- Daftar > 100 item tidak dirender sekaligus (paginasi cursor "Tampilkan lebih banyak").
- Hindari `useEffect` berantai untuk data turunan; hitung saat render (`useMemo` hanya bila terukur lambat).
- Bundle dicek `@next/bundle-analyzer`; CI gagal bila anggaran `/kasir` terlampaui.

## 13. Konvensi Kode UI

| Aspek | Aturan |
|---|---|
| Nama file | `kebab-case.tsx`; satu komponen ekspor utama per file |
| Nama komponen | PascalCase, istilah domain Indonesia (`KartuMenuPos`, `PanelHpp`, `DialogBatalTransaksi`) |
| Lokasi | Primitif shadcn `components/ui/`; lintas modul `components/bersama/`; khusus kasir `components/kasir/`; khusus pemilik `components/pemilik/`; layar (komposisi halaman) `components/<modul>/*-screen.tsx` |
| Props | Tipe dari skema Zod (`z.infer`) atau tipe respons di `src/shared/schemas`; tidak membuat tipe duplikat |
| Styling | Utilitas Tailwind + token (`bg-cta`, `text-status-habis`); tidak ada warna hex/arbitrary value di komponen; varian dengan `cva` |
| Copy | Teks UI di komponen sesuai wireframe; pesan error dari `kode-error.ts`/respons server; istilah sesuai kamus `konten-aksesibilitas.md` §1 |
| Aksesibilitas | Primitif Radix/shadcn untuk overlay & kontrol; jangan membuat dialog/menu sendiri |
| Test id | `data-testid` hanya bila selector peran/label tidak memadai |

## 14. Testing Frontend

| Jenis | Alat | Wajib untuk |
|---|---|---|
| Unit komponen berlogika | Vitest + Testing Library | `InputRupiah`, `InputKuantitas`, `Segmented`, `DaftarData` (render tabel/kartu), `useFormZod`, store sync |
| Unit offline | Vitest + `fake-indexeddb` | `stok-lokal`, `antrean`, `sync-engine` (tabel respons FRD), `konfirmasi` |
| E2E | Playwright (Pixel 5 + desktop) terhadap `next start` + Supabase lokal di CI (sejak #5); smoke terhadap Preview sejak #14 | Alur per issue di `docs/tasks.md` (POS ≤ 6 tap, offline sync, onboarding, demo read-only). Setiap tes membuat outlet sendiri (email acak) |
| Aksesibilitas | `@axe-core/playwright` | Setiap halaman, termasuk overlay terbuka |
| Visual | Screenshot Playwright 360 & 1280 dilampirkan di PR | Setiap layar baru/berubah (tanpa snapshot diff otomatis di MVP) |

Selector E2E memakai peran & label (`getByRole('button', { name: 'Konfirmasi Rp42.000' })`), sehingga tes juga memverifikasi aksesibilitas dan copy.

## 15. Anti-pattern

- Menempel kode hasil generator/AI tanpa menyesuaikan ke komponen & token proyek.
- `fetch` langsung di komponen (lewati `api.ts`) atau `idb` langsung (lewati `client/offline`).
- Menyembunyikan tombol dengan CSS sebagai kontrol akses.
- Menghitung total/kembalian dengan `number` float pada kuantitas desimal.
- Membuat `client_tx_id` baru saat mengulang konfirmasi.
- Toast untuk error validasi field; spinner layar penuh di kasir.
- Tabel dengan scroll horizontal di HP untuk data utama.
- Status hanya dibedakan warna; ikon tanpa label.
- Mengimpor modul backoffice/grafik ke route kasir.

## 16. Acceptance (per PR UI)

- [ ] Layar sesuai wireframe & copy di `docs/design/layar-*.md`; tidak ada elemen di luar FRD.
- [ ] Semua state berlaku (`konten-aksesibilitas.md` §4) tersedia dan diuji dengan fixture.
- [ ] Render benar di 360 × 640 tanpa scroll horizontal, dan di 1280 × 800.
- [ ] Target sentuh ≥ 48 px; fokus terlihat; overlay mengunci & mengembalikan fokus; axe tanpa pelanggaran serius.
- [ ] Field biaya tidak muncul pada sesi kasir (uji E2E login kasir).
- [ ] `read_only`: semua aksi ubah nonaktif + penjelasan; banner demo tampil.
- [ ] Angka & tanggal lewat `shared/format.ts` dengan zona outlet.
- [ ] Validasi memakai skema Zod bersama; error server terpetakan ke field.
- [ ] Route kasir: berfungsi offline (setelah #18), bundle dalam anggaran.
- [ ] Tidak ada aset/copy/warna Pawoon.
- [ ] Setiap layar dapat ditelusuri ke satu bagian `docs/design/` dan satu file FRD.
