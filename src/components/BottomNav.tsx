"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Kasir", icon: "cart" },
  { href: "/riwayat", label: "Riwayat", icon: "receipt" },
  { href: "/dashboard", label: "Laporan", icon: "chart" },
  { href: "/produk", label: "Menu", icon: "coffee" },
  { href: "/pengaturan", label: "Atur", icon: "settings" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-coffee-100 bg-white/90 backdrop-blur pb-safe lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-coffee-700" : "text-coffee-400"
              }`}
            >
              <Icon
                name={it.icon}
                className={`h-[22px] w-[22px] transition-transform duration-200 ${
                  active ? "scale-110" : ""
                }`}
                strokeWidth={active ? 2.4 : 2}
              />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
