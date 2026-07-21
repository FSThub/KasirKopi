import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoCategories } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { sort: "asc" } });
    return NextResponse.json(categories);
  } catch (e) {
    // DB tidak tersedia → sajikan data demo.
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[/api/categories] DB tidak tersedia, memakai data demo:", msg);
    return NextResponse.json(demoCategories);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
  }
  const count = await prisma.category.count();
  const category = await prisma.category.create({
    data: { name: body.name.trim(), sort: count },
  });
  return NextResponse.json(category, { status: 201 });
}
