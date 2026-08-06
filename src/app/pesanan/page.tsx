"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { rupiah } from "@/lib/format";

type Item = { id: string; name: string; quantity: number; subtotal: number };
type Pesanan = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  tableNumber: string | null;
  paymentMethod: string;
  /** Terisi hanya bila pembayaran diproses payment gateway (status otomatis). */
  paymentRef: string | null;
  /** Saat pelanggan menyatakan sudah membayar — perlu diperiksa kasir. */
  claimedPaidAt: string | null;
  total: number;
  status: string;
  createdAt: string;
  items: Item[];
};

const jam = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/**
 * Halaman kasir untuk pesanan yang masuk dari QR meja.
 * Pesanan "Bayar di Kasir" diselesaikan di sini; pesanan QRIS akan berubah
 * sendiri menjadi lunas begitu pembayaran pelanggan terdeteksi.
 */
export default function HalamanPesanan() {
  const [data, setData] = useState<Pesanan[]>([]);
  const [muat, setMuat] = useState(true);
  const [proses, setProses] = useState<string | null>(null);
  const [galat, setGalat] = useState("");

  const ambil = useCallback(async () => {
    try {
      const r = await fetch("/api/orders/antrean");
      setData(await r.json());
    } catch {
      /* biarkan daftar lama tampil */
    } finally {
      setMuat(false);
    }
  }, []);

  useEffect(() => {
    ambil();
    // Cukup rapat agar pembayaran QRIS tampil "berhasil" hampir seketika.
    const t = setInterval(ambil, 5000);
    return () => clearInterval(t);
  }, [ambil]);

  const aksi = async (p: Pesanan, jalur: "pay" | "cancel", galatDefault: string) => {
    setProses(p.id);
    setGalat("");
    try {
      const r = await fetch(`/api/orders/${p.id}/${jalur}`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error || galatDefault);
      await ambil();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : galatDefault);
    } finally {
      setProses(null);
    }
  };

  const tandaiLunas = (p: Pesanan) => aksi(p, "pay", "Gagal menandai lunas");

  const batalkan = (p: Pesanan) => {
    if (!confirm(`Batalkan pesanan ${p.orderNumber}? Tindakan ini tidak bisa dibatalkan.`))
      return;
    return aksi(p, "cancel", "Gagal membatalkan pesanan");
  };

  /** Berapa lama pesanan sudah menunggu, untuk menandai yang menggantung. */
  const menitMenunggu = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  // Yang menunggu didahulukan; pelanggan yang menyatakan sudah membayar naik
  // paling atas karena kasir perlu memeriksa saldonya sekarang.
  const menunggu = data
    .filter((p) => p.status === "PENDING")
    .sort(
      (a, b) =>
        Number(!!b.claimedPaidAt) - Number(!!a.claimedPaidAt) ||
        +new Date(a.createdAt) - +new Date(b.createdAt)
    );
  const selesai = data
    .filter((p) => p.status !== "PENDING")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5">
      <header className="mb-4">
        <h1 className="text-xl font-extrabold text-coffee-800">Pesanan Masuk</h1>
        <p className="text-sm text-coffee-400">
          Pesanan dari pelanggan yang memindai QR di meja.
        </p>
      </header>

      {galat && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
          {galat}
        </p>
      )}

      {muat && <p className="py-10 text-center text-coffee-400">Memuat…</p>}

      {!muat && data.length === 0 && (
        <div className="card p-10 text-center text-coffee-400">
          Belum ada pesanan masuk.
        </div>
      )}

      {menunggu.length > 0 && (
        <h2 className="mb-2 mt-1 text-sm font-bold uppercase tracking-wide text-coffee-400">
          Menunggu pembayaran ({menunggu.length})
        </h2>
      )}

      <div className="space-y-3">
        {[...menunggu, ...selesai].map((p, idx) => (
          <div key={p.id}>
            {idx === menunggu.length && selesai.length > 0 && (
              <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-coffee-400">
                Selesai hari ini ({selesai.length})
              </h2>
            )}
            <article
              className={`card p-4 ${
                p.status === "PAID"
                  ? "border-l-4 border-green-500"
                  : p.status === "CANCELLED"
                    ? "opacity-60"
                    : ""
              }`}
            >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-coffee-800">
                  {p.tableNumber ? `Meja ${p.tableNumber}` : "Tanpa meja"} ·{" "}
                  {p.customerName}
                </p>
                <p className="text-xs text-coffee-400">
                  {p.orderNumber} · {jam(p.createdAt)}
                </p>
                <p className="mt-0.5 text-xs text-coffee-400">
                  {p.customerPhone} · {p.customerEmail}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    p.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : p.status === "CANCELLED"
                        ? "bg-coffee-100 text-coffee-500"
                        : p.paymentMethod === "QRIS"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {p.status === "PAID"
                    ? p.paymentMethod === "QRIS"
                      ? "✅ QRIS — pembayaran berhasil"
                      : "✅ Lunas di kasir"
                    : p.status === "CANCELLED"
                      ? "Dibatalkan"
                      : p.paymentMethod === "QRIS"
                        ? "QRIS — menunggu pembayaran"
                        : "Bayar di kasir"}
                </span>
                {p.status === "PENDING" && p.claimedPaidAt && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    🔔 pelanggan sudah bayar — periksa saldo
                  </span>
                )}
                {p.status === "PENDING" && menitMenunggu(p.createdAt) >= 15 && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                    menunggu {menitMenunggu(p.createdAt)} menit
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 divide-y divide-coffee-50 rounded-xl bg-coffee-50/50 p-2">
              {p.items.map((i) => (
                <div key={i.id} className="flex justify-between py-1.5 text-sm">
                  <span className="text-coffee-600">
                    {i.name} <span className="text-coffee-400">×{i.quantity}</span>
                  </span>
                  <span className="font-semibold text-coffee-700">{rupiah(i.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-lg font-extrabold text-coffee-800">
                {rupiah(p.total)}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {/* Pesanan selesai tidak punya aksi — statusnya sudah final. */}
                {p.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => batalkan(p)}
                      disabled={proses === p.id}
                      className="btn bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50"
                    >
                      Batalkan
                    </button>
                    {/* Konfirmasi manual untuk pembayaran tunai di konter dan
                        QRIS merchant toko — keduanya tidak melapor otomatis.
                        Hanya QRIS lewat payment gateway (punya paymentRef) yang
                        statusnya datang sendiri. */}
                    {!(p.paymentMethod === "QRIS" && p.paymentRef) && (
                      <button
                        onClick={() => tandaiLunas(p)}
                        disabled={proses === p.id}
                        className="btn btn-primary"
                      >
                        <Icon name="check" className="h-5 w-5" strokeWidth={2.5} />
                        {proses === p.id ? "Memproses…" : "Tandai Lunas"}
                      </button>
                    )}
                  </>
                )}
                {p.status === "PENDING" && p.paymentMethod === "QRIS" && p.paymentRef && (
                  <span className="text-xs text-coffee-400">
                    Status diperbarui otomatis
                  </span>
                )}
              </div>
            </div>
            </article>
          </div>
        ))}
      </div>
    </main>
  );
}
