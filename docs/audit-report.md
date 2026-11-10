# Audit Report: Dokumen Proyek Pusat Dapur

Audit: 10 Nov 2026 · Perbaikan: 10 Nov 2026 · Cakupan: `prd-pusat-dapur.md`, `frd pusat dapur/` (19 file), `architecture/` (8), `design/` (8), `frontend-guide.md`, `tasks.md`.

## Verdict (setelah perbaikan)

**tasks.md: Siap dipakai.** Ketujuh temuan kritis sudah dibetulkan di dokumen sumbernya. Issue gabungan A+B dipecah (`a`/`b`) sehingga tabel dependensi, grafik paralel, dan kepemilikan file konsisten. Semua gate CI kini punya issue sejak kapan aktif.

**Kesiapan eksekusi: Tidak ada keputusan tersisa.** Ke-14 keputusan terbuka dan 8 pertanyaan diputuskan dengan opsi yang paling konsisten dengan NFR-10 (free tier) dan dokumen lain. Setiap risiko spike punya jalur cadangan final. Yang tersisa hanya **aksi manusia** (akun, secret, approval), yang kini tercatat di `tasks.md` → Aksi Pemilik Proyek (H1–H10) lengkap dengan kapan harus siap.

Legenda status: ✅ dibetulkan · 🔁 diputuskan atas nama pemilik proyek (dapat diubah; file yang perlu disunting disebut).

## Tabel Temuan dan Perbaikan

