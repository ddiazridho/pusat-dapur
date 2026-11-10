// Seed data uji: 2 outlet, masing-masing 1 pemilik + 1 kasir, bahan & menu dari template resep.
// `pnpm seed:dev` (docs/architecture/infra-operasional.md → Lingkungan: lokal/CI dan dev).
// Idempoten per outlet (ID tetap): outlet yang sudah ada dilewati.
// ponytail: bila insert DB gagal setelah user Auth dibuat, user Auth tertinggal; jalankan
// `supabase db reset` (lokal). Tambah kompensasi bila seed dipakai rutin di dev.
//
// Env: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_DEV_PASSWORD.
// Tanpa env → Supabase CLI lokal (`supabase status`), kata sandi default hanya untuk lokal.
import { execFileSync } from 'node:child_process';
import { Prisma, PrismaClient } from '@prisma/client';

// Import relatif + ekstensi .ts: dijalankan Node --experimental-strip-types (tanpa alias @/).
import { DOMAIN_EMAIL_KASIR } from '../src/shared/akun.ts';
import { TEMPLATE_RESEP } from '../src/shared/templates/resep.ts';

// Data uji saja (bukan FRD): harga beli per satuan, stok awal, threshold, harga jual.
const BAHAN_UJI: Record<string, { harga: string; stok: string; threshold: string }> = {
  'Nasi putih': { harga: '14.00', stok: '10000', threshold: '2000' },
  'Telur ayam': { harga: '2000.00', stok: '60', threshold: '10' },
  'Kecap manis': { harga: '30.00', stok: '1000', threshold: '200' },
  'Minyak goreng': { harga: '18.00', stok: '2000', threshold: '500' },
  'Bawang merah': { harga: '40.00', stok: '500', threshold: '100' },
  'Bawang putih': { harga: '35.00', stok: '500', threshold: '100' },
  Garam: { harga: '5.00', stok: '1000', threshold: '100' },
  'Mie basah': { harga: '12.00', stok: '3000', threshold: '600' },
  'Daging ayam': { harga: '45.00', stok: '2000', threshold: '500' },
  'Sawi hijau': { harga: '15.00', stok: '1000', threshold: '200' },
  'Mi instan': { harga: '3000.00', stok: '40', threshold: '10' },
  'Teh celup': { harga: '250.00', stok: '100', threshold: '20' },
  'Gula pasir': { harga: '16.00', stok: '3000', threshold: '500' },
  'Es batu': { harga: '1.00', stok: '0', threshold: '1000' },
  'Jeruk peras': { harga: '1500.00', stok: '30', threshold: '10' },
  'Kopi bubuk': { harga: '120.00', stok: '500', threshold: '100' },
  'Susu kental manis': { harga: '25.00', stok: '1000', threshold: '200' },
};
const HARGA_JUAL_UJI: Record<string, number> = {
  'nasi-goreng': 15000,
  'mie-ayam': 15000,
  'mie-goreng-telur': 12000,
  'nasi-telur-dadar': 12000,
  'es-teh-manis': 5000,
  'teh-manis-panas': 4000,
  'es-jeruk': 7000,
  'kopi-susu': 8000,
};

const OUTLET_UJI = [
  {
    id: '00000000-0000-4000-8000-00000000000a',
    nama_outlet: 'Warung Uji A',
    pemilik: { nama: 'Pemilik A', email: 'pemilik.a@dev.example.com' },
    kasir: { nama: 'Kasir A', username: 'kasir.a' },
  },
  {
    id: '00000000-0000-4000-8000-00000000000b',
    nama_outlet: 'Warung Uji B',
    pemilik: { nama: 'Pemilik B', email: 'pemilik.b@dev.example.com' },
    kasir: { nama: 'Kasir B', username: 'kasir.b' },
  },
];

