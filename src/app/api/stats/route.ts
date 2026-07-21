import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start7 = new Date(startToday);
  start7.setDate(start7.getDate() - 6);

  const [todayAgg, allOrders, itemsToday] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: startToday }, status: "PAID" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start7 }, status: "PAID" },
      select: { total: true, createdAt: true, paymentMethod: true },
    }),
    prisma.orderItem.groupBy({
      by: ["name"],
      where: { order: { createdAt: { gte: startToday }, status: "PAID" } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  // Grafik 7 hari.
  const days: { label: string; date: string; total: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start7);
    d.setDate(d.getDate() + i);
    days.push({
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      date: d.toISOString().slice(0, 10),
      total: 0,
    });
  }
  let cash = 0;
  let qris = 0;
  for (const o of allOrders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    const day = days.find((x) => x.date === key);
    if (day) day.total += o.total;
    if (o.paymentMethod === "QRIS") qris += o.total;
    else cash += o.total;
  }

  return NextResponse.json({
    todayRevenue: todayAgg._sum.total ?? 0,
    todayOrders: todayAgg._count ?? 0,
    week: days,
    topProducts: itemsToday.map((t) => ({
      name: t.name,
      qty: t._sum.quantity ?? 0,
      revenue: t._sum.subtotal ?? 0,
    })),
    payment: { cash, qris },
  });
}
