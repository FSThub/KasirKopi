import { prisma } from "./prisma";
import { demoProductMap } from "./demo";
import {
  normalizeOptions,
  optionsNameSuffix,
  sizeDelta,
  type ItemOptions,
} from "./options";

export type CartLine = { productId: string; quantity: number; options?: Partial<ItemOptions> };

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
  /** true bila perhitungan memakai data demo (DB tidak tersedia). */
  demo: boolean;
};

type PriceInfo = { id: string; name: string; price: number };

/**
 * Hitung item & total order dari daftar keranjang.
 * Harga SELALU diambil dari sumber tepercaya (DB, atau data demo bila DB
 * tidak tersedia) — bukan dari harga yang dikirim client. Delta ukuran
 * ditambahkan di server dari konstanta opsi.
 * @throws Error bila keranjang kosong / produk tidak ditemukan.
 */
export async function computeOrder(items: CartLine[]): Promise<ComputedOrder> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Keranjang kosong");
  }

  const productIds = items.map((i) => i.productId);
  let map: Map<string, PriceInfo>;
  let taxPercent = 0;
  let demo = false;

  try {
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    map = new Map(products.map((p) => [p.id, p]));
    const taxSetting = await prisma.setting.findUnique({ where: { key: "tax_percent" } });
    taxPercent = parseFloat(taxSetting?.value || "0") || 0;
  } catch {
    // DB tidak tersedia → pakai data demo.
    map = demoProductMap as unknown as Map<string, PriceInfo>;
    demo = true;
  }

  const orderItems: ComputedOrder["orderItems"] = [];
  let subtotal = 0;
  for (const it of items) {
    const p = map.get(it.productId);
    if (!p) throw new Error("Produk tidak ditemukan");
    const opts = normalizeOptions(it.options);
    const qty = Math.max(1, parseInt(String(it.quantity), 10) || 1);
    const unit = p.price + sizeDelta(opts.size);
    const note = opts.note ? ` — ${opts.note}` : "";
    const name = `${p.name}${optionsNameSuffix(opts)}${note}`;
    const sub = unit * qty;
    subtotal += sub;
    orderItems.push({ productId: p.id, name, price: unit, quantity: qty, subtotal: sub });
  }

  const tax = Math.round((subtotal * taxPercent) / 100);
  const total = subtotal + tax;

  return { orderItems, subtotal, tax, total, demo };
}

export function makeOrderNumber(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `KK-${stamp}-${rand}`;
}
