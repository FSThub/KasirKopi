import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hitungSkorMenu, skorKeObjek } from "@/lib/menuStats";

export const dynamic = "force-dynamic";

/**
 * GET /api/bestseller — skor bintang best seller per produk (hasil Apriori).
 * Dipakai halaman kasir; halaman pelanggan mendapatkannya dari /api/public/menu.
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({ select: { id: true, name: true } });
    const skor = await hitungSkorMenu();
    return NextResponse.json(skorKeObjek(skor, products));
  } catch (e) {
    console.warn("[/api/bestseller] gagal:", e instanceof Error ? e.message : e);
    return NextResponse.json({});
  }
}
