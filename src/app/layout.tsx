import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "KasirKopi — Aplikasi Kasir Kopi",
  description: "Aplikasi kasir kopi yang cepat, sederhana, dan mobile friendly. Mendukung pembayaran tunai & QRIS.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#7d472f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen">
        <main className="mx-auto max-w-lg pb-24">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
