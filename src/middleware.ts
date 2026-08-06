import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";

// Path yang boleh diakses tanpa login.
// - /login: halaman login
// - /api/auth: proses login/logout
// - /api/midtrans: webhook dipanggil server Midtrans (eksternal, tanpa sesi)
// - /menu: halaman pemesanan pelanggan yang dibuka dari QR di meja
// - /api/public: API terbatas untuk halaman pelanggan tersebut
const PUBLIC = ["/login", "/api/auth", "/api/midtrans", "/menu", "/api/public"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname === p)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (session) return NextResponse.next();

  // API → 401 JSON; halaman → redirect ke /login
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Jalankan di semua rute kecuali aset statis Next & gambar.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)"],
};
