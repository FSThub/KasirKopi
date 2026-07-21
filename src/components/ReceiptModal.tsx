"use client";

import { rupiah, tanggal } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function ReceiptModal({
  order,
  storeName = "KasirKopi",
  onClose,
}: {
  order: Order | null;
  storeName?: string;
  onClose: () => void;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-green-500 py-6 text-center text-white">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl">
            ✓
          </div>
          <p className="text-lg font-bold">Pembayaran Berhasil</p>
          <p className="text-sm opacity-90">{rupiah(order.total)}</p>
        </div>

        <div id="receipt" className="p-5">
          <div className="mb-3 text-center">
            <p className="text-lg font-extrabold">{storeName}</p>
            <p className="text-xs text-coffee-500">{tanggal(order.createdAt)}</p>
            <p className="text-xs text-coffee-500">No. {order.orderNumber}</p>
            {order.customerName && (
              <p className="mt-1 text-sm font-medium">a.n. {order.customerName}</p>
            )}
          </div>

          <div className="border-y border-dashed border-coffee-200 py-3">
            {order.items.map((it) => (
              <div key={it.id} className="mb-1.5 flex justify-between text-sm">
                <div>
                  <span className="font-medium">{it.name}</span>
                  <span className="text-coffee-400"> ×{it.quantity}</span>
                </div>
                <span>{rupiah(it.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 py-3 text-sm">
            <div className="flex justify-between text-coffee-600">
              <span>Subtotal</span>
              <span>{rupiah(order.subtotal)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-coffee-600">
                <span>Pajak</span>
                <span>{rupiah(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{rupiah(order.total)}</span>
            </div>
            <div className="flex justify-between text-coffee-600">
              <span>Metode</span>
              <span>{order.paymentMethod === "QRIS" ? "QRIS" : "Tunai"}</span>
            </div>
            {order.paymentMethod === "CASH" && order.cashReceived != null && (
              <>
                <div className="flex justify-between text-coffee-600">
                  <span>Tunai</span>
                  <span>{rupiah(order.cashReceived)}</span>
                </div>
                <div className="flex justify-between text-coffee-600">
                  <span>Kembalian</span>
                  <span>{rupiah(order.change ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <p className="mt-2 text-center text-xs text-coffee-400">
            Terima kasih atas kunjungan Anda ☕
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 pt-0">
          <button onClick={() => window.print()} className="btn-ghost">
            🖨️ Cetak
          </button>
          <button onClick={onClose} className="btn-primary">
            Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}
