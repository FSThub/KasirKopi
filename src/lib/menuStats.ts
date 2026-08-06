import { prisma } from "./prisma";
import {
  aturanAsosiasi,
  frequentItemsets,
  namaDasar,
  skorRelatif,
  supportSatuan,
  type Aturan,
  type ItemSupport,
  type SkorBestSeller,
  type Transaksi,
} from "./apriori";

/**
 * Jembatan antara riwayat transaksi di basis data dan algoritma Apriori.
 * Hasilnya dipakai untuk bintang best seller pada menu (kasir & pelanggan)
 * serta rekomendasi upsell.
 */

/** Ambil maksimal `batas` transaksi lunas terakhir sebagai keranjang belanja. */
export async function ambilTransaksi(batas = 500): Promise<Transaksi[]> {
  return (await ambilRiwayat(batas)).transaksi;
}

/**
 * Riwayat penjualan dalam dua bentuk sekaligus:
 *   - transaksi: keranjang berisi menu unik, untuk Apriori (support);
 *   - unit: total porsi terjual per menu, karena satu keranjang bisa memuat
 *     puluhan porsi menu yang sama dan itu tidak tercermin pada support.
 */
export async function ambilRiwayat(
  batas = 500
): Promise<{ transaksi: Transaksi[]; unit: Map<string, number> }> {
  const orders = await prisma.order.findMany({
    where: { status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: batas,
    select: { items: { select: { productId: true, name: true, quantity: true } } },
  });

  const unit = new Map<string, number>();
  const transaksi: Transaksi[] = [];
  for (const o of orders) {
    for (const i of o.items) {
      const k = kunciItem(i);
      unit.set(k, (unit.get(k) ?? 0) + i.quantity);
    }
    const keranjang = [...new Set(o.items.map(kunciItem))];
    if (keranjang.length > 0) transaksi.push(keranjang);
  }
  return { transaksi, unit };
}

/**
 * Kunci produk untuk penambangan: pakai productId bila ada supaya tahan
 * terhadap perubahan nama; bila produk sudah dihapus, mundur ke nama dasar
 * (tanpa sufiks opsi seperti "(M, Panas)").
 */
function kunciItem(i: { productId: string | null; name: string }): string {
  return i.productId ?? `nama:${namaDasar(i.name)}`;
}

export type SkorMenu = Map<string, SkorBestSeller>;

/** Umur cache skor. Peringkat best seller bergeser perlahan, jadi tidak perlu
 *  dihitung ulang tiap permintaan — kueri riwayat ke basis data jauh lebih
 *  mahal daripada perhitungan Apriori-nya sendiri. */
const UMUR_CACHE_MS = 60_000;
let cacheSkor: { waktu: number; hasil: SkorMenu } | null = null;

/**
 * Skor bintang best seller (5/4/3) per produk, dihitung dengan Apriori.
 *
 * Penilaian dilakukan PER KATEGORI: support tiap menu dibandingkan dengan
 * menu terlaris di kategorinya sendiri, bukan dengan menu terlaris seluruh
 * toko. Dengan begitu Kopi Susu, Espresso Based, Manual Brew, Non Kopi, dan
 * Snack masing-masing punya juaranya — pada penilaian global, kategori yang
 * total penjualannya kecil tidak akan pernah mendapat bintang sama sekali.
 *
 * Hasilnya dikunci dengan id produk agar pencarian di UI langsung dan tepat.
 */
export async function hitungSkorMenu(batas = 500): Promise<SkorMenu> {
  if (cacheSkor && Date.now() - cacheSkor.waktu < UMUR_CACHE_MS) return cacheSkor.hasil;
  try {
    const [{ transaksi, unit }, produk] = await Promise.all([
      ambilRiwayat(batas),
      prisma.product.findMany({ select: { id: true, name: true, categoryId: true } }),
    ]);

    const support = supportSatuan(transaksi);

    // Kelompokkan menu menurut kategorinya, lengkap dengan support & unitnya.
    const perKategori = new Map<string, ItemSupport[]>();
    for (const p of produk) {
      // Riwayat menyimpan productId; menu yang produknya pernah dihapus lalu
      // dibuat ulang dicocokkan lewat nama dasarnya.
      const alt = `nama:${namaDasar(p.name)}`;
      const s = support.get(p.id) ?? support.get(alt);
      if (!s) continue;
      const daftar = perKategori.get(p.categoryId) ?? [];
      daftar.push({
        kunci: p.id,
        support: s.support,
        count: s.count,
        unit: unit.get(p.id) ?? unit.get(alt) ?? 0,
      });
      perKategori.set(p.categoryId, daftar);
    }

    const hasil: SkorMenu = new Map();
    for (const daftar of perKategori.values()) {
      for (const [id, skor] of skorRelatif(daftar)) hasil.set(id, skor);
    }

    cacheSkor = { waktu: Date.now(), hasil };
    return hasil;
  } catch {
    // Basis data tidak tersedia (mode demo) — menu tetap tampil tanpa bintang.
    return new Map();
  }
}

/** Paksa hitung ulang, mis. setelah transaksi baru tersimpan. */
export function segarkanSkorMenu(): void {
  cacheSkor = null;
}

/** Cari skor sebuah produk (peta dikunci dengan id produk). */
export function skorProduk(
  skor: SkorMenu,
  produk: { id: string; name: string }
): SkorBestSeller | null {
  return skor.get(produk.id) ?? null;
}

/** Aturan asosiasi Apriori dari riwayat, untuk rekomendasi upsell. */
export async function hitungAturan(
  minSupport = 0.03,
  minConfidence = 0.15,
  batas = 500
): Promise<Aturan[]> {
  try {
    const transaksi = await ambilTransaksi(batas);
    if (transaksi.length === 0) return [];
    return aturanAsosiasi(frequentItemsets(transaksi, minSupport, 3), minConfidence);
  } catch {
    return [];
  }
}

/** Bentuk ringkas skor untuk dikirim ke klien sebagai objek JSON biasa. */
export function skorKeObjek(
  skor: SkorMenu,
  produk: { id: string; name: string }[]
): Record<string, { poin: number; label: string }> {
  const out: Record<string, { poin: number; label: string }> = {};
  for (const p of produk) {
    const s = skorProduk(skor, p);
    if (s) out[p.id] = { poin: s.poin, label: s.label };
  }
  return out;
}
