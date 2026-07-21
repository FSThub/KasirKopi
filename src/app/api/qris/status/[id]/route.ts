import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoOrder, isDemoOrderId, saveDemoOrder } from "@/lib/demoOrders";
import { getTransactionStatus, isMidtransConfigured } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

/**
 * GET /api/qris/status/[id]
 * Cek & sinkronkan status pembayaran QRIS dengan menanyakan LANGSUNG ke
 * Midtrans (tidak bergantung webhook). Cocok untuk testing lokal.
 * Mengembalikan order (bentuk sama seperti /api/orders/[id]).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  // ---- Order demo (in-memory) ----
  if (isDemoOrderId(id)) {
    const o = getDemoOrder(id);
    if (!o) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    if (o.status === "PAID" || !isMidtransConfigured()) return NextResponse.json(o);
    const st = await getTransactionStatus(o.orderNumber);
    if (st.status !== o.status) {
      return NextResponse.json(
        saveDemoOrder({ ...o, status: st.status, paymentRef: st.transactionId ?? o.paymentRef })
      );
    }
    return NextResponse.json(o);
  }

  // ---- Order di database ----
  let order;
  try {
    order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  } catch {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }
  if (!order) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  if (order.status === "PAID" || !isMidtransConfigured()) return NextResponse.json(order);

  const st = await getTransactionStatus(order.orderNumber);
  if (st.status !== order.status) {
    const updated = await prisma.order.update({
      where: { id },
      data: { status: st.status, paymentRef: st.transactionId ?? order.paymentRef },
      include: { items: true },
    });
    return NextResponse.json(updated);
  }
  return NextResponse.json(order);
}
