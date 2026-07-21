import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { computeOrder, makeOrderNumber } from "@/lib/order";
import { buildDynamicQris, DEMO_QRIS } from "@/lib/qris";
import { chargeQris, isMidtransConfigured } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

/**
 * POST /api/qris/charge
 * Membuat order PENDING + kode QRIS.
 * - Mode "midtrans": QRIS asli, status akan otomatis PAID via webhook.
 * - Mode "static": QRIS dinamis dari string merchant; dikonfirmasi manual.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderItems, subtotal, tax, total } = await computeOrder(body.items || []);
    const orderNumber = makeOrderNumber();
    const customerName = body.customerName?.trim() || null;

    if (isMidtransConfigured()) {
      // ---- Mode Midtrans ----
      const charge = await chargeQris(orderNumber, total);

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerName,
          subtotal,
          tax,
          total,
          paymentMethod: "QRIS",
          status: "PENDING",
          paymentRef: charge.transactionId,
          items: { create: orderItems },
        },
      });

      const image = charge.qrString
        ? await QRCode.toDataURL(charge.qrString, { errorCorrectionLevel: "M", margin: 1, width: 320 })
        : null;

      return NextResponse.json({
        orderId: order.id,
        mode: "midtrans",
        image,
        qrUrl: charge.qrUrl,
        expiryTime: charge.expiryTime,
        isDemo: false,
      });
    }

    // ---- Mode statis (fallback) ----
    const setting = await prisma.setting.findUnique({ where: { key: "qris_merchant_string" } });
    const merchant = (setting?.value || process.env.QRIS_MERCHANT_STRING || "").trim();
    const isDemo = merchant.length < 20;
    const payload = buildDynamicQris(isDemo ? DEMO_QRIS : merchant, total);
    const image = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 320 });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        subtotal,
        tax,
        total,
        paymentMethod: "QRIS",
        status: "PENDING",
        items: { create: orderItems },
      },
    });

    return NextResponse.json({ orderId: order.id, mode: "static", image, isDemo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat pembayaran QRIS";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
