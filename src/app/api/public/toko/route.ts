import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/toko — identitas toko saja.
 *
 * Dipakai halaman login (yang belum punya sesi) agar menampilkan nama toko
 * sungguhan, bukan nama aplikasi. Sengaja terpisah dari /api/public/menu yang
 * ikut menghitung katalog dan skor best seller sehingga jauh lebih berat.
 */
export async function GET() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: "store_name" } });
    return NextResponse.json({
      storeName: s?.value || process.env.NEXT_PUBLIC_STORE_NAME || "KasirKopi",
    });
  } catch {
    return NextResponse.json({
      storeName: process.env.NEXT_PUBLIC_STORE_NAME || "KasirKopi",
    });
  }
}
