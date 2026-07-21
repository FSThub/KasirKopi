"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";

type Stats = {
  todayRevenue: number;
  todayOrders: number;
  week: { label: string; date: string; total: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  payment: { cash: number; qris: number };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const maxWeek = stats ? Math.max(...stats.week.map((w) => w.total), 1) : 1;
  const payTotal = stats ? stats.payment.cash + stats.payment.qris : 0;

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-xl font-extrabold text-coffee-800">Laporan Penjualan</h1>

      {!stats && <p className="py-10 text-center text-coffee-400">Memuat…</p>}

      {stats && (
        <div className="space-y-4">
          {/* Ringkasan hari ini */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-coffee-700 p-4 text-white ring-0">
              <p className="text-xs opacity-80">Pendapatan Hari Ini</p>
              <p className="mt-1 text-2xl font-extrabold">{rupiah(stats.todayRevenue)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-coffee-400">Transaksi Hari Ini</p>
              <p className="mt-1 text-2xl font-extrabold text-coffee-800">{stats.todayOrders}</p>
            </div>
          </div>

          {/* Grafik 7 hari */}
          <div className="card p-4">
            <p className="mb-3 text-sm font-semibold text-coffee-700">7 Hari Terakhir</p>
            <div className="flex h-40 items-end justify-between gap-2">
              {stats.week.map((w) => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-coffee-400 transition-all"
                      style={{ height: `${Math.max((w.total / maxWeek) * 100, 3)}%` }}
                      title={rupiah(w.total)}
                    />
                  </div>
                  <span className="text-[10px] text-coffee-400">{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metode pembayaran */}
          <div className="card p-4">
            <p className="mb-3 text-sm font-semibold text-coffee-700">Metode Pembayaran (7 hari)</p>
            <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-coffee-100">
              <div
                className="bg-green-500"
                style={{ width: `${payTotal ? (stats.payment.cash / payTotal) * 100 : 0}%` }}
              />
              <div
                className="bg-blue-500"
                style={{ width: `${payTotal ? (stats.payment.qris / payTotal) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">💵 Tunai {rupiah(stats.payment.cash)}</span>
              <span className="text-blue-600">📱 QRIS {rupiah(stats.payment.qris)}</span>
            </div>
          </div>

          {/* Menu terlaris */}
          <div className="card p-4">
            <p className="mb-3 text-sm font-semibold text-coffee-700">Menu Terlaris Hari Ini</p>
            {stats.topProducts.length === 0 && (
              <p className="text-sm text-coffee-400">Belum ada penjualan hari ini.</p>
            )}
            <div className="space-y-2">
              {stats.topProducts.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coffee-100 text-sm font-bold text-coffee-700">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-coffee-800">{t.name}</span>
                  <span className="text-sm text-coffee-500">{t.qty}x</span>
                  <span className="w-20 text-right text-sm font-semibold text-coffee-700">
                    {rupiah(t.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
