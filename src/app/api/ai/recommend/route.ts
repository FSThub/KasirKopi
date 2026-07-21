import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoProducts } from "@/lib/demo";
import { listDemoOrders } from "@/lib/demoOrders";
import { recommend, type MenuItem, type OrderLike } from "@/lib/recommend";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/recommend
 * Body: { items: [{ name, quantity }] }
 * Rekomendasi upsell buatan sendiri (market basket dari riwayat transaksi),
 * tanpa layanan AI eksternal.
 */
/** Buang sufiks opsi/catatan dari nama snapshot → nama dasar produk. */
const baseName = (n: string) => n.split(" (")[0].split(" — ")[0].trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cart: { name: string; quantity: number }[] = Array.isArray(body.items) ? body.items : [];

    // Menu + riwayat transaksi diambil dari DB; fallback ke data demo/in-memory.
    let menu: MenuItem[];
    let history: OrderLike[];
    try {
      const [products, orders] = await Promise.all([
        prisma.product.findMany({ where: { isAvailable: true }, include: { category: true } }),
        prisma.order.findMany({
          where: { status: "PAID" },
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);
      menu = products.map((p) => ({ name: p.name, price: p.price, category: p.category?.name }));
      history = orders.map((o) => ({
        items: o.items.map((i) => ({ name: baseName(i.name), quantity: i.quantity })),
      }));
    } catch {
      menu = demoProducts.map((p) => ({ name: p.name, price: p.price, category: p.category?.name }));
      history = listDemoOrders()
        .filter((o) => o.status === "PAID")
        .map((o) => ({ items: o.items.map((i) => ({ name: baseName(i.name), quantity: i.quantity })) }));
    }

    const result = recommend(cart, menu, history);
    return NextResponse.json({ configured: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat rekomendasi";
    return NextResponse.json({ configured: true, error: msg, suggestions: [], pitch: "" });
  }
}
