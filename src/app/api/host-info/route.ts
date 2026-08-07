import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/host-info — usulan alamat dasar untuk QR meja.
 *
 * QR yang berisi "localhost" tidak bisa dibuka dari ponsel pelanggan, karena
 * localhost menunjuk ke ponsel itu sendiri. Endpoint ini menyodorkan alamat
 * yang benar-benar dapat dijangkau: URL publik hasil deploy (bila diset) dan
 * alamat IP komputer ini di jaringan lokal.
 */
/**
 * Adapter virtual (VMware, VirtualBox, Hyper-V, WSL, Docker) punya alamat IP
 * yang hanya bisa dihubungi komputer ini sendiri. Kalau alamat itu dipakai
 * pada QR, ponsel pelanggan akan memuat selamanya tanpa hasil — karena itu
 * adapter semacam ini ditandai dan diletakkan paling belakang.
 */
const RE_VIRTUAL =
  /vmware|virtualbox|vmnet|hyper-v|vethernet|docker|wsl|loopback|tap|tunnel|bluetooth/i;

/**
 * Alamat publik yang benar-benar dapat dibuka pelanggan.
 *
 * Sengaja TIDAK memakai VERCEL_URL: nilainya adalah alamat khusus deployment
 * (mis. namaproyek-a1b2c3-akun.vercel.app) yang dilindungi Vercel Deployment
 * Protection, sehingga pemindaian QR berakhir di halaman masuk vercel.com,
 * bukan di menu. Yang dipakai adalah domain tempat halaman ini sedang dibuka —
 * kasir membukanya lewat domain produksi, dan domain itulah yang dapat
 * dijangkau ponsel pelanggan.
 */
function alamatPublik(req: Request): string | null {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  // Domain produksi tetap milik proyek — tanpa hash deployment, dan sudah
  // mengikuti domain sendiri bila proyek memakainya. Didahulukan supaya QR
  // tetap benar walau kasir kebetulan membuka aplikasi lewat URL deployment.
  const produksi = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (produksi) return `https://${produksi}`;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host && !/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(host)) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  return null;
}

export async function GET(req: Request) {
  const port = new URL(req.url).port || "3000";

  // Di server (Vercel) alamat IP yang terbaca adalah IP internal kontainer —
  // tidak ada artinya bagi ponsel pelanggan. Daftar jaringan lokal hanya
  // berguna saat aplikasi dijalankan di komputer kasir sendiri.
  const lan: { url: string; nama: string; virtual: boolean }[] = [];
  const diServer = !!process.env.VERCEL;
  for (const [nama, antarmuka] of diServer ? [] : Object.entries(os.networkInterfaces())) {
    for (const n of antarmuka ?? []) {
      if (n.family !== "IPv4" || n.internal) continue;
      lan.push({
        url: `http://${n.address}:${port}`,
        nama,
        virtual: RE_VIRTUAL.test(nama),
      });
    }
  }
  // Adapter nyata (Wi-Fi / Ethernet) didahulukan.
  lan.sort((a, b) => Number(a.virtual) - Number(b.virtual));

  return NextResponse.json({ publik: alamatPublik(req), lan });
}
