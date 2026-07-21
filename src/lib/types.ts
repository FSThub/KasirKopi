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
  categoryId: string;
  isAvailable: boolean;
  category?: Category;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
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
