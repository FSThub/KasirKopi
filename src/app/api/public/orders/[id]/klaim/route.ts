import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/orders/[id]/klaim
 *
 * Pelanggan menyatakan sudah membayar QRIS. Pembayaran lewat QRIS merchant
 * (statis yang diubah jadi dinamis) tidak mengirim pemberitahuan apa pun ke
 * aplikasi — penyedia dompet hanya memberi tahu pemilik rekening. Sinyal ini
 * karenanya BUKAN bukti pembayaran, melainkan penanda agar kasir tahu ada
 * saldo yang perlu diperiksa. Status lunas tetap ditentukan kasir.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.orderType !== "QR_TABLE") {
    return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json({ status: order.status, sudahSelesai: true });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { claimedPaidAt: order.claimedPaidAt ?? new Date() },
  });

  return NextResponse.json({
    status: updated.status,
    claimedPaidAt: updated.claimedPaidAt,
  });
}
