import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTransactionStatus, isMidtransConfigured } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/orders/[id] — status pesanan untuk pelanggan.
 * Hanya mengembalikan data milik pesanan itu sendiri (tanpa info kasir lain).
 * Bila pembayaran QRIS memakai Midtrans, status ditanyakan langsung ke Midtrans
 * agar tetap akurat walau webhook belum sampai.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: { select: { name: true, price: true, quantity: true, subtotal: true } } },
    });
    if (!order || order.orderType !== "QR_TABLE") {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    let status = order.status;
    if (status === "PENDING" && order.paymentMethod === "QRIS" && isMidtransConfigured()) {
      const cek = await getTransactionStatus(order.orderNumber);
      if (cek.status !== "PENDING") {
        status = cek.status;
        await prisma.order.update({
          where: { id: order.id },
          data: { status, paymentRef: cek.transactionId ?? order.paymentRef },
        });
      }
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      paymentMethod: order.paymentMethod,
      // Dipakai halaman pelanggan agar tombol "Saya sudah bayar" tidak
      // ditawarkan dua kali.
      claimedPaidAt: order.claimedPaidAt,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      status,
      items: order.items,
      createdAt: order.createdAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat status pesanan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
