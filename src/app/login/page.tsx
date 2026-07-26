"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface p-4">
      <div className="animate-rise w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-coffee-700 text-white">
            <Icon name="coffee" className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-coffee-800">KasirKopi</h1>
          <p className="text-sm text-coffee-400">Masuk untuk mengakses kasir</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-coffee-600">Username</label>
            <input
              className="input"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="kasir"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-coffee-600">Password</label>
            <input
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base">
            {loading ? "Memproses…" : "Masuk"}
            {!loading && <Icon name="arrow-right" className="h-5 w-5" />}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-coffee-400">
          Hanya kasir berwenang yang dapat mengakses aplikasi ini.
        </p>
      </div>
    </div>
  );
}
