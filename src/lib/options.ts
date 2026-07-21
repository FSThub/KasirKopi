/**
 * Opsi kustomisasi minuman (Mood / Size / Sugar / Ice).
 * Dipakai bersama oleh client (kartu produk + keranjang) dan server
 * (perhitungan harga & snapshot nama pada order) agar konsisten.
 * Server tetap otoritas harga: delta ukuran dihitung dari konstanta ini,
 * bukan dari harga yang dikirim client.
 */

export type Mood = "Panas" | "Dingin";
export type Size = "S" | "M" | "L";
export type Sugar = "30%" | "50%" | "70%";
export type Ice = "30%" | "50%" | "70%";

export type ItemOptions = {
  mood: Mood;
  size: Size;
  sugar: Sugar;
  ice: Ice;
  note?: string;
};

export const MOODS: Mood[] = ["Panas", "Dingin"];
export const SUGARS: Sugar[] = ["30%", "50%", "70%"];
export const ICES: Ice[] = ["30%", "50%", "70%"];

/** Ukuran beserta selisih harga (Rupiah) terhadap harga dasar (M). */
export const SIZES: { key: Size; label: string; delta: number }[] = [
  { key: "S", label: "S", delta: -2000 },
  { key: "M", label: "M", delta: 0 },
  { key: "L", label: "L", delta: 5000 },
];

export function sizeDelta(size: Size): number {
  return SIZES.find((s) => s.key === size)?.delta ?? 0;
}

export function defaultOptions(): ItemOptions {
  return { mood: "Panas", size: "M", sugar: "50%", ice: "50%" };
}

/** Normalisasi opsi dari sumber tak tepercaya (mis. body request). */
export function normalizeOptions(o?: Partial<ItemOptions> | null): ItemOptions {
  const d = defaultOptions();
  if (!o) return d;
  return {
    mood: MOODS.includes(o.mood as Mood) ? (o.mood as Mood) : d.mood,
    size: SIZES.some((s) => s.key === o.size) ? (o.size as Size) : d.size,
    sugar: SUGARS.includes(o.sugar as Sugar) ? (o.sugar as Sugar) : d.sugar,
    ice: ICES.includes(o.ice as Ice) ? (o.ice as Ice) : d.ice,
    note: typeof o.note === "string" ? o.note.slice(0, 120) : undefined,
  };
}

/**
 * Ringkasan opsi untuk ditampilkan di UI, mis. "L · Dingin · Gula 50% · Es 50%".
 * Es hanya ditampilkan untuk minuman dingin.
 */
export function optionsSummary(o: ItemOptions): string {
  const parts: string[] = [o.size, o.mood, `Gula ${o.sugar}`];
  if (o.mood === "Dingin") parts.push(`Es ${o.ice}`);
  return parts.join(" · ");
}

/** Sufiks nama untuk snapshot order, mis. " (L, Dingin, Gula 50%, Es 50%)". */
export function optionsNameSuffix(o: ItemOptions): string {
  const parts: string[] = [o.size, o.mood, `Gula ${o.sugar}`];
  if (o.mood === "Dingin") parts.push(`Es ${o.ice}`);
  return ` (${parts.join(", ")})`;
}

/**
 * Kunci baris keranjang: produk + opsi inti (tanpa catatan) supaya item
 * dengan opsi sama digabung, sedangkan opsi berbeda jadi baris terpisah.
 */
export function lineSignature(productId: string, o: ItemOptions): string {
  return `${productId}|${o.mood}|${o.size}|${o.sugar}|${o.ice}`;
}
