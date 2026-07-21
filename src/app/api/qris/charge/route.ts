import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { computeOrder, makeOrderNumber } from "@/lib/order";
import { buildDynamicQris, DEMO_QRIS } from "@/lib/qris";
import { chargeQris, isMidtransConfigured } from "@/lib/midtrans";
import { fabricateDemoOrder, saveDemoOrder } from "@/lib/demoOrders";

export const dynamic = "force-dynamic";

const toImage = (payload: string) =>
  QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 320 });

/**
 * POST /api/qris/charge — membuat order PENDING + kode QRIS.
 * Prioritas:
 *   1. Midtrans (bila MIDTRANS_SERVER_KEY diisi) — QRIS asli, auto-PAID via
 *      webhook / polling status. Jalan walau DB tidak tersedia (order in-memory).
 *   2. QRIS statis (string merchant / demo) — konfirmasi manual.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderItems, subtotal, tax, total, demo } = await computeOrder(body.items || []);
    const orderNumber = makeOrderNumber();
    const customerName = body.customerName?.trim() || null;

    // ---- 1) Mode Midtrans (didahulukan bila dikonfigurasi) ----
    if (isMidtransConfigured()) {
      const charge = await chargeQris(orderNumber, total);
      const image = charge.qrString ? await toImage(charge.qrString) : null;

      const order = demo
        ? saveDemoOrder(
            fabricateDemoOrder({
              orderItems,
              customerName,
              subtotal,
              tax,
              total,
              paymentMethod: "QRIS",
              status: "PENDING",
              orderNumber,
              paymentRef: charge.transactionId,
            })
          )
        : await prisma.order.create({
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

      return NextResponse.json({
        orderId: order.id,
        mode: "midtrans",
        image,
        qrString: charge.qrString, // teks EMVCo — untuk uji di simulator sandbox
        qrUrl: charge.qrUrl,
        expiryTime: charge.expiryTime,
        isDemo: demo,
      });
    }

    // ---- 2a) QRIS statis, DB tidak tersedia → order in-memory + QR demo ----
    if (demo) {
      const image = await toImage(buildDynamicQris(DEMO_QRIS, total));
      const order = saveDemoOrder(
        fabricateDemoOrder({
          orderItems, customerName, subtotal, tax, total,
          paymentMethod: "QRIS", status: "PENDING", orderNumber,
        })
      );
      return NextResponse.json({ orderId: order.id, mode: "static", image, isDemo: true });
    }

    // ---- 2b) QRIS statis dengan DB ----
    const setting = await prisma.setting.findUnique({ where: { key: "qris_merchant_string" } });
    const merchant = (setting?.value || process.env.QRIS_MERCHANT_STRING || "").trim();
    const isDemo = merchant.length < 20;
    const image = await toImage(buildDynamicQris(isDemo ? DEMO_QRIS : merchant, total));

    const order = await prisma.order.create({
      data: {
        orderNumber, customerName, subtotal, tax, total,
        paymentMethod: "QRIS", status: "PENDING",
        items: { create: orderItems },
      },
    });

    return NextResponse.json({ orderId: order.id, mode: "static", image, isDemo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat pembayaran QRIS";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
