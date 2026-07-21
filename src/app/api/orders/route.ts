import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeOrder, makeOrderNumber } from "@/lib/order";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  // Default: hanya transaksi lunas. ?status=ALL untuk semua.
  const status = searchParams.get("status");
  const orders = await prisma.order.findMany({
    where: status === "ALL" ? undefined : { status: "PAID" },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(orders);
}

/**
 * POST /api/orders — finalisasi transaksi TUNAI (langsung PAID).
 * Pembayaran QRIS memakai alur /api/qris/charge (order dibuat PENDING dulu).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderItems, subtotal, tax, total } = await computeOrder(body.items || []);

    // Validasi pembayaran tunai.
    const cashReceived = parseInt(String(body.cashReceived), 10);
    if (!Number.isFinite(cashReceived) || cashReceived < total) {
      return NextResponse.json({ error: "Uang tunai kurang dari total" }, { status: 400 });
    }
    const change = cashReceived - total;

    const order = await prisma.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        customerName: body.customerName?.trim() || null,
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
