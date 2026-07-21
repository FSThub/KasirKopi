import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature, mapStatus } from "@/lib/midtrans";
import { getDemoOrder, saveDemoOrder } from "@/lib/demoOrders";

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

  const newStatus = mapStatus(payload.transaction_status, payload.fraud_status);

  // 2. order_id yang kita kirim = orderNumber. Coba DB dulu.
  try {
    const order = await prisma.order.findUnique({ where: { orderNumber: payload.order_id } });
    if (order) {
      if (order.status !== "PAID") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: newStatus, paymentRef: payload.transaction_id ?? order.paymentRef },
        });
      }
      return NextResponse.json({ ok: true });
    }
  } catch {
    /* DB tidak tersedia → coba store demo di bawah */
  }

  // 3. Fallback: order demo in-memory (id = demo-<orderNumber>).
  const demo = getDemoOrder(`demo-${payload.order_id}`);
  if (demo && demo.status !== "PAID") {
    saveDemoOrder({ ...demo, status: newStatus, paymentRef: payload.transaction_id ?? demo.paymentRef });
  }

  // Balas 200 agar Midtrans tidak retry terus.
  return NextResponse.json({ ok: true });
}
