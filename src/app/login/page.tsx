"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Halaman masuk kasir.
 *
 * Tata letak dua panel pada layar lebar: sisi kiri panel merek berwarna kopi
 * pekat, sisi kanan formulir di atas latar terang. Pada ponsel panel merek
 * disembunyikan dan diganti kepala ringkas, supaya formulir tetap dekat
 * jempol dan tidak perlu digulir.
 */
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [namaToko, setNamaToko] = useState("");

  // Nama toko diambil dari Pengaturan agar layar masuk memakai identitas
  // kedai, bukan nama aplikasi.
  useEffect(() => {
    fetch("/api/public/toko")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.storeName && setNamaToko(d.storeName))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal masuk");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-1 overflow-y-auto bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* ── Panel merek (layar lebar) ─────────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-coffee-800 p-12 text-white lg:flex">
        <div className="pola-kopi absolute inset-0" aria-hidden />
        {/* Lingkaran besar samar sebagai kedalaman, bukan gradien */}
        <div
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/[0.05]"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-coffee-950/25"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Icon name="coffee" className="h-6 w-6" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            {namaToko || "KasirKopi"}
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-[1.15] tracking-tight">
            Layani pesanan
            <br />
            tanpa antre panjang.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-coffee-100/80">
            Catat transaksi, terima pembayaran QRIS, dan pantau menu terlaris —
            semuanya dari satu layar.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-coffee-100/90">
            {[
              ["qr", "Pembayaran QRIS dinamis, nominal terisi otomatis"],
              ["bell", "Pesanan dari QR meja langsung masuk ke kasir"],
              ["chart", "Menu terlaris per kategori diperbarui sendiri"],
            ].map(([ikon, teks]) => (
              <li key={teks} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon name={ikon as "qr"} className="h-4 w-4" />
                </span>
                {teks}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-coffee-100/50">
          © {new Date().getFullYear()} {namaToko || "KasirKopi"}
        </p>
      </aside>

      {/* ── Formulir ──────────────────────────────────────────────── */}
      <main className="flex items-center justify-center px-5 py-10">
        <div className="animate-rise w-full max-w-[380px]">
          {/* Kepala ringkas — hanya ponsel/tablet */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="pola-kopi mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-coffee-700 text-white shadow-[var(--elev-2)]">
              <Icon name="coffee" className="h-8 w-8" />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-coffee-800">
              {namaToko || "KasirKopi"}
            </h1>
          </div>

          <div className="mb-7 hidden lg:block">
            <h1 className="text-[26px] font-extrabold tracking-tight text-coffee-900">
              Selamat datang kembali
            </h1>
            <p className="mt-1.5 text-sm text-coffee-400">
              Masuk untuk mulai melayani pesanan.
            </p>
          </div>
          <p className="mb-6 text-center text-sm text-coffee-400 lg:hidden">
            Masuk untuk mulai melayani pesanan.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-semibold text-coffee-700"
              >
                Username
              </label>
              <div className="relative">
                <Icon
                  name="user"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-coffee-300"
                />
                <input
                  id="username"
                  className="input-ikon"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kasir"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-coffee-700"
              >
                Password
              </label>
              <div className="relative">
                <Icon
                  name="lock"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-coffee-300"
                />
                <input
                  id="password"
                  type={lihatSandi ? "text" : "password"}
                  className="input-ikon pr-12"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setLihatSandi((v) => !v)}
                  aria-label={lihatSandi ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-coffee-400 transition-colors hover:bg-coffee-50 hover:text-coffee-700"
                >
                  <Icon name={lihatSandi ? "eye-off" : "eye"} className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100"
              >
                <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-1 w-full py-3.5 text-base"
            >
              {loading ? (
                "Memproses…"
              ) : (
                <>
                  Masuk
                  <Icon name="arrow-right" className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 text-coffee-300">
            <span className="h-px flex-1 bg-coffee-100" />
            <Icon name="lock" className="h-3.5 w-3.5" />
            <span className="h-px flex-1 bg-coffee-100" />
          </div>
          <p className="mt-3 text-center text-xs leading-relaxed text-coffee-400">
            Hanya kasir berwenang yang dapat mengakses aplikasi ini.
          </p>
        </div>
      </main>
    </div>
  );
}
