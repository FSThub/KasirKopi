import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "./types";
import {
  defaultOptions,
  lineSignature,
  sizeDelta,
  type ItemOptions,
} from "./options";

type CartState = {
  items: CartItem[];
  customerName: string;
  add: (p: Product, options?: ItemOptions, quantity?: number) => void;
  inc: (lineId: string) => void;
  dec: (lineId: string) => void;
  remove: (lineId: string) => void;
  setQty: (lineId: string, qty: number) => void;
  setNote: (lineId: string, note: string) => void;
  setCustomerName: (name: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: "",
      add: (p, options, quantity = 1) =>
        set((s) => {
          const opts = options ?? defaultOptions();
          const lineId = lineSignature(p.id, opts);
          const price = p.price + sizeDelta(opts.size);
          const existing = s.items.find((i) => i.lineId === lineId);
          if (existing) {
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
      setQty: (lineId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.lineId === lineId ? { ...i, quantity: Math.max(0, qty) } : i))
            .filter((i) => i.quantity > 0),
        })),
      setNote: (lineId, note) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.lineId === lineId ? { ...i, options: { ...i.options, note } } : i
          ),
        })),
      setCustomerName: (name) => set({ customerName: name }),
      clear: () => set({ items: [], customerName: "" }),
      count: () => get().items.reduce((a, i) => a + i.quantity, 0),
      subtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
    }),
    {
      name: "kasirkopi-cart-v2",
      // Jangan hidrasi otomatis saat load — cegah mismatch SSR vs client
      // (server render keranjang kosong, localStorage bisa berisi).
      // Dihidrasi manual oleh <CartHydrator/> setelah mount.
      skipHydration: true,
    }
  )
);