function envLokal(): Record<string, string> {
  const keluaran = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return Object.fromEntries(
    keluaran
      .split(/\r?\n/)
      .map((baris) => /^([A-Z_]+)="?(.*?)"?$/.exec(baris))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

const lokal = process.env.SUPABASE_SECRET_KEY ? undefined : envLokal();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? lokal?.API_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? lokal?.SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL ?? lokal?.DB_URL;
if (!SUPABASE_URL || !SECRET_KEY || !DATABASE_URL)
  throw new Error('seed-dev: env Supabase/DB tidak lengkap.');
const hostLokal = ['127.0.0.1', 'localhost'].includes(new URL(SUPABASE_URL).hostname);
const PASSWORD = process.env.SEED_DEV_PASSWORD ?? (hostLokal ? 'sandi-uji-lokal' : undefined);
if (!PASSWORD || PASSWORD.length < 8)
  throw new Error('seed-dev: SEED_DEV_PASSWORD (8–72 karakter) wajib di luar lokal.');

async function buatUserAuth(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SECRET_KEY!,
      Authorization: `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, password: PASSWORD, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`seed-dev: buat user ${String(body.email)} gagal: ${res.status}`);
  return ((await res.json()) as { id: string }).id;
}

const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });

async function seedOutlet(o: (typeof OUTLET_UJI)[number]) {
  if (await prisma.outlet.findUnique({ where: { id: o.id } })) {
    console.log(`seed-dev: ${o.nama_outlet} sudah ada, dilewati.`);
    return;
  }
  const meta = { outlet_id: o.id, read_only: false };
  const pemilikId = await buatUserAuth({
    email: o.pemilik.email,
    user_metadata: { nama: o.pemilik.nama },
    app_metadata: { ...meta, peran: 'pemilik' },
  });
  const kasirId = await buatUserAuth({
    email: `${o.kasir.username}@${DOMAIN_EMAIL_KASIR}`,
    app_metadata: { ...meta, peran: 'kasir' },
  });

  await prisma.$transaction(async (tx) => {
    await tx.outlet.create({
      data: { id: o.id, nama_outlet: o.nama_outlet, onboarding_selesai: true },
    });
    await tx.user.createMany({
      data: [
        { id: pemilikId, outlet_id: o.id, peran: 'pemilik', nama: o.pemilik.nama },
        {
          id: kasirId,
          outlet_id: o.id,
          peran: 'kasir',
          nama: o.kasir.nama,
          username: o.kasir.username,
        },
      ],
    });

    const bahanId = new Map<string, { id: string; harga: Prisma.Decimal }>();
    const semuaBahan = new Map(
      TEMPLATE_RESEP.flatMap((t) => t.bahan.map((x) => [x.nama_bahan, x.satuan] as const)),
    );
    for (const [nama, satuan] of semuaBahan) {
      const uji = BAHAN_UJI[nama]!;
      const bahan = await tx.bahanBaku.create({
        data: {
          outlet_id: o.id,
          nama,
          satuan,
          stok_saat_ini: uji.stok,
          threshold_min: uji.threshold,
          harga_beli_per_satuan: uji.harga,
        },
      });
      bahanId.set(nama, { id: bahan.id, harga: new Prisma.Decimal(uji.harga) });
      // FRD bahan-baku.md → POST /api/bahan-baku: riwayat awal, mutasi stok_awal bila > 0,
      // alert stok_menipis bila stok < threshold.
      await tx.riwayatHargaBeli.create({
        data: {
          outlet_id: o.id,
          bahan_baku_id: bahan.id,
          harga_baru: uji.harga,
          sumber: 'awal',
          user_id: pemilikId,
        },
      });
      if (bahan.stok_saat_ini.gt(0))
        await tx.stokMutasi.create({
          data: {
            outlet_id: o.id,
            bahan_baku_id: bahan.id,
            jenis: 'stok_awal',
            jumlah: uji.stok,
            user_id: pemilikId,
          },
        });
      if (bahan.stok_saat_ini.lt(bahan.threshold_min))
        await tx.stokAlert.create({
          data: { outlet_id: o.id, bahan_baku_id: bahan.id, jenis: 'stok_menipis' },
        });
    }

    for (const t of TEMPLATE_RESEP) {
      // hpp-margin.md: Σ harga_beli_per_satuan × takaran, numeric(18,2) half-up.
      const hpp = t.bahan
        .reduce(
          (total, x) => total.add(bahanId.get(x.nama_bahan)!.harga.mul(x.takaran)),
          new Prisma.Decimal(0),
        )
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const menu = await tx.menu.create({
        data: {
          outlet_id: o.id,
          nama: t.nama_menu,
          harga_jual: HARGA_JUAL_UJI[t.kode]!,
          hpp_cached: hpp,
        },
      });
      await tx.resepDetail.createMany({
        data: t.bahan.map((x) => ({
          outlet_id: o.id,
          menu_id: menu.id,
          bahan_baku_id: bahanId.get(x.nama_bahan)!.id,
          takaran: x.takaran,
        })),
      });
    }
  });
  console.log(
    `seed-dev: ${o.nama_outlet} dibuat (pemilik ${o.pemilik.email}, kasir ${o.kasir.username}).`,
  );
}

try {
  for (const o of OUTLET_UJI) await seedOutlet(o);
} finally {
  await prisma.$disconnect();
}
