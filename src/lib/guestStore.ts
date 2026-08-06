import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "./types";
import { defaultOptions, lineSignature, sizeDelta, type ItemOptions } from "./options";

/**
 * Keranjang milik PELANGGAN (halaman /menu yang dibuka dari QR meja).
 * Sengaja dipisah dari keranjang kasir (lib/store.ts) — beda kunci
 * localStorage — supaya pesanan pelanggan di satu perangkat tidak pernah
 * tercampur dengan transaksi yang sedang dikerjakan kasir.
 */

type Tamu = {
  nama: string;
  hp: string;
  email: string;
  meja: string;
};

type GuestState = {
  items: CartItem[];
  tamu: Tamu;
  /** Id pesanan terakhir supaya pelanggan bisa kembali melihat statusnya. */
  orderId: string | null;
  add: (p: Product, options?: ItemOptions, quantity?: number) => void;
  inc: (lineId: string) => void;
  dec: (lineId: string) => void;
  remove: (lineId: string) => void;
  setNote: (lineId: string, note: string) => void;
  setTamu: (t: Partial<Tamu>) => void;
  setOrderId: (id: string | null) => void;
  clearCart: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useGuestCart = create<GuestState>()(
  persist(
    (set, get) => ({
      items: [],
      tamu: { nama: "", hp: "", email: "", meja: "" },
      orderId: null,
      add: (p, options, quantity = 1) =>
        set((s) => {
          const opts = options ?? defaultOptions();
          const lineId = lineSignature(p.id, opts);
          const price = p.price + sizeDelta(opts.size);
          if (s.items.some((i) => i.lineId === lineId)) {
            return {
              items: s.items.map((i) =>
                i.lineId === lineId ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          const item: CartItem = {
            lineId,
            productId: p.id,
            name: p.name,
            emoji: p.emoji,
            image: p.image ?? null,
            basePrice: p.price,
            price,
            quantity,
            options: opts,
          };
          return { items: [...s.items, item] };
        }),
      inc: (lineId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.lineId === lineId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        })),
      dec: (lineId) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.lineId === lineId ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        })),
      remove: (lineId) => set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),
      setNote: (lineId, note) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.lineId === lineId ? { ...i, options: { ...i.options, note } } : i
          ),
        })),
      setTamu: (t) => set((s) => ({ tamu: { ...s.tamu, ...t } })),
      setOrderId: (id) => set({ orderId: id }),
      clearCart: () => set({ items: [] }),
      count: () => get().items.reduce((a, i) => a + i.quantity, 0),
      subtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
    }),
    { name: "kasirkopi-guest-v1", skipHydration: true }
  )
);
