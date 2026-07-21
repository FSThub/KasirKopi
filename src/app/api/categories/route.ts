import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { sort: "asc" } });
  return NextResponse.json(categories);
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
