import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.emoji !== undefined) data.emoji = String(body.emoji).trim() || "☕";
  if (body.image !== undefined) data.image = body.image ? String(body.image) : null;
  if (body.categoryId !== undefined) data.categoryId = body.categoryId;
  if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);
  if (body.price !== undefined) {
    const price = parseInt(body.price, 10);
    if (!Number.isFinite(price) || price < 0)
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    data.price = price;
  }
  const product = await prisma.product.update({
    where: { id: params.id },
    data,
    include: { category: true },
  });
  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
