import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KEYS = ["qris_merchant_string", "store_name", "tax_percent"];

export async function GET() {
  const settings = await prisma.setting.findMany({ where: { key: { in: KEYS } } });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  // QRIS string bisa panjang & sensitif; kirim juga penanda apakah sudah diisi.
  return NextResponse.json({
    store_name: map.store_name ?? "KasirKopi",
    tax_percent: map.tax_percent ?? "0",
    qris_merchant_string: map.qris_merchant_string ?? "",
    qris_configured: (map.qris_merchant_string ?? "").trim().length >= 20,
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const updates: { key: string; value: string }[] = [];
  for (const key of KEYS) {
    if (body[key] !== undefined) updates.push({ key, value: String(body[key]) });
  }
  await Promise.all(
    updates.map((u) =>
      prisma.setting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
