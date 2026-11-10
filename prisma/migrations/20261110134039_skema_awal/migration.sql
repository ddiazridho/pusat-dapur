-- CreateEnum
CREATE TYPE "peran" AS ENUM ('pemilik', 'kasir');

-- CreateEnum
CREATE TYPE "zona_waktu" AS ENUM ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura');

-- CreateEnum
CREATE TYPE "satuan" AS ENUM ('gram', 'ml', 'buah');

-- CreateEnum
CREATE TYPE "satuan_input" AS ENUM ('gram', 'kg', 'ml', 'liter', 'buah');

-- CreateEnum
CREATE TYPE "tipe_pesanan" AS ENUM ('dine_in', 'takeaway');

-- CreateEnum
CREATE TYPE "metode_bayar" AS ENUM ('tunai', 'qris');

-- CreateEnum
CREATE TYPE "status_transaksi" AS ENUM ('selesai', 'dibatalkan');

-- CreateEnum
CREATE TYPE "alasan_batal" AS ENUM ('salah_input', 'pelanggan_batal', 'lainnya');

-- CreateEnum
CREATE TYPE "jenis_mutasi" AS ENUM ('stok_awal', 'penjualan', 'restock', 'opname', 'koreksi_sync', 'pembatalan');

-- CreateEnum
CREATE TYPE "sumber_harga" AS ENUM ('awal', 'restock', 'koreksi');

-- CreateEnum
CREATE TYPE "alasan_opname" AS ENUM ('susut', 'tumpah_rusak', 'salah_catat', 'lainnya');

-- CreateEnum
CREATE TYPE "jenis_alert" AS ENUM ('stok_menipis', 'stok_tidak_sinkron');

