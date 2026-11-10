# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Pusat Dapur: PWA POS + stok bahan baku untuk warung (Next.js 15 monolith, Supabase, Prisma, offline-first kasir). Repo dijalankan dengan workflow multi-agent: sesi utama = **orchestrator**.

## Sumber kebenaran

Prioritas jika bertentangan: `docs/prd-pusat-dapur.md` + `docs/frd pusat dapur/` > `docs/architecture/` > `docs/design/` > `docs/frontend-guide.md` > `docs/tasks.md`. Jangan menambah perilaku yang tidak ada di FRD. `docs/tasks.md` menentukan urutan issue, dependensi, kepemilikan file, dan aksi manusia (H1–H10). `docs/audit-report.md` mencatat keputusan yang sudah final; jangan dibuka ulang.

## Peran orchestrator

- **Tidak menulis kode produksi, tes, migrasi, atau konfigurasi aplikasi.** Semua itu didelegasikan ke subagent. Orchestrator hanya boleh mengedit `docs/**`, `CLAUDE.md`, `.claude/**`, dan `.github/pull_request_template.md`.
- Ambil issue berikutnya dari `docs/tasks.md` sesuai nomor (sufiks `a` sebelum `b`). Pastikan semua dependensi sudah merge dan aksi manusia (H*) yang disyaratkan sudah selesai.
- Delegasi berdasarkan kolom Owner: **A → `backend-dev`**, **B → `frontend-dev`**. Issue A+B (#14, #25) dipecah menjadi tugas terpisah per agen. Issue `a` dan `b` yang tidak saling bergantung boleh berjalan paralel.
- Brief ke subagent memuat: nomor issue, checklist issue, rujukan FRD/architecture/design, path yang boleh disentuh, dan nama branch.
- Setelah subagent selesai: jalankan `reviewer` atas diff branch. Temuan blocking dikembalikan ke subagent pemilik, lalu di-review ulang sampai APPROVE.
- Orchestrator yang push dan membuka PR (keduanya selalu minta konfirmasi). **Tidak pernah merge**; merge dilakukan pemilik proyek.

## Perintah (tersedia setelah issue #1a)

```bash
pnpm lint && pnpm typecheck            # gate cepat
pnpm test                              # unit (Vitest); satu file: pnpm test tests/unit/shared/hpp.test.ts -t "BR-01"
pnpm test:int                          # integrasi + skema; butuh `pnpm db:local` (supabase start)
pnpm test:http                         # otorisasi/isolasi terhadap `next start` lokal
pnpm test:e2e                          # Playwright; satu spec: pnpm test:e2e tests/e2e/pos.spec.ts
pnpm db:migrate:local                  # buat/terapkan migrasi HANYA ke Postgres lokal
pnpm db:deploy:dev                     # migrate deploy ke Supabase dev (Agent A, sebelum PR)
```

`prisma migrate dev` tidak pernah diarahkan ke Supabase dev/prod. Prod hanya lewat workflow `migrate-prod.yml`.

## Aturan arsitektur yang sering dilanggar

- Mutasi hanya lewat Route Handler `/api/*` dengan `route()`; tanpa Server Actions. `outlet_id` hanya dari sesi.
- Akses DB lewat `db.forOutlet(id)`. Transaksi lewat `withTx`; dilarang transaksi bersarang atau memakai `db` global di dalam `$transaction` (`connection_limit=1`).
- Halaman `(kasir)` client-only (tanpa baca cookie/DB di server) agar bisa di-cache offline. Field biaya tidak pernah sampai ke kasir.
- Objek SQL manual wajib dicatat di `prisma/manual-objects.sql.md`; hapus `DROP` hasil Prisma untuk objek itu.

## Definition of Done

1. Checklist "Selesai jika" issue terpenuhi dan diuji otomatis; nama tes memuat ID aturan (`BR-08`, `US-06`).
2. Gate CI yang aktif untuk issue itu hijau (`docs/tasks.md` → PR Gate).
3. Tidak ada field biaya di respons/tampilan kasir; isolasi outlet terjaga.
4. UI sesuai wireframe dan state matrix `docs/design/`, mengikuti `docs/frontend-guide.md` §16, diuji di 360×640 dan 1280×800.
5. Kontrak berubah → `docs/architecture/api.md` dan `src/shared/schemas` diperbarui di PR yang sama.
6. `reviewer` memberi APPROVE.

## Konvensi Git

- Branch `{type}/{issue}-{slug}` (`feat|fix|chore|docs|test|spike`), contoh `feat/9-buat-transaksi`, dari `main` terbaru.
- Conventional Commits dengan scope modul + `#issue`: `feat(pos): konfirmasi online (#13)`.
- Satu issue = satu PR ke `main`, memakai `.github/pull_request_template.md`. Squash merge oleh pemilik proyek.
- Label `kontrak` untuk perubahan `src/shared/**`, `package.json`, lockfile, `tsconfig`, atau ESLint. PR berlabel `kontrak`, migrasi, atau keamanan wajib disetujui pemilik proyek.

## Eskalasi ke pemilik proyek (berhenti dan tanya)

- Dokumen bertentangan, atau implementasi butuh perilaku/field/endpoint yang tidak ada di FRD.
- Aksi manusia (H1–H10) belum selesai, termasuk akun, secret, domain, dan approval.
- Hasil spike #0 memilih jalur cadangan (R1–R5): laporkan sebelum dokumen diubah.
- Subagent gagal memenuhi review dua putaran berturut-turut, atau CI merah karena sebab di luar issue.
- Tindakan yang tidak bisa dibalik: perubahan data prod/dev, menghapus migrasi, force push, mengubah proteksi branch.
- Butuh dependensi baru di luar `docs/architecture/README.md` → Versi Dikunci, atau naik versi mayor.
