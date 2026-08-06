import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { computeOrder, makeOrderNumber } from "@/lib/order";
import { buildDynamicQris, DEMO_QRIS } from "@/lib/qris";
import { chargeQris } from "@/lib/midtrans";
import { pilihKanalQris } from "@/lib/pembayaran";

export const dynamic = "force-dynamic";

const toImage = (payload: string) =>
  QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 320 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HP_RE = /^[0-9+\-\s()]{8,20}$/;

/**
 * POST /api/public/orders — pesanan dari pelanggan yang memindai QR di meja.
 *
 * metode:
 *   "QRIS"    → dibuatkan QRIS dinamis bernominal, status PENDING sampai dibayar.
 *   "CASHIER" → pelanggan membayar di konter; pesanan masuk daftar tunggu kasir.
 *
 * Harga, pajak, dan ketersediaan menu selalu dihitung ulang di server.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nama = String(body.customerName ?? "").trim();
    const hp = String(body.customerPhone ?? "").trim();
    const email = String(body.customerEmail ?? "").trim();
    const meja = String(body.tableNumber ?? "").trim() || null;
    const metode = body.method === "QRIS" ? "QRIS" : "CASHIER";

    if (nama.length < 2)
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!HP_RE.test(hp))
      return NextResponse.json({ error: "Nomor HP tidak valid" }, { status: 400 });
    if (!EMAIL_RE.test(email))
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });

    // computeOrder menolak menu yang sedang habis dan mengabaikan harga kiriman klien.
    const { orderItems, subtotal, tax, total } = await computeOrder(body.items || []);

    const orderNumber = makeOrderNumber();
    const dasar = {
      orderNumber,
      customerName: nama,
      customerPhone: hp,
      customerEmail: email,
      orderType: "QR_TABLE",
      tableNumber: meja,
      subtotal,
      tax,
      total,
      status: "PENDING",
      items: { create: orderItems },
    };

    // ---- Bayar di kasir ----
    if (metode === "CASHIER") {
      const order = await prisma.order.create({
        data: { ...dasar, paymentMethod: "CASH" },
      });
      return NextResponse.json({
        orderId: order.id,
        orderNumber,
        mode: "cashier",
        total,
        message: "Silakan menuju kasir untuk menyelesaikan pembayaran.",
      });
    }

    // ---- QRIS: pilih kanal yang benar-benar bisa menerima pembayaran ----
    const kanal = await pilihKanalQris();

    if (kanal.kanal === "midtrans") {
      const charge = await chargeQris(orderNumber, total);
      const image = charge.qrString ? await toImage(charge.qrString) : null;
      const order = await prisma.order.create({
        data: {
          ...dasar,
          paymentMethod: "QRIS",
          paymentRef: charge.transactionId,
          // Disimpan agar hasil pindaian QR bisa dicocokkan ke pesanan ini.
          qrPayload: charge.qrString,
          qrUrl: charge.qrUrl,
        },
      });
      return NextResponse.json({
        orderId: order.id,
        orderNumber,
        mode: "midtrans",
        image,
        total,
        expiryTime: charge.expiryTime,
      });
    }

    // ---- QRIS dinamis dari string merchant toko (dikonfirmasi kasir) ----
    const image = await toImage(
      buildDynamicQris(kanal.isDemo ? DEMO_QRIS : kanal.merchant, total)
    );
    const order = await prisma.order.create({
      data: { ...dasar, paymentMethod: "QRIS" },
    });
    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      mode: "static",
      image,
      total,
      isDemo: kanal.isDemo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat pesanan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
