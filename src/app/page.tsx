"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/store";
import { rupiah } from "@/lib/format";
import type { Category, Order, Product } from "@/lib/types";
import CheckoutSheet from "@/components/CheckoutSheet";
import ReceiptModal from "@/components/ReceiptModal";

export default function KasirPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const cart = useCart();

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!p.isAvailable) return false;
      if (activeCat !== "all" && p.categoryId !== activeCat) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCat, query]);

  const qtyInCart = (id: string) => cart.items.find((i) => i.productId === id)?.quantity ?? 0;

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-coffee-50/95 px-4 pb-2 pt-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coffee-700 text-xl">
            ☕
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-none text-coffee-800">KasirKopi</h1>
            <p className="text-xs text-coffee-400">Kasir cepat & mobile friendly</p>
          </div>
        </div>
        <input
          className="input"
          placeholder="🔍 Cari menu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {/* Kategori */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        <CatChip label="Semua" active={activeCat === "all"} onClick={() => setActiveCat("all")} />
        {categories.map((c) => (
          <CatChip
            key={c.id}
            label={c.name}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
          />
        ))}
      </div>

      {/* Grid produk */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-36 animate-pulse bg-coffee-100" />
          ))}
        {!loading && filtered.length === 0 && (
          <p className="col-span-2 py-10 text-center text-coffee-400">Menu tidak ditemukan.</p>
        )}
        {filtered.map((p) => {
          const q = qtyInCart(p.id);
          return (
            <button
              key={p.id}
              onClick={() => cart.add(p)}
              className="card relative flex flex-col p-3 text-left active:scale-[0.97]"
            >
              {q > 0 && (
                <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-coffee-700 px-1.5 text-xs font-bold text-white">
                  {q}
                </span>
              )}
              <span className="mb-2 text-4xl">{p.emoji}</span>
              <span className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-coffee-800">
                {p.name}
              </span>
              <span className="mt-1 font-bold text-coffee-600">{rupiah(p.price)}</span>
            </button>
          );
        })}
      </div>

      {/* Bar keranjang mengambang */}
      {cart.count() > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-0 bottom-[4.5rem] z-30 mx-auto flex max-w-lg items-center justify-between gap-3 px-4"
        >
          <span className="flex w-full items-center justify-between rounded-2xl bg-coffee-700 px-4 py-3 text-white shadow-lg">
            <span className="flex items-center gap-2">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/20 px-2 text-sm font-bold">
                {cart.count()}
              </span>
              Lihat Pesanan
            </span>
            <span className="font-extrabold">{rupiah(cart.subtotal())}</span>
          </span>
        </button>
      )}

      {/* Sheet keranjang */}
      {cartOpen && (
        <CartSheet
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}

      <CheckoutSheet
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onPaid={(order) => {
          setCheckoutOpen(false);
          setReceipt(order);
        }}
      />

      <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-coffee-700 text-white" : "bg-white text-coffee-600 ring-1 ring-coffee-100"
      }`}
    >
      {label}
    </button>
  );
}

function CartSheet({ onClose, onCheckout }: { onClose: () => void; onCheckout: () => void }) {
  const cart = useCart();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-coffee-50 p-5 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-coffee-200" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pesanan</h2>
          <button onClick={() => cart.clear()} className="text-sm text-red-500">
            Kosongkan
          </button>
        </div>

        <input
          className="input mb-4"
          placeholder="Nama pelanggan (opsional)"
          value={cart.customerName}
          onChange={(e) => cart.setCustomerName(e.target.value)}
        />

        <div className="space-y-2">
          {cart.items.map((it) => (
            <div key={it.productId} className="card flex items-center gap-3 p-3">
              <span className="text-3xl">{it.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-coffee-800">{it.name}</p>
                <p className="text-sm text-coffee-500">{rupiah(it.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cart.dec(it.productId)}
                  className="h-8 w-8 rounded-full bg-coffee-100 text-lg font-bold text-coffee-700 active:scale-90"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold">{it.quantity}</span>
                <button
                  onClick={() => cart.inc(it.productId)}
                  className="h-8 w-8 rounded-full bg-coffee-700 text-lg font-bold text-white active:scale-90"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-coffee-100 pt-4">
          <span className="text-coffee-600">Total</span>
          <span className="text-2xl font-extrabold text-coffee-800">{rupiah(cart.subtotal())}</span>
        </div>

        <button onClick={onCheckout} className="btn-primary mt-4 w-full text-lg">
          Lanjut Bayar →
        </button>
      </div>
    </div>
  );
}
