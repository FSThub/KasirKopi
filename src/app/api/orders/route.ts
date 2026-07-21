import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeOrder, makeOrderNumber } from "@/lib/order";
import { fabricateDemoOrder, listDemoOrders, saveDemoOrder } from "@/lib/demoOrders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  // Default: hanya transaksi lunas. ?status=ALL untuk semua.
  const status = searchParams.get("status");
  try {
    const orders = await prisma.order.findMany({
      where: status === "ALL" ? undefined : { status: "PAID" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(orders);
  } catch (e) {
    // DB tidak tersedia (mode demo) → sajikan order dari store in-memory.
    console.warn("[/api/orders] DB tidak tersedia:", e instanceof Error ? e.message : e);
    const demo = listDemoOrders()
      .filter((o) => (status === "ALL" ? true : o.status === "PAID"))
      .slice(0, limit);
    return NextResponse.json(demo);
  }
}

/**
 * POST /api/orders — finalisasi transaksi TUNAI (langsung PAID).
 * Pembayaran QRIS memakai alur /api/qris/charge (order dibuat PENDING dulu).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderItems, subtotal, tax, total, demo } = await computeOrder(body.items || []);

    // Validasi pembayaran tunai.
    const cashReceived = parseInt(String(body.cashReceived), 10);
    if (!Number.isFinite(cashReceived) || cashReceived < total) {
      return NextResponse.json({ error: "Uang tunai kurang dari total" }, { status: 400 });
    }
    const change = cashReceived - total;
    const customerName = body.customerName?.trim() || null;

    // Mode demo (DB tidak tersedia): simpan ke store in-memory agar
    // riwayat & laporan tetap berfungsi.
    if (demo) {
      const order = saveDemoOrder(
        fabricateDemoOrder({
          orderItems,
          customerName,
          subtotal,
          tax,
          total,
          paymentMethod: "CASH",
          status: "PAID",
          cashReceived,
          change,
        })
      );
      return NextResponse.json(order, { status: 201 });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        customerName,
        subtotal,
        tax,
        total,
        paymentMethod: "CASH",
        cashReceived,
        change,
        status: "PAID",
        items: { create: orderItems },
      },
      include: { items: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memproses transaksi";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
