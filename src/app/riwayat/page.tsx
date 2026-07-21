"use client";

import { useEffect, useState } from "react";
import { rupiah, tanggal } from "@/lib/format";
import type { Order } from "@/lib/types";
import ReceiptModal from "@/components/ReceiptModal";

export default function RiwayatPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    fetch("/api/orders?limit=100")
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const totalAll = orders.reduce((a, o) => a + o.total, 0);

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-1 text-xl font-extrabold text-coffee-800">Riwayat Transaksi</h1>
      <p className="mb-4 text-sm text-coffee-400">
        {orders.length} transaksi · total {rupiah(totalAll)}
      </p>

      {loading && <p className="py-10 text-center text-coffee-400">Memuat…</p>}
      {!loading && orders.length === 0 && (
        <div className="card p-10 text-center text-coffee-400">
          Belum ada transaksi.
        </div>
      )}

      <div className="space-y-2">
        {orders.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelected(o)}
            className="card flex w-full items-center gap-3 p-3 text-left active:scale-[0.99]"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${
                o.paymentMethod === "QRIS" ? "bg-blue-50" : "bg-green-50"
              }`}
            >
              {o.paymentMethod === "QRIS" ? "📱" : "💵"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-coffee-800">
                {o.orderNumber}
                {o.customerName ? ` · ${o.customerName}` : ""}
              </p>
              <p className="text-xs text-coffee-400">
                {tanggal(o.createdAt)} · {o.items.reduce((a, i) => a + i.quantity, 0)} item
              </p>
            </div>
            <span className="font-bold text-coffee-700">{rupiah(o.total)}</span>
          </button>
        ))}
      </div>

      <ReceiptModal order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
