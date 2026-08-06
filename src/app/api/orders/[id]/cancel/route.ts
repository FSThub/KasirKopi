import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/cancel
 * Membatalkan pesanan yang belum dibayar — dipakai kasir untuk membersihkan
 * pesanan QR meja yang ditinggalkan pelanggan. Pesanan yang sudah lunas tidak
 * boleh dibatalkan agar laporan penjualan tetap utuh.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }
  if (order.status === "PAID") {
    return NextResponse.json(
      { error: "Transaksi sudah lunas dan tidak bisa dibatalkan" },
      { status: 400 }
    );
  }
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
    include: { items: true },
  });
  return NextResponse.json(updated);
}
