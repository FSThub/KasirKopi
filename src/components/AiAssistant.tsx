"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/store";
import { Icon } from "@/components/Icon";
import type { Product } from "@/lib/types";

type Suggestion = { name: string; reason: string };
type AiState = {
  loading: boolean;
  configured: boolean;
  error?: string;
  suggestions: Suggestion[];
  pitch: string;
};

/**
 * Asisten AI kasir: menampilkan saran upsell dari Claude berdasarkan isi
 * keranjang. Menyegarkan otomatis (debounce) saat pesanan berubah.
 */
export default function AiAssistant({ products }: { products: Product[] }) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const [state, setState] = useState<AiState>({
    loading: false,
    configured: true,
    suggestions: [],
    pitch: "",
  });

  // Tanda tangan pesanan agar fetch hanya saat isi berubah.
  const signature = items.map((i) => `${i.name}:${i.quantity}`).join("|");

  useEffect(() => {
    if (items.length === 0) {
      setState((s) => ({ ...s, suggestions: [], pitch: "", error: undefined, loading: false }));
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: undefined }));
      try {
        const res = await fetch("/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: items.map((i) => ({ name: i.name, quantity: i.quantity })) }),
          signal: controller.signal,
        });
        const d = await res.json();
        setState({
          loading: false,
          configured: d.configured !== false,
          error: d.error,
          suggestions: d.suggestions ?? [],
          pitch: d.pitch ?? "",
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, error: "Gagal memuat saran" }));
      }
    }, 900);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (items.length === 0) return null;

  const addByName = (name: string) => {
    const p = products.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (p) add(p);
  };

  return (
    <div className="animate-rise mx-5 mb-3 rounded-2xl border border-coffee-200/70 bg-white p-3 shadow-[var(--elev-1)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coffee-700 text-white">
          <Icon name="sparkles" className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm font-bold tracking-tight text-coffee-800">Rekomendasi</p>
        {state.loading && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-coffee-400">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-coffee-500" />
            menghitung…
          </span>
        )}
      </div>

      {state.error ? (
        <p className="text-xs text-amber-600">Saran belum tersedia: {state.error}</p>
      ) : state.loading && state.suggestions.length === 0 ? (
        <div className="space-y-2">
          <div className="h-8 animate-pulse rounded-lg bg-coffee-100/70" />
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-coffee-100/70" />
        </div>
      ) : (
        <>
          {state.pitch && (
            <p className="mb-2 rounded-lg bg-coffee-50 px-3 py-2 text-xs italic leading-relaxed text-coffee-600">
              “{state.pitch}”
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {state.suggestions.map((s) => (
              <button
                key={s.name}
                onClick={() => addByName(s.name)}
                className="group flex items-center gap-2 rounded-xl bg-coffee-50 px-3 py-2 text-left transition hover:bg-coffee-100 active:scale-[0.98]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coffee-700 text-white transition group-hover:rotate-90">
                  <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-coffee-800">{s.name}</span>
                  {s.reason && <span className="block truncate text-[11px] text-coffee-400">{s.reason}</span>}
                </span>
              </button>
            ))}
            {!state.loading && state.suggestions.length === 0 && (
              <p className="text-xs text-coffee-400">Tidak ada saran tambahan untuk pesanan ini.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
