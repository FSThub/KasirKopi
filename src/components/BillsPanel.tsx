"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/lib/store";
import { rupiah } from "@/lib/format";
import { optionsSummary } from "@/lib/options";
import { Icon } from "@/components/Icon";
import ProductImage from "@/components/ProductImage";
import AiAssistant from "@/components/AiAssistant";
import type { Product } from "@/lib/types";

const Coffee3D = dynamic(() => import("@/components/Coffee3D"), { ssr: false });

export default function BillsPanel({
  variant = "panel",
  products = [],
  onCheckout,
  onClose,
}: {
  variant?: "panel" | "sheet";
  products?: Product[];
  onCheckout: () => void;
  onClose?: () => void;
}) {
  const cart = useCart();
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const items = cart.items;
  const subtotal = cart.subtotal();
  const empty = items.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coffee-100 text-coffee-600">
            <Icon name="user" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] text-coffee-400">Kasir</p>
            <p className="text-sm font-bold leading-tight text-coffee-800">Pesanan</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!empty && (
            <button
              onClick={() => cart.clear()}
              className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              Kosongkan
            </button>
          )}
          {variant === "sheet" && (
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-9 w-9 items-center justify-center rounded-full text-coffee-400 hover:bg-coffee-100"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Nama pelanggan */}
      <div className="px-5 pt-3">
        <input
          className="input py-2.5 text-sm"
          placeholder="Nama pelanggan (opsional)"
          value={cart.customerName}
          onChange={(e) => cart.setCustomerName(e.target.value)}
        />
      </div>

      {/* Daftar item */}
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto px-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <Coffee3D className="h-40 w-full max-w-[220px]" />
            <p className="mt-2 text-sm font-medium text-coffee-500">Belum ada pesanan</p>
            <p className="text-xs text-coffee-400">Pilih menu untuk mulai transaksi.</p>
          </div>
        ) : (
          items.map((it) => (
            <div key={it.lineId} className="card animate-rise p-3">
              <div className="flex gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-coffee-50 ring-1 ring-coffee-100">
                  <ProductImage name={it.name} src={it.image} className="h-12 w-12" artClassName="h-10 w-10" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-coffee-800">{it.name}</p>
                  <p className="text-[11px] text-coffee-400">{optionsSummary(it.options)}</p>
                  <p className="mt-0.5 text-sm font-bold text-coffee-600">{rupiah(it.price)}</p>
                </div>
                <button
                  onClick={() => cart.remove(it.lineId)}
                  aria-label={`Hapus ${it.name}`}
                  className="h-7 w-7 shrink-0 rounded-lg text-coffee-300 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Icon name="trash" className="mx-auto h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => setNoteFor(noteFor === it.lineId ? null : it.lineId)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-coffee-500 hover:bg-coffee-50"
                >
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                  {it.options.note ? "Catatan" : "Tambah catatan"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cart.dec(it.lineId)}
                    aria-label="Kurangi"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-coffee-100 text-coffee-700 active:scale-90"
                  >
                    <Icon name="minus" className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold tabular-nums">{it.quantity}</span>
                  <button
                    onClick={() => cart.inc(it.lineId)}
                    aria-label="Tambah"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-coffee-700 text-white active:scale-90"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {(noteFor === it.lineId || it.options.note) && (
                <input
                  className="input mt-2 py-2 text-xs"
                  placeholder="Catatan (mis. less sugar, panaskan)"
                  value={it.options.note ?? ""}
                  onChange={(e) => cart.setNote(it.lineId, e.target.value)}
                  autoFocus={noteFor === it.lineId}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Saran AI (muncul saat ada item) */}
      <AiAssistant products={products} />

      {/* Total & aksi */}
      <div className="border-t border-coffee-100 px-5 py-4">
        <div className="mb-1 flex items-center justify-between text-sm text-coffee-500">
          <span>Subtotal</span>
          <span className="font-semibold text-coffee-700">{rupiah(subtotal)}</span>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-coffee-800">Total</span>
          <span className="text-xl font-extrabold text-coffee-800">{rupiah(subtotal)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={empty}
          className="btn-primary w-full text-base"
        >
          <Icon name="wallet" className="h-5 w-5" />
          Bayar
        </button>
      </div>
    </div>
  );
}
