/**
 * Mesin rekomendasi upsell BUATAN SENDIRI (tanpa AI/LLM eksternal).
 *
 * Tingkat 1 memakai algoritma Apriori (lihat lib/apriori.ts): riwayat transaksi
 * digali menjadi frequent itemset lalu aturan asosiasi "isi keranjang → produk
 * lain", dan produk dengan confidence tertinggi diusulkan. Bila data masih
 * sedikit, mundur ke menu terlaris lalu pasangan antar-kategori.
 * Semuanya dihitung on-the-fly; makin banyak transaksi makin tajam.
 */
import { aturanAsosiasi, frequentItemsets } from "./apriori";

export type MenuItem = { name: string; price: number; category?: string };
export type OrderLike = { items: { name: string; quantity: number }[] };
export type CartLine = { name: string; quantity: number };
export type Suggestion = { name: string; reason: string };
export type RecoResult = { suggestions: Suggestion[]; pitch: string };

export function recommend(cart: CartLine[], menu: MenuItem[], history: OrderLike[]): RecoResult {
  const cartNames = new Set(cart.map((c) => c.name.toLowerCase()));
  const byLower = new Map(menu.map((m) => [m.name.toLowerCase(), m]));
  const candidates = menu.filter((m) => !cartNames.has(m.name.toLowerCase()) && m.name);
  if (cart.length === 0 || candidates.length === 0) return { suggestions: [], pitch: "" };

  // Statistik dari riwayat.
  const popularity = new Map<string, number>(); // nama -> total qty
  const transaksi: string[][] = [];
  for (const o of history) {
    const names = [...new Set(o.items.map((i) => i.name))];
    for (const it of o.items) popularity.set(it.name, (popularity.get(it.name) ?? 0) + it.quantity);
    if (names.length > 0) transaksi.push(names);
  }

  // Aturan asosiasi Apriori: anteseden (isi keranjang) -> konsekuen (usulan).
  const aturan = transaksi.length
    ? aturanAsosiasi(frequentItemsets(transaksi, 0.03, 3), 0.15)
    : [];

  const picked: Suggestion[] = [];
  const taken = new Set<string>();
  const push = (name: string, reason: string) => {
    if (taken.has(name.toLowerCase()) || picked.length >= 3) return;
    taken.add(name.toLowerCase());
    picked.push({ name, reason });
  };

  // 1) Aturan asosiasi Apriori yang antesedennya ada di keranjang.
  const namaKandidat = new Set(candidates.map((c) => c.name));
  const scored: { name: string; score: number; reason: string }[] = [];
  const terbaik = new Map<string, { score: number; reason: string }>();
  for (const r of aturan) {
    if (!namaKandidat.has(r.consequent)) continue;
    // Seluruh anteseden harus sudah ada di keranjang.
    if (!r.antecedent.every((a) => cartNames.has(a.toLowerCase()))) continue;
    const lama = terbaik.get(r.consequent);
    if (!lama || r.confidence > lama.score) {
      terbaik.set(r.consequent, {
        score: r.confidence,
        reason: `Sering dibeli dengan ${r.antecedent.join(" + ")}`,
      });
    }
  }
  for (const [name, v] of terbaik) scored.push({ name, score: v.score, reason: v.reason });
  scored.sort((a, b) => b.score - a.score);
  for (const s of scored) push(s.name, s.reason);

  // 2) Fallback: menu terlaris keseluruhan.
  if (picked.length < 3) {
    const byPop = candidates
      .map((c) => ({ c, p: popularity.get(c.name) ?? 0 }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p);
    for (const { c } of byPop) push(c.name, "Menu terlaris");
  }

  // 3) Fallback cold-start: pasangan antar-kategori (mis. kopi + snack), termurah dulu.
  if (picked.length < 3) {
    const cartCats = new Set(
      cart.map((c) => byLower.get(c.name.toLowerCase())?.category).filter(Boolean) as string[]
    );
    const pairing = [...candidates].sort((a, b) => {
      const da = a.category && cartCats.has(a.category) ? 1 : 0;
      const db = b.category && cartCats.has(b.category) ? 1 : 0;
      if (da !== db) return da - db; // kategori berbeda didahulukan
      return a.price - b.price;
    });
    for (const c of pairing) {
      const diff = !c.category || !cartCats.has(c.category);
      push(c.name, diff ? "Cocok jadi pelengkap" : "Tawaran tambahan");
    }
  }

  const suggestions = picked.slice(0, 3);
  const pitch = suggestions[0]
    ? `Mau sekalian ${suggestions[0].name}? ${suggestions[0].reason}.`
    : "";
  return { suggestions, pitch };
}

