import { prisma } from "./prisma";

export type CartLine = { productId: string; quantity: number };

export type ComputedOrder = {
  orderItems: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
};

/**
 * Hitung item & total order dari daftar keranjang.
 * Harga SELALU diambil dari database (tidak percaya harga dari client).
 * @throws Error bila keranjang kosong / produk tidak ditemukan.
 */
export async function computeOrder(items: CartLine[]): Promise<ComputedOrder> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Keranjang kosong");
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const map = new Map(products.map((p) => [p.id, p]));

  const orderItems: ComputedOrder["orderItems"] = [];
  let subtotal = 0;
  for (const it of items) {
    const p = map.get(it.productId);
    if (!p) throw new Error("Produk tidak ditemukan");
    const qty = Math.max(1, parseInt(String(it.quantity), 10) || 1);
    const sub = p.price * qty;
    subtotal += sub;
    orderItems.push({ productId: p.id, name: p.name, price: p.price, quantity: qty, subtotal: sub });
  }

  const taxSetting = await prisma.setting.findUnique({ where: { key: "tax_percent" } });
  const taxPercent = parseFloat(taxSetting?.value || "0") || 0;
  const tax = Math.round((subtotal * taxPercent) / 100);
  const total = subtotal + tax;

  return { orderItems, subtotal, tax, total };
}

export function makeOrderNumber(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `KK-${stamp}-${rand}`;
}
