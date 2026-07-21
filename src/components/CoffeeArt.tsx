/**
 * Ilustrasi minuman/menu berbasis SVG (mandiri, tanpa aset eksternal).
 * Dipakai sebagai "foto" produk di kartu menu & panel Bills.
 * Bentuk dipilih dari jenis menu: gelas es, cangkir panas, atau pastry.
 */

export type ArtKind = "iced" | "hot" | "food";

export type Art = {
  kind: ArtKind;
  /** Warna cairan utama (kopi/teh/matcha). */
  liquid: string;
  /** Warna lapisan bawah (susu/dasar). */
  base: string;
  /** Warna aksen (sedotan / topping / krim). */
  accent: string;
  cream: boolean;
};

/** Tentukan gaya ilustrasi dari nama produk & kategori. */
export function coffeeArt(name: string, category?: string): Art {
  const n = name.toLowerCase();
  const c = (category || "").toLowerCase();

  if (c.includes("snack") || /croissant|roti|fries|kentang|cookie|cake|dessert/.test(n)) {
    return { kind: "food", liquid: "#d69a4f", base: "#b9793a", accent: "#8a5a2b", cream: false };
  }
  if (/matcha/.test(n)) {
    return { kind: "iced", liquid: "#83a352", base: "#c7d9a0", accent: "#5d7a37", cream: true };
  }
  if (/red velvet/.test(n)) {
    return { kind: "iced", liquid: "#9b3b46", base: "#d59aa1", accent: "#7a2c35", cream: true };
  }
  if (/chocolate|cokelat/.test(n)) {
    return { kind: "iced", liquid: "#4a2c1a", base: "#8a5a3a", accent: "#3a2114", cream: true };
  }
  if (/teh|tarik/.test(n)) {
    return { kind: "iced", liquid: "#b3743a", base: "#dcae76", accent: "#8a5628", cream: false };
  }
  if (/v60|tubruk|americano|espresso/.test(n)) {
    return { kind: "hot", liquid: "#3a2416", base: "#5a3a22", accent: "#efe4d6", cream: false };
  }
  if (/cappuccino|latte|macchiato/.test(n)) {
    return { kind: "hot", liquid: "#5a3a22", base: "#7a5334", accent: "#efe4d6", cream: true };
  }
  // Default: kopi susu (gelas es dengan gradasi susu).
  return { kind: "iced", liquid: "#6b4a2e", base: "#d9b48a", accent: "#c26b4a", cream: false };
}

export default function CoffeeArt({
  art,
  className = "h-20 w-20",
}: {
  art: Art;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {art.kind === "food" ? (
        <Pastry art={art} />
      ) : art.kind === "hot" ? (
        <HotCup art={art} />
      ) : (
        <IcedGlass art={art} />
      )}
    </svg>
  );
}

function IcedGlass({ art }: { art: Art }) {
  return (
    <g>
      {/* Sedotan */}
      <rect x="57" y="6" width="6" height="52" rx="3" transform="rotate(14 60 30)" fill={art.accent} />
      {/* Badan gelas */}
      <path d="M30 34 L34 84 Q35 92 43 92 L57 92 Q65 92 66 84 L70 34 Z" fill="#f3eee8" />
      {/* Lapisan susu (bawah) */}
      <path d="M32.5 56 L34.6 83 Q35.2 89.5 43 89.5 L57 89.5 Q64.8 89.5 65.4 83 L67.5 56 Z" fill={art.base} />
      {/* Lapisan kopi (atas) */}
      <path d="M31.4 37 L32.6 57 L67.4 57 L68.6 37 Z" fill={art.liquid} />
      {/* Permukaan */}
      <ellipse cx="50" cy="36.5" rx="19" ry="4.6" fill="#ffffff" opacity="0.85" />
      {art.cream && <Cream />}
      {/* Kilau gelas */}
      <path d="M37 40 L40 82" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function HotCup({ art }: { art: Art }) {
  return (
    <g>
      {/* Uap */}
      <path d="M44 20 q-4 -6 0 -12" stroke="#c9b7a6" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M56 20 q4 -6 0 -12" stroke="#c9b7a6" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Tatakan */}
      <ellipse cx="50" cy="88" rx="30" ry="6" fill="#e9e0d5" />
      {/* Gagang */}
      <path d="M66 50 q14 1 14 14 q0 12 -14 12" fill="none" stroke="#efe6da" strokeWidth="6" />
      {/* Badan cangkir */}
      <path d="M31 44 L33.4 74 Q34.4 84 45 84 L55 84 Q65.6 84 66.6 74 L69 44 Z" fill="#efe6da" />
      {/* Permukaan kopi */}
      <ellipse cx="50" cy="44" rx="19" ry="5.2" fill={art.liquid} />
      {art.cream ? (
        <ellipse cx="50" cy="43.5" rx="13" ry="3.4" fill={art.accent} />
      ) : (
        <ellipse cx="50" cy="43.5" rx="12" ry="3" fill="#ffffff" opacity="0.12" />
      )}
    </g>
  );
}

function Cream() {
  return (
    <g fill="#fdfaf4">
      <circle cx="41" cy="31" r="8.5" />
      <circle cx="51" cy="27" r="10" />
      <circle cx="60" cy="31" r="8" />
      <circle cx="50" cy="34" r="10.5" />
      <path d="M48 20 q2 -6 4 0 q2 4 -2 5 q-4 -1 -2 -5 Z" fill="#d9455a" />
    </g>
  );
}

function Pastry({ art }: { art: Art }) {
  return (
    <g>
      {/* Piring */}
      <ellipse cx="50" cy="74" rx="34" ry="8" fill="#ece4da" />
      <ellipse cx="50" cy="72" rx="27" ry="5.5" fill="#f6f1ea" />
      {/* Croissant */}
      <path d="M22 62 Q50 34 78 62 Q64 70 50 70 Q36 70 22 62 Z" fill={art.liquid} />
      <path d="M22 62 Q50 34 78 62" fill="none" stroke={art.accent} strokeWidth="2" opacity="0.5" />
      <path d="M40 47 Q42 58 40 68" stroke={art.base} strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M52 44 Q54 57 52 69" stroke={art.base} strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M64 48 Q64 58 62 67" stroke={art.base} strokeWidth="2" fill="none" opacity="0.6" />
    </g>
  );
}
