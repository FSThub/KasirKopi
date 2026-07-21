import type { ItemOptions } from "./options";

export type Category = {
  id: string;
  name: string;
  sort: number;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  image?: string | null;
  categoryId: string;
  isAvailable: boolean;
  description?: string | null;
  category?: Category;
};

export type CartItem = {
  /** Kunci unik baris = produk + opsi inti. */
  lineId: string;
  productId: string;
  name: string;
  emoji: string;
  image?: string | null;
  /** Harga dasar produk (ukuran M). */
  basePrice: number;
  /** Harga satuan setelah delta ukuran. */
  price: number;
  quantity: number;
  options: ItemOptions;
};

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived: number | null;
  change: number | null;
  status: string;
  items: OrderItem[];
  createdAt: string;
};