-- CreateTable
CREATE TABLE "outlets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama_outlet" TEXT NOT NULL,
    "zona_waktu" "zona_waktu" NOT NULL DEFAULT 'Asia/Jakarta',
    "ambang_margin" SMALLINT NOT NULL DEFAULT 20,
    "blokir_stok_kurang" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_selesai" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "peran" "peran" NOT NULL,
    "read_only" BOOLEAN NOT NULL DEFAULT false,
    "nama" TEXT NOT NULL,
    "username" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sesi_valid_sejak" TIMESTAMPTZ(6) NOT NULL DEFAULT date_trunc('second'::text, now()),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bahan_baku" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan" "satuan" NOT NULL,
    "stok_saat_ini" DECIMAL(12,3) NOT NULL,
    "threshold_min" DECIMAL(12,3) NOT NULL,
    "harga_beli_per_satuan" DECIMAL(12,2) NOT NULL,
    "diarsipkan_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bahan_baku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_harga_beli" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "bahan_baku_id" UUID NOT NULL,
    "harga_lama" DECIMAL(12,2),
    "harga_baru" DECIMAL(12,2) NOT NULL,
    "sumber" "sumber_harga" NOT NULL,
    "ref_id" UUID,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_harga_beli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "harga_jual" BIGINT NOT NULL,
    "foto_url" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "hpp_cached" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resep_detail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "bahan_baku_id" UUID NOT NULL,
    "takaran" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "resep_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "client_tx_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "nomor_struk" TEXT NOT NULL,
    "token_struk" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "dibuat_oleh" UUID NOT NULL,
    "waktu_transaksi" TIMESTAMPTZ(6) NOT NULL,
    "dibuat_offline" BOOLEAN NOT NULL,
    "tipe_pesanan" "tipe_pesanan" NOT NULL,
    "metode_bayar" "metode_bayar" NOT NULL,
    "total" BIGINT NOT NULL,
    "uang_diterima" BIGINT,
    "kembalian" BIGINT,
    "koreksi_stok" BOOLEAN NOT NULL DEFAULT false,
    "status" "status_transaksi" NOT NULL DEFAULT 'selesai',
    "dibatalkan_at" TIMESTAMPTZ(6),
    "dibatalkan_oleh" UUID,
    "alasan_batal" "alasan_batal",
    "catatan_batal" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detail_transaksi" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "transaksi_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "nama_menu" TEXT NOT NULL,
    "harga_jual" BIGINT NOT NULL,
    "hpp_snapshot" DECIMAL(18,2) NOT NULL,
    "qty" SMALLINT NOT NULL,
    "subtotal" BIGINT NOT NULL,

    CONSTRAINT "detail_transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_mutasi" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seq" BIGSERIAL NOT NULL,
    "outlet_id" UUID NOT NULL,
    "bahan_baku_id" UUID NOT NULL,
    "jenis" "jenis_mutasi" NOT NULL,
    "jumlah" DECIMAL(12,3) NOT NULL,
    "ref_id" UUID,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stok_mutasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restock_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "bahan_baku_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "jumlah_input" DECIMAL(12,3) NOT NULL,
    "satuan_input" "satuan_input" NOT NULL,
    "jumlah" DECIMAL(12,3) NOT NULL,
    "total_harga" BIGINT NOT NULL,
    "harga_beli_per_satuan" DECIMAL(12,2) NOT NULL,
    "harga_beli_sebelumnya" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restock_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stok_opname_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname_detail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "stok_opname_id" UUID NOT NULL,
    "bahan_baku_id" UUID NOT NULL,
    "stok_sistem" DECIMAL(12,3) NOT NULL,
    "stok_fisik" DECIMAL(12,3) NOT NULL,
    "selisih" DECIMAL(12,3) NOT NULL,
    "alasan" "alasan_opname",
    "nilai_selisih" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stok_opname_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_alert" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "bahan_baku_id" UUID NOT NULL,
    "jenis" "jenis_alert" NOT NULL,
    "sudah_dibaca" BOOLEAN NOT NULL DEFAULT false,
    "dibaca_at" TIMESTAMPTZ(6),
    "ditutup_otomatis" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stok_alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi_gagal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "client_tx_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "pesan_error" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ditangani_at" TIMESTAMPTZ(6),
    "ditangani_otomatis" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "transaksi_gagal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_outlet_id_key" ON "users"("id", "outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "bahan_baku_id_outlet_id_key" ON "bahan_baku"("id", "outlet_id");

-- CreateIndex
CREATE INDEX "idx_riwayat_harga_bahan" ON "riwayat_harga_beli"("bahan_baku_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "menus_id_outlet_id_key" ON "menus"("id", "outlet_id");

-- CreateIndex
CREATE INDEX "idx_resep_menu" ON "resep_detail"("menu_id");

-- CreateIndex
CREATE INDEX "idx_resep_bahan" ON "resep_detail"("bahan_baku_id");

-- CreateIndex
CREATE UNIQUE INDEX "resep_detail_menu_id_bahan_baku_id_key" ON "resep_detail"("menu_id", "bahan_baku_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_token_struk_key" ON "transaksi"("token_struk");

-- CreateIndex
CREATE INDEX "idx_transaksi_outlet_date" ON "transaksi"("outlet_id", "waktu_transaksi" DESC);

-- CreateIndex
CREATE INDEX "idx_transaksi_outlet_created" ON "transaksi"("outlet_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_id_outlet_id_key" ON "transaksi"("id", "outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_outlet_id_client_tx_id_key" ON "transaksi"("outlet_id", "client_tx_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_outlet_id_nomor_struk_key" ON "transaksi"("outlet_id", "nomor_struk");

-- CreateIndex
CREATE INDEX "idx_detail_transaksi" ON "detail_transaksi"("transaksi_id");

-- CreateIndex
CREATE INDEX "idx_detail_outlet_menu" ON "detail_transaksi"("outlet_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "detail_transaksi_transaksi_id_menu_id_key" ON "detail_transaksi"("transaksi_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "stok_mutasi_seq_key" ON "stok_mutasi"("seq");

-- CreateIndex
CREATE INDEX "idx_mutasi_bahan" ON "stok_mutasi"("bahan_baku_id", "seq" DESC);

-- CreateIndex
CREATE INDEX "idx_restock_outlet_created" ON "restock_log"("outlet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_opname_outlet_created" ON "stok_opname"("outlet_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "stok_opname_id_outlet_id_key" ON "stok_opname"("id", "outlet_id");

-- CreateIndex
CREATE INDEX "idx_opname_detail_bahan_created" ON "stok_opname_detail"("bahan_baku_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "stok_opname_detail_stok_opname_id_bahan_baku_id_key" ON "stok_opname_detail"("stok_opname_id", "bahan_baku_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_gagal_outlet_id_client_tx_id_key" ON "transaksi_gagal"("outlet_id", "client_tx_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bahan_baku" ADD CONSTRAINT "bahan_baku_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_harga_beli" ADD CONSTRAINT "riwayat_harga_beli_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_harga_beli" ADD CONSTRAINT "riwayat_harga_beli_bahan_baku_id_outlet_id_fkey" FOREIGN KEY ("bahan_baku_id", "outlet_id") REFERENCES "bahan_baku"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_harga_beli" ADD CONSTRAINT "riwayat_harga_beli_user_id_outlet_id_fkey" FOREIGN KEY ("user_id", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep_detail" ADD CONSTRAINT "resep_detail_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep_detail" ADD CONSTRAINT "resep_detail_menu_id_outlet_id_fkey" FOREIGN KEY ("menu_id", "outlet_id") REFERENCES "menus"("id", "outlet_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep_detail" ADD CONSTRAINT "resep_detail_bahan_baku_id_outlet_id_fkey" FOREIGN KEY ("bahan_baku_id", "outlet_id") REFERENCES "bahan_baku"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_user_id_outlet_id_fkey" FOREIGN KEY ("user_id", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_dibuat_oleh_outlet_id_fkey" FOREIGN KEY ("dibuat_oleh", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_dibatalkan_oleh_outlet_id_fkey" FOREIGN KEY ("dibatalkan_oleh", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_transaksi" ADD CONSTRAINT "detail_transaksi_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_transaksi" ADD CONSTRAINT "detail_transaksi_transaksi_id_outlet_id_fkey" FOREIGN KEY ("transaksi_id", "outlet_id") REFERENCES "transaksi"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_transaksi" ADD CONSTRAINT "detail_transaksi_menu_id_outlet_id_fkey" FOREIGN KEY ("menu_id", "outlet_id") REFERENCES "menus"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_bahan_baku_id_outlet_id_fkey" FOREIGN KEY ("bahan_baku_id", "outlet_id") REFERENCES "bahan_baku"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_user_id_outlet_id_fkey" FOREIGN KEY ("user_id", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_log" ADD CONSTRAINT "restock_log_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_log" ADD CONSTRAINT "restock_log_bahan_baku_id_outlet_id_fkey" FOREIGN KEY ("bahan_baku_id", "outlet_id") REFERENCES "bahan_baku"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_log" ADD CONSTRAINT "restock_log_user_id_outlet_id_fkey" FOREIGN KEY ("user_id", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_user_id_outlet_id_fkey" FOREIGN KEY ("user_id", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_detail" ADD CONSTRAINT "stok_opname_detail_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_detail" ADD CONSTRAINT "stok_opname_detail_stok_opname_id_outlet_id_fkey" FOREIGN KEY ("stok_opname_id", "outlet_id") REFERENCES "stok_opname"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_detail" ADD CONSTRAINT "stok_opname_detail_bahan_baku_id_outlet_id_fkey" FOREIGN KEY ("bahan_baku_id", "outlet_id") REFERENCES "bahan_baku"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_alert" ADD CONSTRAINT "stok_alert_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_alert" ADD CONSTRAINT "stok_alert_bahan_baku_id_outlet_id_fkey" FOREIGN KEY ("bahan_baku_id", "outlet_id") REFERENCES "bahan_baku"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_gagal" ADD CONSTRAINT "transaksi_gagal_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_gagal" ADD CONSTRAINT "transaksi_gagal_user_id_outlet_id_fkey" FOREIGN KEY ("user_id", "outlet_id") REFERENCES "users"("id", "outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================================
-- SQL MANUAL (tidak dikenal Prisma). Setiap objek tercatat di prisma/manual-objects.sql.md.
-- Rujukan: docs/architecture/data-model.md, FRD non-functional.md NFR-01/02/05.
-- =====================================================================================

-- FK ke Supabase Auth ---------------------------------------------------------------
-- Shadow DB (`prisma_shadow`, scripts/prisma-env.mjs) adalah database kosong tanpa Supabase
-- Auth. ponytail: di sana dibuat stub `auth.jwt()` saja dan FK dilewati (Prisma menolak
-- introspeksi FK lintas schema, P4002). Di Supabase (lokal/CI/dev/prod) FK selalu dibuat.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
      $f$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $f$;
  ELSE
    ALTER TABLE public.users ADD CONSTRAINT users_id_auth_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE RESTRICT;
  END IF;
END $$;

-- CHECK -----------------------------------------------------------------------------
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_ambang_margin_check"
  CHECK ("ambang_margin" BETWEEN 0 AND 100);

ALTER TABLE "users" ADD CONSTRAINT "users_username_kasir_check"
  CHECK (("peran" = 'kasir') = ("username" IS NOT NULL));

ALTER TABLE "bahan_baku" ADD CONSTRAINT "bahan_baku_stok_check"
  CHECK ("stok_saat_ini" >= 0 AND "stok_saat_ini" <= 999999999.999);
ALTER TABLE "bahan_baku" ADD CONSTRAINT "bahan_baku_threshold_check"
  CHECK ("threshold_min" >= 0);
ALTER TABLE "bahan_baku" ADD CONSTRAINT "bahan_baku_harga_check"
  CHECK ("harga_beli_per_satuan" BETWEEN 0 AND 10000000);

ALTER TABLE "riwayat_harga_beli" ADD CONSTRAINT "riwayat_harga_awal_check"
  CHECK (("sumber" = 'awal') = ("harga_lama" IS NULL));
ALTER TABLE "riwayat_harga_beli" ADD CONSTRAINT "riwayat_harga_ref_check"
  CHECK (("sumber" = 'restock') = ("ref_id" IS NOT NULL));

ALTER TABLE "menus" ADD CONSTRAINT "menus_harga_jual_check"
  CHECK ("harga_jual" BETWEEN 1 AND 10000000);

ALTER TABLE "resep_detail" ADD CONSTRAINT "resep_detail_takaran_check"
  CHECK ("takaran" > 0 AND "takaran" <= 100000);

ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_nomor_struk_check"
  CHECK ("nomor_struk" ~ '^\d{6}-[0-9A-F]{6}-\d{3,}(-\d+)?$');
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_total_check"
  CHECK ("total" > 0);
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_tunai_check"
  CHECK (("metode_bayar" = 'tunai') = ("uang_diterima" IS NOT NULL AND "kembalian" IS NOT NULL));
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_batal_check"
  CHECK (("status" = 'dibatalkan') = ("dibatalkan_at" IS NOT NULL));

ALTER TABLE "detail_transaksi" ADD CONSTRAINT "detail_transaksi_qty_check"
  CHECK ("qty" BETWEEN 1 AND 99);
ALTER TABLE "detail_transaksi" ADD CONSTRAINT "detail_transaksi_subtotal_check"
  CHECK ("subtotal" = "harga_jual" * "qty");

ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_jumlah_check"
  CHECK ("jumlah" <> 0);
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_tanda_check"
  CHECK (CASE "jenis"
    WHEN 'penjualan' THEN "jumlah" < 0
    WHEN 'opname' THEN TRUE
    ELSE "jumlah" > 0
  END);
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_ref_check"
  CHECK (("jenis" = 'stok_awal') = ("ref_id" IS NULL));

ALTER TABLE "restock_log" ADD CONSTRAINT "restock_log_total_harga_check"
  CHECK ("total_harga" BETWEEN 0 AND 100000000);

ALTER TABLE "stok_opname_detail" ADD CONSTRAINT "stok_opname_detail_selisih_check"
  CHECK ("selisih" = "stok_fisik" - "stok_sistem");

ALTER TABLE "stok_alert" ADD CONSTRAINT "stok_alert_dibaca_check"
  CHECK ("sudah_dibaca" = ("dibaca_at" IS NOT NULL));

-- Partial / expression index --------------------------------------------------------
CREATE UNIQUE INDEX "uq_outlets_demo" ON "outlets" ("is_demo") WHERE "is_demo";
CREATE UNIQUE INDEX "uq_users_username" ON "users" (lower("username")) WHERE "username" IS NOT NULL;
CREATE UNIQUE INDEX "uq_users_pemilik" ON "users" ("outlet_id") WHERE "peran" = 'pemilik';
CREATE UNIQUE INDEX "uq_bahan_nama" ON "bahan_baku" ("outlet_id", lower("nama")) WHERE "diarsipkan_at" IS NULL;
CREATE UNIQUE INDEX "uq_menus_nama" ON "menus" ("outlet_id", lower("nama"));
CREATE UNIQUE INDEX "uq_alert_aktif" ON "stok_alert" ("bahan_baku_id", "jenis") WHERE "sudah_dibaca" = false;
CREATE INDEX "idx_alert_unread" ON "stok_alert" ("outlet_id", "sudah_dibaca") WHERE "sudah_dibaca" = false;
CREATE INDEX "idx_mutasi_ref" ON "stok_mutasi" ("ref_id") WHERE "jenis" IN ('penjualan', 'koreksi_sync');

-- Fungsi helper & trigger ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app;

CREATE FUNCTION app.outlet_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'outlet_id', '')::uuid $$;

CREATE FUNCTION app.is_pemilik() RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'peran', '') = 'pemilik' $$;

-- Append-only: tolak UPDATE/DELETE, kecuali reset demo pada baris outlet is_demo.
CREATE FUNCTION app.append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.reset_demo', true) = 'on'
     AND EXISTS (SELECT 1 FROM public.outlets o WHERE o.id = OLD.outlet_id AND o.is_demo) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  RAISE EXCEPTION '% pada % ditolak: tabel append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END $$;

CREATE TRIGGER "trg_append_only" BEFORE UPDATE OR DELETE ON "stok_mutasi"
  FOR EACH ROW EXECUTE FUNCTION app.append_only();
CREATE TRIGGER "trg_append_only" BEFORE UPDATE OR DELETE ON "riwayat_harga_beli"
  FOR EACH ROW EXECUTE FUNCTION app.append_only();
CREATE TRIGGER "trg_append_only" BEFORE UPDATE OR DELETE ON "detail_transaksi"
  FOR EACH ROW EXECUTE FUNCTION app.append_only();

-- Transaksi: hanya kolom pembatalan yang boleh berubah, hanya selesai -> dibatalkan.
-- Hanya UPDATE (data-model.md); DELETE transaksi praktis tertahan detail_transaksi append-only.
CREATE FUNCTION app.transaksi_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  kolom_batal text[] := ARRAY['status', 'dibatalkan_at', 'dibatalkan_oleh', 'alasan_batal', 'catatan_batal'];
BEGIN
  IF (to_jsonb(NEW) - kolom_batal) IS DISTINCT FROM (to_jsonb(OLD) - kolom_batal) THEN
    RAISE EXCEPTION 'transaksi immutable: hanya kolom pembatalan yang boleh diubah'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF NOT (OLD.status = 'selesai' AND NEW.status = 'dibatalkan') THEN
    RAISE EXCEPTION 'transaksi immutable: status hanya boleh selesai -> dibatalkan'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "trg_transaksi_immutable" BEFORE UPDATE ON "transaksi"
  FOR EACH ROW EXECUTE FUNCTION app.transaksi_immutable();

CREATE FUNCTION app.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER "trg_updated_at" BEFORE UPDATE ON "outlets"
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER "trg_updated_at" BEFORE UPDATE ON "bahan_baku"
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER "trg_updated_at" BEFORE UPDATE ON "menus"
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER "trg_updated_at" BEFORE UPDATE ON "transaksi_gagal"
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- RLS: semua tabel bisnis; policy SELECT hanya pemilik outlet sendiri. Tanpa FORCE
-- (koneksi Prisma = postgres, pemilik tabel). Tanpa policy INSERT/UPDATE/DELETE.
ALTER TABLE "outlets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bahan_baku" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "riwayat_harga_beli" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resep_detail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaksi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "detail_transaksi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stok_mutasi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "restock_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stok_opname" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stok_opname_detail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stok_alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaksi_gagal" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pemilik_select" ON "outlets" FOR SELECT TO authenticated
  USING ("id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "users" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "bahan_baku" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "riwayat_harga_beli" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "menus" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "resep_detail" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "transaksi" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "detail_transaksi" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "stok_mutasi" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "restock_log" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "stok_opname" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "stok_opname_detail" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "stok_alert" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());
CREATE POLICY "pemilik_select" ON "transaksi_gagal" FOR SELECT TO authenticated
  USING ("outlet_id" = app.outlet_id() AND app.is_pemilik());

-- Grant: anon tanpa akses; authenticated hanya SELECT pada tabel bisnis.
-- Default privileges Supabase (GRANT ALL ke anon/authenticated untuk tabel baru milik
-- postgres) dicabut: tabel baru di migrasi berikutnya wajib GRANT SELECT eksplisit.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
GRANT SELECT ON
  "outlets", "users", "bahan_baku", "riwayat_harga_beli", "menus", "resep_detail", "transaksi",
  "detail_transaksi", "stok_mutasi", "restock_log", "stok_opname", "stok_opname_detail",
  "stok_alert", "transaksi_gagal"
  TO authenticated;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.outlet_id(), app.is_pemilik() TO authenticated;

-- Realtime: publication hanya berisi stok_alert.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE "stok_alert";
