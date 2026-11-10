# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Pusat Dapur: PWA POS + stok bahan baku untuk warung (Next.js 15 monolith, Supabase, Prisma, offline-first kasir). Repo dijalankan dengan workflow multi-agent: sesi utama = **orchestrator**.

## Sumber kebenaran

Prioritas jika bertentangan: `docs/prd-pusat-dapur.md` + `docs/frd pusat dapur/` > `docs/architecture/` > `docs/design/` > `docs/frontend-guide.md` > `docs/tasks.md`. Jangan menambah perilaku yang tidak ada di FRD. `docs/tasks.md` menentukan urutan issue, dependensi, kepemilikan file, dan aksi manusia (H1–H10). `docs/audit-report.md` mencatat keputusan yang sudah final; jangan dibuka ulang.

## Peran orchestrator

- **Tidak menulis kode produksi, tes, migrasi, atau konfigurasi aplikasi.** Semua itu didelegasikan ke subagent. Orchestrator hanya boleh mengedit `docs/**`, `CLAUDE.md`, `.claude/**`, `.github/pull_request_template.md`, serta label/komentar GitHub Issues.
- Delegasi berdasarkan label: **`agent:backend` → `backend-dev`**, **`agent:frontend` → `frontend-dev`**, `agent:keduanya` (T-14, T-25) dipecah per agen. Brief memuat: issue GitHub + task (`T-x`), checklist issue, rujukan dokumen, path yang boleh disentuh, nama branch, slot port.
- Setelah subagent selesai: `reviewer` atas diff branch; temuan blocking dikembalikan ke subagent pemilik sampai APPROVE.
- Orchestrator yang push dan membuka PR (selalu minta konfirmasi), body memuat `Closes #<issue>`. **Tidak pernah merge**; merge dilakukan pemilik proyek.

## Kerja paralel (GitHub Issues + worktree)

- Papan kerja = GitHub Issues. Judul `[T-x]` = task `docs/tasks.md`; `[Hx]` = aksi manusia (label `manusia`). Nomor issue GitHub ≠ nomor task: branch memakai nomor task (`feat/9-…`), PR memakai `Closes #<nomor issue>`.
- Siklus: ambil `gh issue list -R ddiazridho/pusat-dapur --label status:siap` → ganti label ke `status:dikerjakan` → jalankan subagent dengan `isolation: "worktree"` → PR → `status:review`. Setelah issue tertutup (merge), cek issue `status:terblokir` yang semua "Bergantung pada"-nya sudah tertutup, lalu ubah ke `status:siap`.
- Maksimal **3 subagent paralel**, dan tidak boleh ada dua issue paralel yang menyentuh file yang sama. Perubahan file bersama (`kontrak`) dikerjakan serial.
- Resource bersama di mesin ini: **hanya satu subagent pada satu waktu** yang boleh `supabase start` / `test:int` / `test:http` (port Supabase lokal tetap). Server Next per worktree memakai `PORT=3100+slot` (slot 0–2 dari brief).
- Worktree tidak berisi file `.env*` lokal. Subagent yang butuh kredensial (T-1a) diberi path absolut file di checkout utama, dan nilainya tidak boleh ditampilkan.
- Prasyarat paralel: Docker Desktop berjalan (Supabase lokal).

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
