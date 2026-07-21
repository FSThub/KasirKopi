import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: [{ category: { sort: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = body.name?.trim();
  const price = parseInt(body.price, 10);
  if (!name) return NextResponse.json({ error: "Nama produk wajib diisi" }, { status: 400 });
  if (!Number.isFinite(price) || price < 0)
    return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
  if (!body.categoryId)
    return NextResponse.json({ error: "Kategori wajib dipilih" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name,
      price,
      emoji: body.emoji?.trim() || "☕",
      categoryId: body.categoryId,
      isAvailable: body.isAvailable ?? true,
    },
    include: { category: true },
  });
  return NextResponse.json(product, { status: 201 });
}
