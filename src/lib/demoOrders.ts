/**
 * Penyimpanan order in-memory untuk MODE DEMO (database tidak tersedia).
 * Dipakai oleh /api/orders, /api/qris/charge, /api/orders/[id](/pay), dan
 * /api/stats supaya seluruh alur (tunai, QRIS statis, riwayat, laporan)
 * tetap berfungsi tanpa Postgres. Data hilang saat server restart — wajar
 * untuk demo.
 */
import { makeOrderNumber } from "./order";

export type DemoOrderItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type DemoOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived: number | null;
  change: number | null;
  status: "PAID" | "PENDING" | "CANCELLED";
  paymentRef: string | null;
  createdAt: string;
  items: DemoOrderItem[];
};

// Simpan di globalThis agar selamat dari hot-reload Next dev.
const g = globalThis as unknown as { __kkDemoOrders?: Map<string, DemoOrder> };
const store: Map<string, DemoOrder> = g.__kkDemoOrders ?? new Map();
g.__kkDemoOrders = store;

export function isDemoOrderId(id: string): boolean {
  return id.startsWith("demo-");
}

export function getDemoOrder(id: string): DemoOrder | undefined {
  return store.get(id);
}

export function saveDemoOrder(order: DemoOrder): DemoOrder {
  store.set(order.id, order);
  return order;
}

export function listDemoOrders(): DemoOrder[] {
  return [...store.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Buat objek order demo lengkap (tanpa DB). */
export function fabricateDemoOrder(args: {
  orderItems: Omit<DemoOrderItem, "id">[];
  customerName: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "CASH" | "QRIS";
  status: DemoOrder["status"];
  cashReceived?: number | null;
  change?: number | null;
  /** Pakai orderNumber tertentu (mis. yang sudah dikirim ke Midtrans). */
  orderNumber?: string;
  paymentRef?: string | null;
}): DemoOrder {
  const orderNumber = args.orderNumber ?? makeOrderNumber();
  return {
    id: `demo-${orderNumber}`,
    orderNumber,
    customerName: args.customerName,
    subtotal: args.subtotal,
    tax: args.tax,
    total: args.total,
    paymentMethod: args.paymentMethod,
    cashReceived: args.cashReceived ?? null,
    change: args.change ?? null,
    status: args.status,
    paymentRef: args.paymentRef ?? null,
    createdAt: new Date().toISOString(),
    items: args.orderItems.map((oi, i) => ({ id: `demo-i-${i}`, ...oi })),
  };
}