| No | Tingkat | Status | Masalah (ringkas) | Perbaikan yang diterapkan |
|---|---|---|---|---|
| 1 | Kritis | ✅ | `prisma migrate dev` diarahkan ke DB dev remote bersama (butuh shadow DB, bisa meminta reset) | `data-model.md` → Migrasi: `migrate dev` hanya ke Postgres lokal (`db:migrate:local`), remote hanya `migrate deploy` (`db:deploy:dev`, `migrate-prod.yml`), migrasi yang sudah diterapkan dilarang diedit. Skrip diperbarui di `struktur-kode.md`; workflow di `tasks.md` → Database & Lingkungan |
| 2 | Kritis | ✅ | Objek SQL manual tidak dikenal Prisma → `DROP` di migrasi berikutnya; gate drift selalu merah | `data-model.md`: composite FK & `seq` dimodelkan di `schema.prisma`; daftar `prisma/manual-objects.sql.md`; aturan review menghapus `DROP` objek manual; gate `migrate diff` diganti `skema.test.ts`. `struktur-kode.md` (pohon, CI) & `tasks.md` #2 diselaraskan |
| 3 | Kritis | ✅ | `forOutlet()` memanggil `$extends` pada `TransactionClient` | `struktur-kode.md`: `forOutlet(client: PrismaClient, …)`, `withTx` = `db.forOutlet(id).$transaction(fn)`; `alur-domain.md` → Prinsip; `tasks.md` #2 |
| 4 | Kritis | ✅ | Shell `/kasir` di-precache padahal dinamis (nonce) & dilindungi middleware; `/offline` tidak publik | `offline-pwa.md` → Pengisian Cache Shell Kasir (`WARM_SHELL`, header `x-pd-shell`, cache runtime, kunci `/struk/_shell`, `/offline` di-precache); `auth-akses.md` (matcher mengecualikan `/offline`, header shell); FRD `auth.md` (route `/offline` publik); `api.md` (tabel halaman); `tasks.md` #4, #18 |
| 5 | Kritis | ✅ | `Origin` Preview lewat URL branch ≠ `VERCEL_URL` → semua mutasi 403 | `infra-operasional.md`: `APP_URL` + `APP_ORIGINS` turunan (Production / Preview `VERCEL_URL` + `VERCEL_BRANCH_URL` / lokal); `auth-akses.md` route guard; `api.md` konvensi |
| 6 | Kritis | ✅ | Reset demo memakai timeout transaksi 10 detik, target 20 detik | `alur-domain.md` → Reset Harian: `timeout: 55_000`, `maxWait: 5_000`, insert `unnest`; Prinsip mencantumkan pengecualian timeout |
| 7 | Kritis | ✅ | Materialisasi demo membuka transaksi bersarang dengan `connection_limit=1` → hang, atau advisory lock tidak efektif | `alur-domain.md`: `buatTransaksiDalamTx` + pembungkus; materialisasi = satu transaksi (`timeout 20_000`) berisi advisory lock + loop; `struktur-kode.md` → larangan transaksi bersarang; `tasks.md` #9, #24a |
| 8 | Keputusan terbuka | ✅ | Versi library tidak dikunci | `architecture/README.md` → Versi Dikunci (Next `^15`, Prisma `^6`, Zod `^4`, dll., `packageManager`, `engines`); `tasks.md` #1a |
| 9 | Keputusan terbuka | ✅ | Rute `/` tidak ada; klaim manifest keliru | Rute `/` = pengarah sesuai sesi & peran (`auth-akses.md` → Rute `/`, FRD `auth.md`, `api.md`, `struktur-kode.md`); manifest `start_url: "/kasir"` untuk semua peran (`offline-pwa.md`) |
| 10 | Keputusan terbuka | ✅ | Redirect ke `/onboarding` tidak bisa diputuskan middleware | Client selalu ke `/`; server memutuskan (FRD `auth.md` → Redirect Setelah Login, `auth-akses.md`); `getPageContext()` menjaga `/dashboard` ↔ `/onboarding`; `tasks.md` #4 (logika) & #5 (`page.tsx`) |
| 11 | Keputusan terbuka | ✅ | Jalur cadangan spike #0 belum final | `architecture/README.md` → Risiko R1–R12 dengan jalur utama & cadangan final: R1 `kasir.example.com`; R2 ban 1 detik; R3 `jose` + JWKS; R4 satu statement CTE; R5 GitHub Actions `demo-reset.yml`; R12 polling. Detail di `auth-akses.md` & `alur-domain.md`; `tasks.md` #0 |
| 12 | Keputusan terbuka | ✅ | Cara uji Route Handler (cookies) & rate limit tidak dapat dijalankan | `struktur-kode.md` → Strategi Testing: suite `tests/http` terhadap `next start` lokal; rate limit = unit dengan Redis tiruan + 1 E2E smoke Preview; `tasks.md` #4, #23 |
| 13 | Keputusan terbuka | ✅ | E2E diwajibkan sebelum gate E2E ada; lingkungan & isolasi data tidak jelas | `tasks.md` → PR Gate (E2E lokal sejak #5, smoke Preview sejak #14 dengan bypass); outlet baru per tes (`struktur-kode.md`, `frontend-guide.md` §14) |
| 14 | Keputusan terbuka | ✅ | Banyak file tanpa pemilik | `tasks.md` → Tim & Kepemilikan: semua file konfigurasi, root `app/*`, `public/`, workflow, folder tes dipetakan ke A / B / Bersama; aturan PR dependensi |
| 15 | Keputusan terbuka | ✅ 🔁 | SMTP, uptime monitor, log drain belum dipilih | `infra-operasional.md`: **Brevo** (single sender verification, cocok dengan domain `*.vercel.app`), **UptimeRobot**, **tanpa Log Drain**. Ini mengganti usulan awal "Resend" karena Resend butuh domain sendiri |
| 16 | Keputusan terbuka | ✅ | 304 snapshot tidak memperbarui waktu sinkron | Header `X-Waktu-Server` pada 200/304 (`alur-domain.md`, `api.md`, FRD `offline-sync.md`) |
| 17 | Keputusan terbuka | ✅ | Desain memakai data/filter yang tidak ada di API FRD | `layar-pemilik.md`: "Dipakai di N menu" tanpa nama; info batal/koreksi teks tanpa link; "diperbarui ‹jam›" = jam client saat respons diterima. `layar-publik-auth.md`: pesan 429 tanpa angka menit |
| 18 | Keputusan terbuka | ✅ | Input harga per satuan butuh 2 desimal, `InputRupiah` integer | `komponen.md` §2.1: prop `desimal={2}`; dipakai `layar-pemilik.md` §3.2/§3.3; `tasks.md` #5, #10 |
| 19 | Keputusan terbuka | ✅ | Dua opsi: letak riwayat opname; DB lokal | Riwayat opname = tab "Riwayat" di `/opname` (`layar-pemilik.md` §7.2, `tasks.md` #20b); lokal & CI = Supabase CLI lokal (`infra-operasional.md`) |
| 20 | Keputusan terbuka | ✅ | 5 kasus 422 tanpa kode | `api.md` → Kode Error: 422 tanpa kode spesifik = `VALIDASI_GAGAL` + `detail.<field>`, kelima kasus dirinci |
| 21 | Keputusan terbuka | ✅ 🔁 | Approver PR belum ditetapkan | `tasks.md` → GitHub Workflow → Approval (agen lain untuk PR biasa; pemilik proyek untuk `kontrak`/migrasi/keamanan & `migrate-prod.yml`) |
| 22 | Sedang | ✅ | Dependensi Phase 1 issue gabungan bertentangan dengan grafik | `tasks.md`: dipecah menjadi #19a/#19b, #20a/#20b, #21a/#21b, #22a/#22b, #24a/#24b; grafik diperbarui; `frontend-guide.md` §3–§4 |
| 23 | Sedang | ✅ | #0 butuh infra #1; #4 tidak menunggu #0 | `tasks.md`: #0 depends #1a; #4 depends #0, #2, #3 |
| 24 | Sedang | ✅ | #1 dikerjakan dua agen | Dipecah #1a (A) & #1b (B) |
| 25 | Sedang | ✅ | `/akun` di #5 dan #12 | `/akun` hanya di #5 |
| 26 | Sedang | ✅ | Sheet Tambah Bahan dibangun di dua issue | Milik #10 (`components/pemilik/sheet-tambah-bahan.tsx`); #11 depends #10 |
| 27 | Sedang | ✅ | Login (#5) menulis `profil` yang baru dibuat di #13 | `profil` & `meta` dibuat di #5; `nama` dari `user_metadata.nama` (`auth-akses.md`); #13 hanya menambah `snapshot`/`keranjang` |
| 28 | Sedang | ✅ | Gate CI aktif sebelum prasyaratnya ada | `tasks.md` → PR Gate (kolom "Aktif sejak"); `struktur-kode.md` → CI/CD |
| 29 | Sedang | ✅ | "CI tidak pernah menerapkan migrasi" vs `migrate-prod.yml` | Ditulis ulang: `ci.yml` tidak pernah; hanya `migrate-prod.yml` ke prod (`tasks.md`, `struktur-kode.md`) |
| 30 | Sedang | ✅ | `iat` presisi detik vs `sesi_valid_sejak` mikrodetik | `sesi_valid_sejak = date_trunc('second', now())`, bandingkan dengan epoch (`auth-akses.md`, `data-model.md`); uji di `tasks.md` #4 |
| 31 | Sedang | ✅ | Batas 50 materialisasi bertentangan dengan FRD | Mengikuti FRD: semua rencana jam ≤ sekarang (`alur-domain.md`) |
| 32 | Sedang | ✅ | Target reset 20 vs 30 detik | Disatukan **< 20 detik** (`tasks.md` #0, #24a; `architecture/README.md` R5) |
| 33 | Sedang | ✅ | Shell/guard di layout route group salah untuk onboarding, `/s`, kasir di `/bahan` | `struktur-kode.md` → Route group & layout (tanpa shell & guard di layout; per `page.tsx`); `onboarding` pindah ke `(publik)`; `frontend-guide.md` §5 |
| 34 | Sedang | ✅ | Urutan build frontend-guide ≠ tasks | `frontend-guide.md` §4 mengikuti nomor issue (#18 lalu #17) |
| 35 | Sedang | ✅ | #6 butuh HPP dari #7 ("stub boleh") | `hitung-ulang` + advisory lock pindah ke #6; #7 memakainya |
| 36 | Minor | ✅ | Folder rujukan tidak ada di pohon | `struktur-kode.md`: `components/bersama`, `components/shell`, `client/hooks`, `client/fixtures`, `app/dev`, root `app/*`, `tests/http`, `manual-objects.sql.md` |
| 37 | Minor | ✅ | Alat uji tidak sama | `struktur-kode.md` (Testing Library, `fake-indexeddb`); `tasks.md` #1b |
| 38 | Minor | ✅ | `tasks.md` tidak merujuk `frontend-guide.md` | Rujukan di semua issue UI, DoD, dan prioritas dokumen |
| 39 | Minor | ✅ | Struk memakai nama hari, tidak sesuai NFR-07 | `layar-kasir.md` §5, `layar-publik-auth.md` §6, `design/README.md` model konten |
| 40 | Minor | ✅ | `<img>` memicu lint | `frontend-guide.md` §10: komponen tunggal `foto-menu.tsx` + override ESLint; `tokens.md` §6 |
| 41 | Minor | ✅ | RLS arsitektur lebih ketat dari FRD | FRD `auth.md` → Isolasi Outlet diperbarui (SELECT hanya pemilik, tanpa policy tulis) |
| 42 | Minor | ✅ | Daftar risiko #0 tidak sinkron | Risiko diberi nomor R1–R12 dengan kolom "Diverifikasi di" (issue pemilik) |
| 43 | Minor | ✅ | Pembagian file `/s/[token]` antara A & B tidak jelas | `tasks.md` #9 (A: `struk-publik.ts`), #13 (B: `page.tsx`) |
| 44 | Minor | ✅ | Opsi `variable` font tidak disebut | `tokens.md` → Tipografi: `variable: "--font-inter"` di root layout |
| 45 | Sedang (ditemukan saat perbaikan) | ✅ | FRD `auth.md`/`menu.md` menyebut Storage "policy per prefix" untuk baca, arsitektur memakai bucket public read | FRD `auth.md` & `menu.md` diperbarui: baca publik, tulis hanya via signed URL dengan validasi prefix `outlet_id` (selaras `infra-operasional.md`) |
| 46 | Sedang (ditemukan saat perbaikan) | ✅ | `profil.nama` offline tidak punya sumber data (JWT tidak memuat nama) | `user_metadata.nama` diisi saat daftar & buat/ubah kasir (`auth-akses.md`, `tasks.md` #4, #6) |

## Keputusan atas Pertanyaan

| # | Pertanyaan | Keputusan | Alasan | Ubah di (jika pemilik ingin berbeda) |
|---|---|---|---|---|
| 1 | Domain produksi | 🔁 `https://pusat-dapur.vercel.app`; jika tidak tersedia, domain `*.vercel.app` yang diberikan Vercel (dicatat di `APP_URL`) | Gratis (NFR-10); domain kustom = langkah pasca-kompetisi tanpa ubah kode | `infra-operasional.md`, `auth-akses.md` (Site URL), `tasks.md` H2 |
| 2 | SMTP | 🔁 Brevo, single sender | Tidak butuh domain sendiri, berbeda dengan Resend | `infra-operasional.md` → SMTP |
| 3 | Tenggat GTNIC | Tidak ada tanggal di dokumen; eksekusi mengikuti nomor issue & MVP Cutline | Rencana tetap valid berapa pun tenggatnya | `tasks.md` → MVP Cutline |
| 4 | Approver | 🔁 Agen lain (PR biasa); pemilik proyek (`kontrak`, migrasi, keamanan, `migrate-prod.yml`) | Review manusia pada titik berisiko tinggi saja | `tasks.md` → Approval |
| 5 | Batas cron Hobby | Tidak lagi relevan: jalur cadangan reset memakai GitHub Actions, bukan cron Vercel tambahan | Menghapus ketergantungan pada kuota cron | `alur-domain.md`, `architecture/README.md` R5 |
| 6 | Ketentuan non-komersial Vercel Hobby | 🔁 Hobby untuk MVP & kompetisi; pindah ke Pro sebelum monetisasi v2 | Selaras NFR-10 dan model freemium PRD | `infra-operasional.md` → Vercel; `tasks.md` → Roadmap v2.0 |
| 7 | Batas materialisasi | Mengikuti FRD (tanpa batas per panggilan) | FRD prioritas tertinggi; volume maks ±60/hari | `alur-domain.md` |
| 8 | Satu atau dua agen | 🔁 Dua agen (A/B) + "mode satu agen" (urutan nomor, sufiks `a` sebelum `b`) | Rencana berlaku di kedua skenario | `tasks.md` → Tim & Kepemilikan |
| 9 | Paket Supabase (inactivity timeout & rate limit email) | Pemilik proyek (10 Nov 2026): **Free** untuk dev & prod. Inactivity timeout 30 hari tidak diatur (fitur khusus Pro); rate limit email 3/jam hanya di prod setelah SMTP Brevo (#14) | NFR-10 (free tier) | FRD `auth.md` → Sesi, `non-functional.md` NFR-04, `auth-akses.md` → Supabase: Konfigurasi Wajib |
| 10 | Dependensi tooling di luar Versi Dikunci | Disetujui pemilik proyek saat #1a: `eslint@^9`, `@eslint/eslintrc@^3`, `eslint-plugin-boundaries@^5`, `prettier@^3`, `server-only`, `@types/*`; `packageManager: pnpm@10.34.9` | Diminta checklist #1a / dibutuhkan tooling Next 15 | `architecture/README.md` → Versi Dikunci |

## Aksi Manusia

Dipindahkan ke `tasks.md` → **Aksi Pemilik Proyek (prasyarat manusia)** (H1–H10), lengkap dengan issue yang menunggu setiap aksi. Yang pertama: **H1 (buat repo GitHub)**, karena folder proyek belum menjadi repo git.

## Verifikasi Konsistensi Pasca-Perbaikan

- Pencarian ulang di seluruh `docs/` tidak menemukan lagi `db:migrate:dev`, `APP_ORIGIN` tunggal, gate `prisma migrate diff`, `TransactionClient` pada `forOutlet`, "precache dari route statis", "maks 50 transaksi", "< 30 detik", "Resend", maupun nomor issue lama (#19/#20/#21/#22/#24 tanpa sufiks, #1 tanpa sufiks).
- Rujukan bagian di `tasks.md` (FRD, `layar-*.md` §…, `komponen.md`, `tokens.md` §8, `frontend-guide.md` §16, `architecture/README.md` R1–R12) semuanya ada.
- Urutan prioritas dokumen di `tasks.md` (FRD/PRD > architecture > design > frontend-guide > tasks) konsisten dengan `design/README.md` (FRD/PRD > design > design-reference) dan tabel sumber kebenaran di `frontend-guide.md`.
