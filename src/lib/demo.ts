/**
 * Data demo (fallback) ketika database tidak tersedia — mis. DATABASE_URL
 * belum diisi saat pengembangan lokal. Membuat aplikasi tetap bisa
 * menampilkan menu & mensimulasikan transaksi tunai tanpa Postgres.
 *
 * ID dibuat stabil (c1.., p1..) agar konsisten antara GET produk dan
 * perhitungan order di server.
 */
import type { Category, Product } from "./types";

type DemoGroup = {
  id: string;
  name: string;
  emoji: string;
  items: { name: string; price: number; emoji: string; desc: string }[];
};

const GROUPS: DemoGroup[] = [
  {
    id: "c1",
    name: "Kopi Susu",
    emoji: "milk",
    items: [
      { name: "Kopi Susu Gula Aren", price: 18000, emoji: "milk", desc: "Espresso, susu segar, dan manis khas gula aren." },
      { name: "Es Kopi Susu", price: 16000, emoji: "cup", desc: "Kopi susu klasik dengan es, segar dan seimbang." },
      { name: "Kopi Susu Pandan", price: 20000, emoji: "milk", desc: "Aroma pandan lembut berpadu kopi dan susu." },
      { name: "Kopi Susu Vanilla", price: 20000, emoji: "milk", desc: "Sentuhan vanila creamy pada kopi susu favorit." },
    ],
  },
  {
    id: "c2",
    name: "Espresso Based",
    emoji: "coffee",
    items: [
      { name: "Espresso", price: 12000, emoji: "coffee", desc: "Satu shot espresso pekat, dasar semua kopi." },
      { name: "Americano", price: 15000, emoji: "coffee", desc: "Espresso yang dilarutkan air, ringan dan bersih." },
      { name: "Cappuccino", price: 22000, emoji: "coffee", desc: "Espresso, susu, dan busa tebal berimbang." },
      { name: "Cafe Latte", price: 22000, emoji: "coffee", desc: "Espresso lembut dengan banyak susu steamed." },
      { name: "Caramel Macchiato", price: 26000, emoji: "coffee", desc: "Latte dengan lapisan karamel manis legit." },
    ],
  },
  {
    id: "c3",
    name: "Manual Brew",
    emoji: "coffee",
    items: [
      { name: "V60", price: 25000, emoji: "coffee", desc: "Seduh manual bersih dengan karakter biji menonjol." },
      { name: "Tubruk", price: 12000, emoji: "coffee", desc: "Kopi tubruk khas Indonesia, pekat dan hangat." },
      { name: "Vietnam Drip", price: 20000, emoji: "coffee", desc: "Tetes pelan dengan susu kental manis." },
    ],
  },
  {
    id: "c4",
    name: "Non Kopi",
    emoji: "cup",
    items: [
      { name: "Matcha Latte", price: 24000, emoji: "cup", desc: "Matcha premium dengan susu creamy." },
      { name: "Chocolate", price: 22000, emoji: "cup", desc: "Cokelat hangat/dingin yang kaya dan manis." },
      { name: "Red Velvet", price: 24000, emoji: "cup", desc: "Perpaduan cokelat putih dan red velvet lembut." },
      { name: "Teh Tarik", price: 15000, emoji: "cup", desc: "Teh susu ditarik hingga berbusa halus." },
    ],
  },
  {
    id: "c5",
    name: "Snack",
    emoji: "cookie",
    items: [
      { name: "Croissant", price: 18000, emoji: "utensils", desc: "Pastry berlapis mentega, renyah di luar." },
      { name: "Roti Bakar", price: 15000, emoji: "utensils", desc: "Roti panggang dengan isian pilihan." },
      { name: "French Fries", price: 20000, emoji: "utensils", desc: "Kentang goreng renyah, teman ngopi." },
    ],
  },
];

export const demoCategories: Category[] = GROUPS.map((g, i) => ({
  id: g.id,
  name: g.name,
  sort: i,
}));

export const demoProducts: Product[] = GROUPS.flatMap((g, gi) =>
  g.items.map((it, ii) => ({
    id: `p${gi + 1}_${ii + 1}`,
    name: it.name,
    price: it.price,
    emoji: it.emoji,
    description: it.desc,
    categoryId: g.id,
    isAvailable: true,
    category: { id: g.id, name: g.name, sort: gi },
  }))
);

/** Peta id → produk demo, untuk perhitungan order fallback. */
export const demoProductMap = new Map(demoProducts.map((p) => [p.id, p]));
