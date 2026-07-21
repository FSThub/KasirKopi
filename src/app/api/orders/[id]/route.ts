import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoOrder, isDemoOrderId } from "@/lib/demoOrders";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Order demo (DB tidak tersedia) disimpan in-memory.
  if (isDemoOrderId(params.id)) {
    const demo = getDemoOrder(params.id);
    if (!demo) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    return NextResponse.json(demo);
  }
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  return NextResponse.json(order);
}
