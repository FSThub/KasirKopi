"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/store";
import { rupiah } from "@/lib/format";
import type { Category, Order, Product } from "@/lib/types";
import CheckoutSheet from "@/components/CheckoutSheet";
import ReceiptModal from "@/components/ReceiptModal";
import ProductCard from "@/components/ProductCard";
import BillsPanel from "@/components/BillsPanel";
import { Icon } from "@/components/Icon";
import CoffeeArt, { coffeeArt } from "@/components/CoffeeArt";

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
        // Fallback aman bila API mengembalikan objek error, bukan array.
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
      })
      .catch(() => {
        setProducts([]);
        setCategories([]);
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

  const activeCatName =
    activeCat === "all" ? "Semua Menu" : categories.find((c) => c.id === activeCat)?.name ?? "Menu";

  const openCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <div className="lg:flex lg:h-screen lg:overflow-hidden">
      {/* Kolom menu */}
      <section className="flex-1 lg:overflow-y-auto">
        <header className="sticky top-0 z-20 bg-surface/90 px-4 pb-3 pt-4 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-coffee-800 lg:text-2xl">
                Pilih Kategori
              </h1>
              <p className="text-xs text-coffee-400">Ketuk menu untuk atur & tambah ke pesanan</p>
            </div>
            <div className="relative w-36 shrink-0 sm:w-64">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-coffee-300"
              />
              <input
                className="input py-2.5 pl-9 text-sm"
                placeholder="Cari menu…"
                aria-label="Cari menu"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Kategori */}
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
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
        </header>

        <div className="px-4 pb-8 pt-1 lg:px-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold text-coffee-800">{activeCatName}</h2>
            {!loading && (
              <span className="text-xs text-coffee-400">{filtered.length} menu</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-64 animate-pulse bg-coffee-100/60" />
              ))}
            {!loading && filtered.length === 0 && (
              <p className="col-span-full py-16 text-center text-coffee-400">
                Menu tidak ditemukan.
              </p>
            )}
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Kolom Bills (desktop) */}
      <aside className="hidden w-[380px] shrink-0 border-l border-black/5 lg:block lg:h-screen">
        <BillsPanel variant="panel" products={products} onCheckout={() => setCheckoutOpen(true)} />
      </aside>

      {/* Tombol keranjang mengambang (mobile) */}
      {cart.count() > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-0 bottom-[4.5rem] z-30 mx-auto flex max-w-lg items-center gap-3 px-4 lg:hidden"
        >
          <span className="flex w-full items-center justify-between rounded-2xl bg-coffee-700 px-4 py-3 text-white shadow-[var(--elev-3)]">
            <span className="flex items-center gap-2">
              <span className="relative">
                <Icon name="cart" className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-coffee-800">
                  {cart.count()}
                </span>
              </span>
              <span className="font-semibold">Lihat Pesanan</span>
            </span>
            <span className="font-extrabold">{rupiah(cart.subtotal())}</span>
          </span>
        </button>
      )}

      {/* Sheet keranjang (mobile) */}
      {cartOpen && (
        <div
          className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:hidden"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="animate-sheet flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-coffee-200" />
            <div className="flex min-h-0 flex-1 flex-col">
              <BillsPanel
                variant="sheet"
                products={products}
                onClose={() => setCartOpen(false)}
                onCheckout={openCheckout}
              />
            </div>
          </div>
        </div>
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

/** Kata kunci representatif agar tiap kategori dapat ilustrasi yang pas. */
function catArtName(label: string): string {
  const l = label.toLowerCase();
  if (l === "semua") return "americano";
  if (l.includes("non")) return "matcha";
  if (l.includes("snack")) return "croissant";
  if (l.includes("espresso")) return "cappuccino";
  if (l.includes("manual")) return "v60";
  return "kopi susu";
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
      aria-pressed={active}
      className={`flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 pb-2 pt-2.5 text-[11px] font-semibold transition ${
        active
          ? "bg-white text-coffee-800 ring-2 ring-coffee-600 shadow-[var(--elev-2)]"
          : "bg-white text-coffee-500 ring-1 ring-coffee-100 shadow-[var(--elev-1)] hover:ring-coffee-300"
      }`}
    >
      <CoffeeArt art={coffeeArt(catArtName(label))} className="h-10 w-10" />
      <span className="w-full truncate text-center">{label}</span>
    </button>
  );
}
