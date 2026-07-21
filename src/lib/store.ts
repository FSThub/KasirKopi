import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "./types";

type CartState = {
  items: CartItem[];
  customerName: string;
  add: (p: Product) => void;
  inc: (productId: string) => void;
  dec: (productId: string) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
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
      add: (p) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === p.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return {
            items: [
              ...s.items,
              { productId: p.id, name: p.name, price: p.price, emoji: p.emoji, quantity: 1 },
            ],
          };
        }),
      inc: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        })),
      dec: (id) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.productId === id ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.productId !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.productId === id ? { ...i, quantity: Math.max(0, qty) } : i))
            .filter((i) => i.quantity > 0),
        })),
      setCustomerName: (name) => set({ customerName: name }),
      clear: () => set({ items: [], customerName: "" }),
      count: () => get().items.reduce((a, i) => a + i.quantity, 0),
      subtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
    }),
    { name: "kasirkopi-cart" }
  )
);
