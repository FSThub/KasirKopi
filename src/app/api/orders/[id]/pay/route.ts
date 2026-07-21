import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/pay
 * Menandai order PENDING menjadi PAID (dipakai untuk konfirmasi manual mode QRIS statis).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  if (order.status === "PAID") {
    const full = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
    return NextResponse.json(full);
  }
  if (order.status === "CANCELLED") {
    return NextResponse.json({ error: "Transaksi sudah dibatalkan" }, { status: 400 });
  }
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: "PAID" },
    include: { items: true },
  });
  return NextResponse.json(updated);
}
