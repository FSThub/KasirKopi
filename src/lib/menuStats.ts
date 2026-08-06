import { prisma } from "./prisma";
import {
  aturanAsosiasi,
  frequentItemsets,
  namaDasar,
  skorBestSeller,
  type Aturan,
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
  const orders = await prisma.order.findMany({
    where: { status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: batas,
    select: { items: { select: { productId: true, name: true } } },
  });
  return orders
    .map((o) => [...new Set(o.items.map(kunciItem))])
    .filter((t) => t.length > 0);
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

/** Skor bintang best seller (5/4/3) per produk, dihitung dengan Apriori. */
export async function hitungSkorMenu(batas = 500): Promise<SkorMenu> {
  if (cacheSkor && Date.now() - cacheSkor.waktu < UMUR_CACHE_MS) return cacheSkor.hasil;
  try {
    const transaksi = await ambilTransaksi(batas);
    const hasil = skorBestSeller(transaksi);
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

/** Cari skor sebuah produk: cocokkan id dulu, lalu nama dasarnya. */
export function skorProduk(
  skor: SkorMenu,
  produk: { id: string; name: string }
): SkorBestSeller | null {
  return skor.get(produk.id) ?? skor.get(`nama:${namaDasar(produk.name)}`) ?? null;
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
