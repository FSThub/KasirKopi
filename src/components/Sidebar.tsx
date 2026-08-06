"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { logout } from "@/lib/logout";
import { useAntrean } from "@/lib/useAntrean";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Kasir", icon: "home" },
  { href: "/pesanan", label: "Pesanan", icon: "bell" },
  { href: "/produk", label: "Menu", icon: "coffee" },
  { href: "/riwayat", label: "Riwayat", icon: "receipt" },
  { href: "/dashboard", label: "Laporan", icon: "chart" },
  { href: "/pengaturan", label: "Atur", icon: "settings" },
];

/** Navigasi rail kiri — hanya tampil di layar lebar (lg ke atas). */
export default function Sidebar() {
  const pathname = usePathname();
  const antrean = useAntrean();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center border-r border-coffee-100 bg-white py-5 lg:flex">
      <Link
        href="/"
        aria-label="KasirKopi"
        className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-coffee-700 text-lg font-black text-white"
      >
        K
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex w-16 flex-col items-center gap-1 rounded-2xl py-2.5 text-[10px] font-semibold transition-colors ${
                active
                  ? "bg-coffee-700 text-white"
                  : "text-coffee-400 hover:bg-coffee-50 hover:text-coffee-700"
              }`}
            >
              <span className="relative">
                <Icon name={it.icon} className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                {it.href === "/pesanan" && antrean > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {antrean}
                  </span>
                )}
              </span>
              {it.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => logout()}
        aria-label="Keluar"
        suppressHydrationWarning
        className="mt-2 flex w-16 flex-col items-center gap-1 rounded-2xl py-2.5 text-[10px] font-semibold text-coffee-400 transition-colors hover:bg-coffee-50 hover:text-coffee-700"
      >
        <Icon name="logout" className="h-[22px] w-[22px]" />
        Keluar
      </button>
    </aside>
  );
}
