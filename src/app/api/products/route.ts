import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoProducts } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: [{ category: { sort: "asc" } }, { name: "asc" }],
    });
    return NextResponse.json(products);
  } catch (e) {
    // DB tidak tersedia → sajikan data demo agar aplikasi tetap berfungsi.
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[/api/products] DB tidak tersedia, memakai data demo:", msg);
    return NextResponse.json(demoProducts);
  }
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
      image: typeof body.image === "string" && body.image ? body.image : null,
      categoryId: body.categoryId,
      isAvailable: body.isAvailable ?? true,
    },
    include: { category: true },
  });
  return NextResponse.json(product, { status: 201 });
}
