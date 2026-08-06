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

export async function GET(req: Request) {
  const port = new URL(req.url).port || "3000";

  const lan: { url: string; nama: string; virtual: boolean }[] = [];
  for (const [nama, antarmuka] of Object.entries(os.networkInterfaces())) {
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

  const publik =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return NextResponse.json({ publik, lan });
}
