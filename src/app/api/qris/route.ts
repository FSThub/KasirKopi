import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { buildDynamicQris, DEMO_QRIS } from "@/lib/qris";

export const dynamic = "force-dynamic";

/**
 * POST /api/qris  { amount: number }
 * Mengembalikan payload QRIS dinamis + data URL gambar QR untuk ditampilkan.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = parseInt(String(body.amount), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
    }

    const setting = await prisma.setting.findUnique({ where: { key: "qris_merchant_string" } });
    const merchantString = (setting?.value || process.env.QRIS_MERCHANT_STRING || "").trim();

    const isDemo = merchantString.length < 20;
    const source = isDemo ? DEMO_QRIS : merchantString;

    const payload = buildDynamicQris(source, amount);
    const image = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });

    return NextResponse.json({ payload, image, isDemo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat QRIS";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
