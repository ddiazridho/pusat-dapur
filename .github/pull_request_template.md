## Issue

Closes #<!-- nomor --> · `docs/tasks.md` → #<!-- nomor issue roadmap, contoh 9 atau 20a --> · Owner: <!-- A (backend-dev) / B (frontend-dev) -->

## Ringkasan

<!-- Apa yang diimplementasikan, 2–4 kalimat. -->

## Rujukan dokumen

- FRD: <!-- contoh docs/frd pusat dapur/pos.md -->
- Architecture / design: <!-- contoh docs/architecture/alur-domain.md → Loop Inti; docs/design/layar-kasir.md §2 -->

## Checklist issue

<!-- Salin checklist issue dari docs/tasks.md, centang yang selesai. Item yang tidak selesai beri alasan. -->

## Definition of Done

- [ ] Kriteria "Selesai jika" terpenuhi dan diuji otomatis; nama tes memuat ID aturan (`BR-xx` / `US-xx`)
- [ ] Gate CI yang aktif untuk issue ini hijau (`docs/tasks.md` → PR Gate)
- [ ] Tidak ada field biaya di respons/tampilan kasir; isolasi outlet terjaga
- [ ] Tidak ada perilaku, field, atau endpoint di luar FRD
- [ ] Kontrak berubah → `docs/architecture/api.md` dan `src/shared/schemas` diperbarui
- [ ] `reviewer` memberi APPROVE

### Jika ada migrasi

- [ ] Dibuat dengan `pnpm db:migrate:local`; tidak ada `DROP` untuk objek di `prisma/manual-objects.sql.md`
- [ ] `prisma/manual-objects.sql.md` diperbarui; expand–contract; migrasi lama tidak diedit
- [ ] Sudah diterapkan ke Supabase dev (`pnpm db:deploy:dev`)

### Jika ada UI

- [ ] Sesuai wireframe & copy `docs/design/`; semua state (memuat, kosong, error, offline, `read_only`)
- [ ] Checklist `docs/frontend-guide.md` §16
- [ ] Screenshot 360×640 dan 1280×800:

<!-- tempel screenshot -->

## Label

- [ ] `kontrak`: mengubah `src/shared/**`, `package.json`, lockfile, `tsconfig`, atau ESLint
- [ ] `migrasi`: menambah file di `prisma/migrations/`
- [ ] `keamanan`: mengubah middleware, `src/server/auth/**`, atau RLS

PR berlabel di atas wajib disetujui pemilik proyek.
