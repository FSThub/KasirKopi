"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

/**
 * Kerangka tampilan aplikasi.
 * Halaman pelanggan (/menu, dibuka dari QR meja) sengaja tampil polos tanpa
 * navigasi kasir — pelanggan tidak boleh melihat menu Riwayat, Laporan, dsb.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  // Halaman tanpa navigasi kasir: pemesanan pelanggan (/menu) dan halaman
  // login — di login navigasi belum relevan, dan bila dirender ia ikut
  // memanggil API kasir yang pasti ditolak.
  const tanpaNavigasi = pathname.startsWith("/menu") || pathname.startsWith("/login");

  if (tanpaNavigasi) return <div className="min-h-screen">{children}</div>;

  return (
    <>
      <Sidebar />
      <div className="min-h-screen pb-24 lg:pb-0 lg:pl-20">{children}</div>
      <BottomNav />
    </>
  );
}
