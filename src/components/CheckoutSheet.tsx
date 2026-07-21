"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/store";
import { rupiah } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Icon } from "@/components/Icon";

type Method = "CASH" | "QRIS";
type QrisData = {
  orderId: string;
  mode: "midtrans" | "static";
  image: string | null;
  qrString?: string | null;
  qrUrl?: string | null;
  isDemo: boolean;
};

const QUICK_CASH = [0, 20000, 50000, 100000, 150000, 200000];

export default function CheckoutSheet({
  open,
  onClose,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  onPaid: (order: Order) => void;
}) {
  const { items, customerName, subtotal, clear } = useCart();
  const total = subtotal();

  const [method, setMethod] = useState<Method>("CASH");
  const [cash, setCash] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // State QRIS
  const [qris, setQris] = useState<QrisData | null>(null);
  const [qrisLoading, setQrisLoading] = useState(false);
  const [waiting, setWaiting] = useState(false); // menunggu pembayaran (midtrans)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const change = typeof cash === "number" ? cash - total : -total;

  const payload = useMemo(
    () => items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
    [items]
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Reset saat dibuka / ditutup.
  useEffect(() => {
    if (open) {
      setMethod("CASH");
      setCash("");
      setError("");
      setQris(null);
      setWaiting(false);
    } else {
      stopPolling();
    }
  }, [open, stopPolling]);

  const finishPaid = useCallback(
    (order: Order) => {
      stopPolling();
      clear();
      onPaid(order);
    },
    [clear, onPaid, stopPolling]
  );

  // Buat QRIS (charge) saat metode QRIS dipilih.
  useEffect(() => {
    if (!open || method !== "QRIS" || total <= 0 || qris) return;
    let cancelled = false;
    setQrisLoading(true);
    setError("");
    fetch("/api/qris/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload, customerName }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else {
          setQris(d);
          if (d.mode === "midtrans") setWaiting(true);
        }
      })
      .catch(() => !cancelled && setError("Gagal membuat pembayaran QRIS"))
      .finally(() => !cancelled && setQrisLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, method, total, qris, payload, customerName]);

  // Polling status untuk mode Midtrans.
  useEffect(() => {
    if (!waiting || !qris || qris.mode !== "midtrans") return;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        // Route status menanyakan langsung ke Midtrans (tanpa perlu webhook).
        const res = await fetch(`/api/qris/status/${qris.orderId}`);
        const order: Order = await res.json();
        if (order.status === "PAID") finishPaid(order);
        else if (order.status === "CANCELLED") {
          stopPolling();
          setWaiting(false);
          setError("Pembayaran dibatalkan / kedaluwarsa. Silakan ulangi.");
        }
      } catch {
        /* abaikan error sementara, lanjut polling */
      }
    }, 3000);
    return stopPolling;
  }, [waiting, qris, finishPaid, stopPolling]);

  async function submitCash() {
    setError("");
    if (typeof cash !== "number" || cash < total) {
      setError("Nominal uang tunai kurang dari total.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload, cashReceived: cash, customerName }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Gagal memproses pembayaran.");
      finishPaid(data as Order);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  // Konfirmasi manual (mode statis).
  async function confirmStatic() {
    if (!qris) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${qris.orderId}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Gagal konfirmasi.");
      finishPaid(data as Order);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="animate-sheet max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-coffee-200" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Pembayaran</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-full text-coffee-400 transition hover:bg-coffee-100 hover:text-coffee-700"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="card mb-4 flex items-center justify-between p-4">
          <span className="text-coffee-600">Total Tagihan</span>
          <span className="text-2xl font-extrabold text-coffee-800">{rupiah(total)}</span>
        </div>

        {/* Pilih metode */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setMethod("CASH")}
            className={`btn ${method === "CASH" ? "btn-primary" : "btn-ghost"}`}
          >
            <Icon name="wallet" className="h-5 w-5" /> Tunai
          </button>
          <button
            onClick={() => setMethod("QRIS")}
            className={`btn ${method === "QRIS" ? "btn-primary" : "btn-ghost"}`}
          >
            <Icon name="qr" className="h-5 w-5" /> QRIS
          </button>
        </div>

        {/* Tunai */}
        {method === "CASH" && (
          <div className="mb-4 space-y-3">
            <label className="text-sm font-medium text-coffee-600">Uang diterima</label>
            <input
              type="number"
              inputMode="numeric"
              className="input text-lg font-semibold"
              placeholder="0"
              value={cash === "" ? "" : cash}
              onChange={(e) => setCash(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
            />
            <div className="grid grid-cols-3 gap-2">
              {QUICK_CASH.map((v) => (
                <button
                  key={v}
                  onClick={() => setCash(v === 0 ? total : v)}
                  className="rounded-lg bg-coffee-100 py-2 text-sm font-semibold text-coffee-700 active:scale-95"
                >
                  {v === 0 ? "Uang Pas" : rupiah(v)}
                </button>
              ))}
            </div>
            {typeof cash === "number" && cash >= total && (
              <div className="flex items-center justify-between rounded-xl bg-green-50 p-3 text-green-800">
                <span>Kembalian</span>
                <span className="text-xl font-bold">{rupiah(change)}</span>
              </div>
            )}
          </div>
        )}

        {/* QRIS */}
        {method === "QRIS" && (
          <div className="mb-4">
            <div className="card flex flex-col items-center p-5">
              {qrisLoading && <div className="py-16 text-coffee-500">Membuat kode QRIS…</div>}
              {!qrisLoading && qris?.image && (
                <>
                  <div className="rounded-2xl bg-white p-2 ring-1 ring-coffee-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qris.image} alt="QRIS" className="h-56 w-56" />
                  </div>
                  <p className="mt-3 text-center text-sm text-coffee-600">
                    Scan dengan aplikasi bank / e-wallet
                    <br />
                    <span className="font-bold text-coffee-800">{rupiah(total)}</span>
                  </p>
                  {qris.mode === "midtrans" && waiting && (
                    <div className="mt-3 flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700">
                      <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
                      Menunggu pembayaran…
                    </div>
                  )}
                  {qris.mode === "static" && qris.isDemo && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                      Mode demo — QR ini belum terhubung ke rekening merchant asli. Atur QRIS /
                      Midtrans Anda di menu <b>Atur</b>.
                    </p>
                  )}
                  {qris.mode === "midtrans" && (
                    <>
                      <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-center text-xs text-blue-700">
                        QR Midtrans aktif — scan &amp; bayar, struk muncul otomatis.
                      </p>
                      {qris.qrUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(qris.qrUrl || "");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="mt-2 text-xs font-medium text-coffee-500 underline decoration-dotted hover:text-coffee-700"
                        >
                          {copied ? "URL QR tersalin ✓" : "Salin URL QR (tempel di kolom simulator sandbox)"}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            {qris?.mode === "midtrans" ? (
              <p className="mt-3 text-center text-sm text-coffee-500">
                Struk akan muncul otomatis setelah pembayaran diterima.
              </p>
            ) : (
              <p className="mt-3 text-center text-sm text-coffee-500">
                Setelah customer menyelesaikan pembayaran, tekan tombol di bawah.
              </p>
            )}
          </div>
        )}

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {/* Tombol aksi */}
        {method === "CASH" && (
          <button onClick={submitCash} disabled={loading || total <= 0} className="btn-primary w-full text-lg">
            {loading ? "Memproses…" : "Bayar & Cetak Struk"}
          </button>
        )}
        {method === "QRIS" && qris?.mode === "static" && (
          <button
            onClick={confirmStatic}
            disabled={loading || qrisLoading}
            className="btn-primary w-full text-lg"
          >
            {loading ? "Memproses…" : "Konfirmasi Sudah Dibayar"}
          </button>
        )}
        {method === "QRIS" && qris?.mode === "midtrans" && (
          <div className="space-y-2">
            <button
              onClick={confirmStatic}
              disabled={loading || qrisLoading}
              className="btn-primary w-full text-lg"
            >
              {loading ? "Memproses…" : "Konfirmasi Pembayaran"}
            </button>
            <button onClick={onClose} className="btn-ghost w-full">
              Tutup
            </button>
            <p className="text-center text-[11px] text-coffee-400">
              Struk muncul otomatis saat pembayaran terdeteksi. Tekan Konfirmasi bila
              customer sudah bayar tapi belum ter-update (mis. mode sandbox).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
