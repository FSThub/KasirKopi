/**
 * Mesin rekomendasi upsell BUATAN SENDIRI (tanpa AI/LLM eksternal).
 * Pendekatan: Market Basket Analysis sederhana — "sering dibeli bersama"
 * (co-occurrence + confidence) dari riwayat transaksi, dengan fallback
 * ke menu terlaris lalu pasangan antar-kategori saat data masih sedikit.
 * Semuanya dihitung on-the-fly; makin banyak transaksi makin pintar.
 */

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
  const orderCount = new Map<string, number>(); // nama -> jumlah order memuatnya
  const pairCount = new Map<string, number>(); // "a||b" (terurut) -> co-occurrence
  for (const o of history) {
    const names = [...new Set(o.items.map((i) => i.name))];
    for (const it of o.items) popularity.set(it.name, (popularity.get(it.name) ?? 0) + it.quantity);
    for (const n of names) orderCount.set(n, (orderCount.get(n) ?? 0) + 1);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const k = pairKey(names[i], names[j]);
        pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
      }
    }
  }

  const picked: Suggestion[] = [];
  const taken = new Set<string>();
  const push = (name: string, reason: string) => {
    if (taken.has(name.toLowerCase()) || picked.length >= 3) return;
    taken.add(name.toLowerCase());
    picked.push({ name, reason });
  };

  // 1) Co-occurrence: confidence(cartItem -> kandidat) = bersama / muncul(cartItem).
  const scored: { name: string; score: number; reason: string }[] = [];
  for (const cand of candidates) {
    let best = 0;
    let reason = "";
    for (const c of cart) {
      const co = pairCount.get(pairKey(c.name, cand.name)) ?? 0;
      const base = orderCount.get(c.name) ?? 0;
      const conf = base > 0 ? co / base : 0;
      if (conf > best) {
        best = conf;
        reason = `Sering dibeli dengan ${c.name}`;
      }
    }
    if (best > 0) scored.push({ name: cand.name, score: best, reason });
  }
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

function pairKey(a: string, b: string): string {
  return a < b ? `${a}||${b}` : `${b}||${a}`;
}
