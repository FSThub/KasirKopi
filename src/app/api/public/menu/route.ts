import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoProducts, demoCategories } from "@/lib/demo";
import { hitungSkorMenu, skorKeObjek } from "@/lib/menuStats";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/menu — katalog untuk pelanggan yang memindai QR di meja.
 * Rute ini publik (tanpa sesi kasir), karena itu hanya menyajikan data yang
 * memang boleh dilihat pelanggan: kategori, menu, status ketersediaan,
 * bintang best seller, nama toko, dan persentase pajak.
 */
export async function GET() {
  try {
    // Semua dijalankan berbarengan: basis data berada di region lain sehingga
    // tiap kueri makan ratusan milidetik. Menjalankan skor best seller secara
    // berurutan sesudahnya membuat menu terasa lama dimuat.
    const [categories, products, pengaturan, skor] = await Promise.all([
      prisma.category.findMany({ orderBy: { sort: "asc" } }),
      prisma.product.findMany({
        include: { category: true },
        orderBy: [{ category: { sort: "asc" } }, { name: "asc" }],
      }),
      prisma.setting.findMany({
        where: { key: { in: ["store_name", "tax_percent"] } },
      }),
      hitungSkorMenu(),
    ]);

    const cari = (k: string) => pengaturan.find((s) => s.key === k)?.value;

    return NextResponse.json({
      storeName: cari("store_name") || process.env.NEXT_PUBLIC_STORE_NAME || "KasirKopi",
      taxPercent: parseFloat(cari("tax_percent") || "0") || 0,
      categories,
      products,
      bestSeller: skorKeObjek(skor, products),
    });
  } catch (e) {
    console.warn(
      "[/api/public/menu] DB tidak tersedia, memakai data demo:",
      e instanceof Error ? e.message : e
    );
    return NextResponse.json({
      storeName: process.env.NEXT_PUBLIC_STORE_NAME || "KasirKopi",
      taxPercent: 0,
      categories: demoCategories,
      products: demoProducts,
      bestSeller: {},
      isDemo: true,
    });
  }
}
