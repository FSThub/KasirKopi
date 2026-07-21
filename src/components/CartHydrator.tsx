"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/store";

/**
 * Menghidrasi keranjang (zustand persist) dari localStorage SETELAH mount,
 * agar render awal klien sama dengan SSR (keranjang kosong) → tanpa
 * hydration mismatch. Tidak merender apa pun.
 */
export default function CartHydrator() {
  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);
  return null;
}
