"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Kasir", icon: "🛒" },
  { href: "/riwayat", label: "Riwayat", icon: "🧾" },
  { href: "/dashboard", label: "Laporan", icon: "📊" },
  { href: "/produk", label: "Menu", icon: "☕" },
  { href: "/pengaturan", label: "Atur", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-coffee-100 bg-white/95 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
                active ? "text-coffee-700" : "text-coffee-400"
              }`}
            >
              <span className={`text-xl transition ${active ? "scale-110" : ""}`}>{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
