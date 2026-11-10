# Objek SQL Manual

Objek yang tidak dimodelkan di `schema.prisma` dan ditulis manual di file migrasi
(`docs/architecture/data-model.md` → Migrasi). Prisma tidak mengenalnya, sehingga migrasi
baru bisa berisi `DROP INDEX` / `DROP CONSTRAINT` / `DROP TRIGGER` untuk objek di bawah:
**hapus baris itu sebelum commit**.

`tests/integration/skema.test.ts` membaca tabel di bawah dan memastikan setiap objek ada
setelah `migrate deploy` dari nol. Kolom `Jenis`: `constraint` (`pg_constraint`), `index`
(`pg_indexes`), `trigger` (`pg_trigger`), `policy` (`pg_policies`), `function`
(`pg_proc`, `Tabel` = schema), `rls` (`relrowsecurity`), `publication` (`pg_publication_tables`,
`Nama` = publication).

Catatan: `users_id_auth_fkey` tidak dibuat di shadow DB `prisma migrate dev` (tanpa schema
`auth`); di Supabase lokal/CI/dev/prod selalu ada.

| Jenis       | Nama                             | Tabel              | Migrasi                   |
| ----------- | -------------------------------- | ------------------ | ------------------------- |
| constraint  | users_id_auth_fkey               | users              | 20261110134039_skema_awal |
| constraint  | outlets_ambang_margin_check      | outlets            | 20261110134039_skema_awal |
| constraint  | users_username_kasir_check       | users              | 20261110134039_skema_awal |
| constraint  | bahan_baku_stok_check            | bahan_baku         | 20261110134039_skema_awal |
| constraint  | bahan_baku_threshold_check       | bahan_baku         | 20261110134039_skema_awal |
| constraint  | bahan_baku_harga_check           | bahan_baku         | 20261110134039_skema_awal |
| constraint  | riwayat_harga_awal_check         | riwayat_harga_beli | 20261110134039_skema_awal |
| constraint  | riwayat_harga_ref_check          | riwayat_harga_beli | 20261110134039_skema_awal |
| constraint  | menus_harga_jual_check           | menus              | 20261110134039_skema_awal |
| constraint  | resep_detail_takaran_check       | resep_detail       | 20261110134039_skema_awal |
| constraint  | transaksi_nomor_struk_check      | transaksi          | 20261110134039_skema_awal |
| constraint  | transaksi_total_check            | transaksi          | 20261110134039_skema_awal |
| constraint  | transaksi_tunai_check            | transaksi          | 20261110134039_skema_awal |
| constraint  | transaksi_batal_check            | transaksi          | 20261110134039_skema_awal |
| constraint  | detail_transaksi_qty_check       | detail_transaksi   | 20261110134039_skema_awal |
| constraint  | detail_transaksi_subtotal_check  | detail_transaksi   | 20261110134039_skema_awal |
| constraint  | stok_mutasi_jumlah_check         | stok_mutasi        | 20261110134039_skema_awal |
| constraint  | stok_mutasi_tanda_check          | stok_mutasi        | 20261110134039_skema_awal |
| constraint  | stok_mutasi_ref_check            | stok_mutasi        | 20261110134039_skema_awal |
| constraint  | restock_log_total_harga_check    | restock_log        | 20261110134039_skema_awal |
| constraint  | stok_opname_detail_selisih_check | stok_opname_detail | 20261110134039_skema_awal |
| constraint  | stok_alert_dibaca_check          | stok_alert         | 20261110134039_skema_awal |
| index       | uq_outlets_demo                  | outlets            | 20261110134039_skema_awal |
| index       | uq_users_username                | users              | 20261110134039_skema_awal |
| index       | uq_users_pemilik                 | users              | 20261110134039_skema_awal |
| index       | uq_bahan_nama                    | bahan_baku         | 20261110134039_skema_awal |
| index       | uq_menus_nama                    | menus              | 20261110134039_skema_awal |
| index       | uq_alert_aktif                   | stok_alert         | 20261110134039_skema_awal |
| index       | idx_alert_unread                 | stok_alert         | 20261110134039_skema_awal |
| index       | idx_mutasi_ref                   | stok_mutasi        | 20261110134039_skema_awal |
| function    | outlet_id                        | app                | 20261110134039_skema_awal |
| function    | is_pemilik                       | app                | 20261110134039_skema_awal |
| function    | append_only                      | app                | 20261110134039_skema_awal |
| function    | transaksi_immutable              | app                | 20261110134039_skema_awal |
| function    | set_updated_at                   | app                | 20261110134039_skema_awal |
| trigger     | trg_append_only                  | stok_mutasi        | 20261110134039_skema_awal |
| trigger     | trg_append_only                  | riwayat_harga_beli | 20261110134039_skema_awal |
| trigger     | trg_append_only                  | detail_transaksi   | 20261110134039_skema_awal |
| trigger     | trg_transaksi_immutable          | transaksi          | 20261110134039_skema_awal |
| trigger     | trg_updated_at                   | outlets            | 20261110134039_skema_awal |
| trigger     | trg_updated_at                   | bahan_baku         | 20261110134039_skema_awal |
| trigger     | trg_updated_at                   | menus              | 20261110134039_skema_awal |
| trigger     | trg_updated_at                   | transaksi_gagal    | 20261110134039_skema_awal |
| rls         | outlets                          | outlets            | 20261110134039_skema_awal |
| rls         | users                            | users              | 20261110134039_skema_awal |
| rls         | bahan_baku                       | bahan_baku         | 20261110134039_skema_awal |
| rls         | riwayat_harga_beli               | riwayat_harga_beli | 20261110134039_skema_awal |
| rls         | menus                            | menus              | 20261110134039_skema_awal |
| rls         | resep_detail                     | resep_detail       | 20261110134039_skema_awal |
| rls         | transaksi                        | transaksi          | 20261110134039_skema_awal |
| rls         | detail_transaksi                 | detail_transaksi   | 20261110134039_skema_awal |
| rls         | stok_mutasi                      | stok_mutasi        | 20261110134039_skema_awal |
| rls         | restock_log                      | restock_log        | 20261110134039_skema_awal |
| rls         | stok_opname                      | stok_opname        | 20261110134039_skema_awal |
| rls         | stok_opname_detail               | stok_opname_detail | 20261110134039_skema_awal |
| rls         | stok_alert                       | stok_alert         | 20261110134039_skema_awal |
| rls         | transaksi_gagal                  | transaksi_gagal    | 20261110134039_skema_awal |
| policy      | pemilik_select                   | outlets            | 20261110134039_skema_awal |
| policy      | pemilik_select                   | users              | 20261110134039_skema_awal |
| policy      | pemilik_select                   | bahan_baku         | 20261110134039_skema_awal |
| policy      | pemilik_select                   | riwayat_harga_beli | 20261110134039_skema_awal |
| policy      | pemilik_select                   | menus              | 20261110134039_skema_awal |
| policy      | pemilik_select                   | resep_detail       | 20261110134039_skema_awal |
| policy      | pemilik_select                   | transaksi          | 20261110134039_skema_awal |
| policy      | pemilik_select                   | detail_transaksi   | 20261110134039_skema_awal |
| policy      | pemilik_select                   | stok_mutasi        | 20261110134039_skema_awal |
| policy      | pemilik_select                   | restock_log        | 20261110134039_skema_awal |
| policy      | pemilik_select                   | stok_opname        | 20261110134039_skema_awal |
| policy      | pemilik_select                   | stok_opname_detail | 20261110134039_skema_awal |
| policy      | pemilik_select                   | stok_alert         | 20261110134039_skema_awal |
| policy      | pemilik_select                   | transaksi_gagal    | 20261110134039_skema_awal |
| publication | supabase_realtime                | stok_alert         | 20261110134039_skema_awal |

Grant/revoke (diuji perilakunya di `rls.test.ts`, bukan katalog): `REVOKE ALL` tabel & sequence
`public` dari `anon`/`authenticated` (termasuk default privileges role `postgres`), `GRANT SELECT`
14 tabel ke `authenticated`, `USAGE` schema `app` + `EXECUTE` `app.outlet_id()`/`app.is_pemilik()`
ke `authenticated`. Tabel baru di migrasi berikutnya wajib `ENABLE ROW LEVEL SECURITY`, policy
`pemilik_select`, dan `GRANT SELECT ... TO authenticated` eksplisit.
