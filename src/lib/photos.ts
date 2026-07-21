/**
 * Foto produk realistis (Unsplash CDN) dipetakan dari nama/kategori menu.
 * Bila URL gagal dimuat (offline / foto berubah), UI otomatis fallback ke
 * ilustrasi <CoffeeArt> — lihat komponen ProductImage.
 */

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=480&q=70`;

const PHOTOS = {
  latte: U("photo-1541167760496-1628856ab772"), // latte art cangkir
  espresso: U("photo-1510591509098-f4fdc6d0ff04"), // espresso shot
  blackCoffee: U("photo-1509042239860-f550ce710b93"), // kopi hitam barista
  icedCoffee: U("photo-1517701550927-30cf4ba1dba5"), // es kopi susu gelas
  coffeeTop: U("photo-1495474472287-4d71bcdd2085"), // kopi tampak atas
  matcha: U("photo-1515823064-d6e0c04616a7"), // matcha latte
  chocolate: U("photo-1542990253-a781e04c0082"), // cokelat
  tea: U("photo-1544787219-7f47ccb76574"), // teh
  croissant: U("photo-1555507036-ab1f4038808a"), // croissant
  toast: U("photo-1484723091739-30a097e8f929"), // roti bakar / french toast
} as const;

/** Pilih URL foto untuk sebuah produk; null → pakai ilustrasi. */
export function productPhoto(name: string, category?: string): string | null {
  const n = name.toLowerCase();
  const c = (category || "").toLowerCase();

  if (/croissant/.test(n)) return PHOTOS.croissant;
  if (/roti|toast/.test(n)) return PHOTOS.toast;
  if (/fries|kentang/.test(n) || c.includes("snack")) return PHOTOS.croissant;

  if (/matcha/.test(n)) return PHOTOS.matcha;
  if (/chocolate|cokelat|red velvet/.test(n)) return PHOTOS.chocolate;
  if (/teh|tarik/.test(n)) return PHOTOS.tea;

  if (/espresso/.test(n)) return PHOTOS.espresso;
  if (/americano|tubruk/.test(n)) return PHOTOS.blackCoffee;
  if (/v60|vietnam|manual/.test(n) || c.includes("manual")) return PHOTOS.coffeeTop;
  if (/cappuccino|latte|macchiato/.test(n)) return PHOTOS.latte;

  // Default: kopi susu / es kopi.
  return PHOTOS.icedCoffee;
}
