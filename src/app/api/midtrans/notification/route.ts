import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature, mapStatus } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

/**
 * POST /api/midtrans/notification
 * Endpoint webhook Midtrans. Set URL ini di dashboard Midtrans:
 *   Settings > Configuration > Payment Notification URL
 *   -> https://<domain-anda>/api/midtrans/notification
 */
export async function POST(req: Request) {
  const payload = await req.json();

  // 1. Verifikasi keaslian notifikasi.
  if (!verifySignature(payload)) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
  }

  // 2. order_id yang kita kirim = orderNumber.
  const order = await prisma.order.findUnique({ where: { orderNumber: payload.order_id } });
  if (!order) {
    // Balas 200 agar Midtrans tidak retry terus untuk order yang tak dikenal.
    return NextResponse.json({ ok: true, note: "order tidak ditemukan" });
  }

  const newStatus = mapStatus(payload.transaction_status, payload.fraud_status);

  // 3. Jangan menurunkan status order yang sudah PAID.
  if (order.status !== "PAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus, paymentRef: payload.transaction_id ?? order.paymentRef },
    });
  }

  return NextResponse.json({ ok: true });
}
