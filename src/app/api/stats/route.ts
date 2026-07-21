import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listDemoOrders } from "@/lib/demoOrders";

export const dynamic = "force-dynamic";

/** Kunci tanggal berbasis waktu LOKAL (toISOString memakai UTC → salah hari). */
function localKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function emptyWeek(start7: Date) {
  const days: { label: string; date: string; total: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start7);
    d.setDate(d.getDate() + i);
    days.push({
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      date: localKey(d),
      total: 0,
    });
  }
  return days;
}

/** Hitung statistik dari order demo in-memory (DB tidak tersedia). */
function demoStats(startToday: Date, start7: Date) {
  const orders = listDemoOrders().filter((o) => o.status === "PAID");
  const days = emptyWeek(start7);
  let todayRevenue = 0;
  let todayOrders = 0;
  let cash = 0;
  let qris = 0;
  const top = new Map<string, { qty: number; revenue: number }>();

  for (const o of orders) {
    const created = new Date(o.createdAt);
    const key = localKey(created);
    const day = days.find((x) => x.date === key);
    if (day) {
      day.total += o.total;
      if (o.paymentMethod === "QRIS") qris += o.total;
      else cash += o.total;
    }
    if (created >= startToday) {
      todayRevenue += o.total;
      todayOrders += 1;
      for (const it of o.items) {
        const t = top.get(it.name) ?? { qty: 0, revenue: 0 };
        t.qty += it.quantity;
        t.revenue += it.subtotal;
        top.set(it.name, t);
      }
    }
  }

  return {
    todayRevenue,
    todayOrders,
    week: days,
    topProducts: [...top.entries()]
      .map(([name, t]) => ({ name, qty: t.qty, revenue: t.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
    payment: { cash, qris },
  };
}

export async function GET() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start7 = new Date(startToday);
  start7.setDate(start7.getDate() - 6);

  try {
    return NextResponse.json(await dbStats(startToday, start7));
  } catch (e) {
    console.warn("[/api/stats] DB tidak tersedia, memakai data demo:", e instanceof Error ? e.message : e);
    return NextResponse.json(demoStats(startToday, start7));
  }
}

async function dbStats(startToday: Date, start7: Date) {
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
  const days = emptyWeek(start7);
  let cash = 0;
  let qris = 0;
  for (const o of allOrders) {
    const key = localKey(new Date(o.createdAt));
    const day = days.find((x) => x.date === key);
    if (day) day.total += o.total;
    if (o.paymentMethod === "QRIS") qris += o.total;
    else cash += o.total;
  }

  return {
    todayRevenue: todayAgg._sum.total ?? 0,
    todayOrders: todayAgg._count ?? 0,
    week: days,
    topProducts: itemsToday.map((t) => ({
      name: t.name,
      qty: t._sum.quantity ?? 0,
      revenue: t._sum.subtotal ?? 0,
    })),
    payment: { cash, qris },
  };
}
