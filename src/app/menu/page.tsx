"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import { Icon } from "@/components/Icon";
import { rupiah } from "@/lib/format";
import { optionsSummary, isFoodItem } from "@/lib/options";
import { useGuestCart } from "@/lib/guestStore";
import type { Category, Product } from "@/lib/types";

type BestSeller = Record<string, { poin: number; label: string }>;
type Menu = {
  storeName: string;
  taxPercent: number;
  categories: Category[];
  products: Product[];
  bestSeller: BestSeller;
};
type Langkah = "identitas" | "menu" | "bayar" | "status";

/* Aturan validasi identitas — dipakai bersama oleh formulir, perpindahan
 * langkah otomatis, dan (dalam bentuk sama) oleh server. Semua dicek pada
 * nilai yang sudah di-trim supaya spasi tak sengaja tidak menggagalkan. */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_HP = /^[0-9+\-\s()]{8,20}$/;

type Tamu = { nama: string; hp: string; email: string; meja: string };

function galatIdentitas(t: Tamu): string | null {
  if (t.nama.trim().length < 2) return "Nama minimal 2 huruf.";
  if (!RE_HP.test(t.hp.trim())) return "Nomor HP tidak valid (8–20 digit).";
  if (!RE_EMAIL.test(t.email.trim()))
    return "Email tidak valid. Contoh: nama@email.com";
  return null;
}

const identitasValid = (t: Tamu) => galatIdentitas(t) === null;

export default function HalamanMenu() {
  return (
    <Suspense fallback={<Memuat />}>
      <IsiMenu />
    </Suspense>
  );
}

function Memuat() {
  return <p className="p-10 text-center text-coffee-400">Memuat menu…</p>;
}

function IsiMenu() {
  const params = useSearchParams();
  const mejaDariQr = params.get("meja") ?? "";

  const [menu, setMenu] = useState<Menu | null>(null);
  const [langkah, setLangkah] = useState<Langkah>("identitas");
  const [kategori, setKategori] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [siap, setSiap] = useState(false);

  const items = useGuestCart((s) => s.items);
  const tamu = useGuestCart((s) => s.tamu);
  const setTamu = useGuestCart((s) => s.setTamu);
  const add = useGuestCart((s) => s.add);
  const inc = useGuestCart((s) => s.inc);
  const dec = useGuestCart((s) => s.dec);
  const hapus = useGuestCart((s) => s.remove);
  const orderId = useGuestCart((s) => s.orderId);

  // Hidrasi manual (store memakai skipHydration) supaya tidak bentrok SSR.
  useEffect(() => {
    useGuestCart.persist.rehydrate();
    setSiap(true);
  }, []);

  useEffect(() => {
    fetch("/api/public/menu")
      .then((r) => r.json())
      .then(setMenu)
      .catch(() => setMenu(null));
  }, []);

  useEffect(() => {
    if (mejaDariQr && !tamu.meja) setTamu({ meja: mejaDariQr });
  }, [mejaDariQr, tamu.meja, setTamu]);

  // Pengarahan awal setelah data tersimpan dibaca: pelanggan lama yang
  // identitasnya masih valid langsung masuk katalog. Hanya sekali — kalau
  // dijalankan terus, pelanggan yang menekan "Ubah data diri" akan tertarik
  // kembali ke katalog begitu isian sempat valid saat sedang diketik.
  const sudahDiarahkan = useRef(false);
  useEffect(() => {
    if (!siap || sudahDiarahkan.current) return;
    sudahDiarahkan.current = true;
    if (orderId) setLangkah("status");
    else if (identitasValid(tamu)) setLangkah("menu");
  }, [siap, orderId, tamu]);

  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const pajak = Math.round((subtotal * (menu?.taxPercent ?? 0)) / 100);
  const total = subtotal + pajak;
  const jumlah = items.reduce((a, i) => a + i.quantity, 0);

  const tersaring = useMemo(() => {
    if (!menu) return [];
    const q = cari.trim().toLowerCase();
    return menu.products.filter((p) => {
      if (kategori !== "semua" && p.categoryId !== kategori) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menu, kategori, cari]);

  if (!siap || !menu) return <Memuat />;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-40 pt-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-coffee-800">{menu.storeName}</h1>
          <p className="text-xs text-coffee-400">
            Pesan mandiri dari meja{tamu.meja ? ` nomor ${tamu.meja}` : ""}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coffee-700 text-lg text-white">
          ☕
        </span>
      </header>

      {langkah === "identitas" && (
        <FormIdentitas
          tamu={tamu}
          setTamu={setTamu}
          mejaTerkunci={!!mejaDariQr}
          onLanjut={() => setLangkah("menu")}
        />
      )}

      {langkah === "menu" && (
        <>
          <input
            className="input mb-3"
            placeholder="Cari menu…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <Kategori aktif={kategori === "semua"} onClick={() => setKategori("semua")}>
              Semua
            </Kategori>
            {menu.categories.map((c) => (
              <Kategori
                key={c.id}
                aktif={kategori === c.id}
                onClick={() => setKategori(c.id)}
              >
                {c.name}
              </Kategori>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {tersaring.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={(prod, opts) => add(prod, opts)}
                disabled={!p.isAvailable}
                bestSeller={menu.bestSeller[p.id] ?? null}
              />
            ))}
          </div>
          {tersaring.length === 0 && (
            <p className="py-10 text-center text-coffee-400">Menu tidak ditemukan.</p>
          )}
        </>
      )}

      {langkah === "bayar" && (
        <Keranjang
          items={items}
          subtotal={subtotal}
          pajak={pajak}
          total={total}
          taxPercent={menu.taxPercent}
          inc={inc}
          dec={dec}
          hapus={hapus}
          onKembali={() => setLangkah("menu")}
          onUbahData={() => setLangkah("identitas")}
          onSelesai={() => setLangkah("status")}
        />
      )}

      {langkah === "status" && <StatusPesanan onPesanLagi={() => setLangkah("menu")} />}

      {langkah === "menu" && jumlah > 0 && (
        <button
          onClick={() => setLangkah("bayar")}
          className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 bg-coffee-700 px-5 py-4 text-white shadow-[0_-6px_20px_rgba(0,0,0,.15)] sm:bottom-4 sm:rounded-2xl"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="receipt" className="h-5 w-5" /> Keranjang ({jumlah})
          </span>
          <span className="font-extrabold">{rupiah(total)}</span>
        </button>
      )}
    </main>
  );
}

function Kategori({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        aktif
          ? "bg-coffee-700 text-white"
          : "bg-white text-coffee-500 ring-1 ring-coffee-100"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------- Langkah 1: identitas ------------------------- */

function FormIdentitas({
  tamu,
  setTamu,
  mejaTerkunci,
  onLanjut,
}: {
  tamu: Tamu;
  setTamu: (t: Partial<Tamu>) => void;
  mejaTerkunci: boolean;
  onLanjut: () => void;
}) {
  const [galat, setGalat] = useState("");

  const lanjut = () => {
    const pesan = galatIdentitas(tamu);
    setGalat(pesan ?? "");
    if (!pesan) onLanjut();
  };

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-lg font-bold text-coffee-800">Selamat datang 👋</h2>
      <p className="mb-4 text-sm text-coffee-400">
        Isi data singkat berikut untuk mulai memesan dari meja Anda.
      </p>
      <div className="space-y-3">
        <Kolom label="Nama">
          <input
            className="input"
            value={tamu.nama}
            onChange={(e) => setTamu({ nama: e.target.value })}
            placeholder="Nama Anda"
          />
        </Kolom>
        <Kolom label="Nomor HP">
          <input
            className="input"
            inputMode="tel"
            value={tamu.hp}
            onChange={(e) => setTamu({ hp: e.target.value })}
            placeholder="08xxxxxxxxxx"
          />
        </Kolom>
        <Kolom label="Email">
          <input
            className="input"
            inputMode="email"
            value={tamu.email}
            onChange={(e) => setTamu({ email: e.target.value })}
            placeholder="nama@email.com"
          />
        </Kolom>
        <Kolom label="Nomor meja">
          <input
            className="input"
            value={tamu.meja}
            onChange={(e) => setTamu({ meja: e.target.value })}
            placeholder="mis. 5"
            disabled={mejaTerkunci}
          />
          {mejaTerkunci && (
            <p className="mt-1 text-xs text-coffee-400">Terisi otomatis dari QR meja.</p>
          )}
        </Kolom>
      </div>
      {galat && <p className="mt-3 text-sm font-semibold text-red-600">{galat}</p>}
      <button onClick={lanjut} className="btn btn-primary mt-5 w-full">
        Lihat Menu <Icon name="arrow-right" className="h-5 w-5" />
      </button>
    </div>
  );
}

function Kolom({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-coffee-500">{label}</span>
      {children}
    </label>
  );
}

/* ------------------------- Langkah 2: keranjang ------------------------- */

function Keranjang({
  items,
  subtotal,
  pajak,
  total,
  taxPercent,
  inc,
  dec,
  hapus,
  onKembali,
  onUbahData,
  onSelesai,
}: {
  items: ReturnType<typeof useGuestCart.getState>["items"];
  subtotal: number;
  pajak: number;
  total: number;
  taxPercent: number;
  inc: (id: string) => void;
  dec: (id: string) => void;
  hapus: (id: string) => void;
  onKembali: () => void;
  onUbahData: () => void;
  onSelesai: () => void;
}) {
  const tamu = useGuestCart((s) => s.tamu);
  const setOrderId = useGuestCart((s) => s.setOrderId);
  const clearCart = useGuestCart((s) => s.clearCart);
  const [proses, setProses] = useState<"QRIS" | "CASHIER" | null>(null);
  const [galat, setGalat] = useState("");

  const kirim = async (method: "QRIS" | "CASHIER") => {
    setProses(method);
    setGalat("");
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: tamu.nama.trim(),
          customerPhone: tamu.hp.trim(),
          customerEmail: tamu.email.trim(),
          tableNumber: tamu.meja.trim(),
          method,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            options: i.options,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pesanan");
      // Gambar QR hanya dikirim sekali; simpan agar tetap ada saat halaman di-refresh.
      if (data.image) sessionStorage.setItem("kk-qr", data.image);
      else sessionStorage.removeItem("kk-qr");
      setOrderId(data.orderId);
      clearCart();
      onSelesai();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal membuat pesanan");
    } finally {
      setProses(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-coffee-400">Keranjang masih kosong.</p>
        <button onClick={onKembali} className="btn btn-primary mt-4">
          Pilih Menu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onKembali} className="text-sm font-semibold text-coffee-500">
          ← Tambah menu lain
        </button>
        <button onClick={onUbahData} className="text-sm font-semibold text-coffee-500 underline">
          Ubah data diri
        </button>
      </div>
      <p className="text-xs text-coffee-400">
        Atas nama <b className="text-coffee-600">{tamu.nama || "—"}</b>
        {tamu.meja ? ` · Meja ${tamu.meja}` : ""} · {tamu.email || "email belum diisi"}
      </p>

      <div className="card divide-y divide-coffee-50 p-1">
        {items.map((i) => (
          <div key={i.lineId} className="flex items-center gap-3 p-3">
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-coffee-50">
              <ProductImage name={i.name} src={i.image} className="h-12 w-12" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-coffee-800">{i.name}</p>
              <p className="text-[11px] text-coffee-400">
                {optionsSummary(i.options, isFoodItem(i.name))}
              </p>
              <p className="text-sm font-bold text-coffee-700">{rupiah(i.price)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => dec(i.lineId)}
                className="h-8 w-8 rounded-full bg-coffee-50 font-bold text-coffee-600"
                aria-label="Kurangi"
              >
                −
              </button>
              <span className="w-6 text-center font-bold">{i.quantity}</span>
              <button
                onClick={() => inc(i.lineId)}
                className="h-8 w-8 rounded-full bg-coffee-700 font-bold text-white"
                aria-label="Tambah"
              >
                +
              </button>
              <button
                onClick={() => hapus(i.lineId)}
                className="ml-1 text-coffee-300"
                aria-label={`Hapus ${i.name}`}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card space-y-1 p-4 text-sm">
        <Baris label="Subtotal" nilai={rupiah(subtotal)} />
        {taxPercent > 0 && <Baris label={`Pajak (${taxPercent}%)`} nilai={rupiah(pajak)} />}
        <div className="flex justify-between border-t border-coffee-50 pt-2 text-base font-extrabold text-coffee-800">
          <span>Total</span>
          <span>{rupiah(total)}</span>
        </div>
      </div>

      {galat && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{galat}</p>
      )}

      <button
        onClick={() => kirim("QRIS")}
        disabled={proses !== null}
        className="btn btn-primary w-full py-4"
      >
        <Icon name="qr" className="h-5 w-5" />
        {proses === "QRIS" ? "Menyiapkan QRIS…" : "Bayar Sekarang (QRIS)"}
      </button>
      <button
        onClick={() => kirim("CASHIER")}
        disabled={proses !== null}
        className="btn w-full bg-coffee-50 py-4 text-coffee-700 ring-1 ring-coffee-100"
      >
        <Icon name="wallet" className="h-5 w-5" />
        {proses === "CASHIER" ? "Mengirim…" : "Bayar di Kasir"}
      </button>
      <p className="pb-4 text-center text-xs text-coffee-400">
        Memilih “Bayar di Kasir” akan mengirim pesanan Anda ke kasir. Silakan menuju konter
        untuk menyelesaikan pembayaran.
      </p>
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex justify-between text-coffee-500">
      <span>{label}</span>
      <span className="font-semibold text-coffee-700">{nilai}</span>
    </div>
  );
}

/* -------------------------- Langkah 3: status -------------------------- */

type StatusData = {
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
  tableNumber: string | null;
  claimedPaidAt: string | null;
  items: { name: string; quantity: number; subtotal: number }[];
};

function StatusPesanan({ onPesanLagi }: { onPesanLagi: () => void }) {
  const orderId = useGuestCart((s) => s.orderId);
  const setOrderId = useGuestCart((s) => s.setOrderId);
  const [data, setData] = useState<StatusData | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [hilang, setHilang] = useState(false);
  const [mengklaim, setMengklaim] = useState(false);

  /** Beri tahu kasir bahwa pembayaran sudah dilakukan, agar saldo diperiksa. */
  const klaimSudahBayar = async () => {
    if (!orderId) return;
    setMengklaim(true);
    try {
      const r = await fetch(`/api/public/orders/${orderId}/klaim`, { method: "POST" });
      if (r.ok) setData((d) => (d ? { ...d, claimedPaidAt: new Date().toISOString() } : d));
    } catch {
      /* biarkan; pelanggan bisa mencoba lagi */
    } finally {
      setMengklaim(false);
    }
  };

  // Gambar QR dikirim sekali saat pesanan dibuat; simpan di sessionStorage
  // supaya tetap tampil bila halaman ter-refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setQr(sessionStorage.getItem("kk-qr"));
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let batal = false;
    let timer: ReturnType<typeof setInterval>;

    const muat = async () => {
      try {
        const r = await fetch(`/api/public/orders/${orderId}`);
        // Pesanan tidak ada lagi (kedaluwarsa/terhapus). Tanpa penanganan ini
        // halaman akan menunggu selamanya di layar "memuat".
        if (r.status === 404) {
          if (!batal) setHilang(true);
          clearInterval(timer);
          return;
        }
        if (!r.ok) return;
        const d = await r.json();
        if (!batal) {
          setData(d);
          setHilang(false);
        }
        return d.status as string;
      } catch {
        return; // jaringan putus — coba lagi pada siklus berikutnya
      }
    };

    muat();
    timer = setInterval(async () => {
      const s = await muat();
      if (s && s !== "PENDING") clearInterval(timer);
    }, 5000);
    return () => {
      batal = true;
      clearInterval(timer);
    };
  }, [orderId]);

  // Pesanan sudah tidak ditemukan — beri jalan keluar, jangan biarkan tertahan.
  if (hilang) {
    return (
      <div className="card p-8 text-center">
        <p className="text-4xl">🔎</p>
        <h2 className="mt-2 text-lg font-extrabold text-coffee-800">
          Pesanan Tidak Ditemukan
        </h2>
        <p className="mt-1 text-sm text-coffee-500">
          Pesanan ini mungkin sudah kedaluwarsa atau dibatalkan. Silakan pesan kembali,
          atau tanyakan ke kasir bila Anda merasa sudah membayar.
        </p>
        <button
          onClick={() => {
            setOrderId(null);
            sessionStorage.removeItem("kk-qr");
            sessionStorage.removeItem("kk-qr-uji");
            sessionStorage.removeItem("kk-qr-url");
            onPesanLagi();
          }}
          className="btn btn-primary mt-4 w-full"
        >
          Kembali ke Menu
        </button>
      </div>
    );
  }

  if (!orderId || !data) return <Memuat />;

  const lunas = data.status === "PAID";
  const batal = data.status === "CANCELLED";

  return (
    <div className="space-y-3">
      <div
        className={`card p-6 text-center ${
          lunas ? "bg-green-50" : batal ? "bg-red-50" : ""
        }`}
      >
        <p className="text-4xl">{lunas ? "✅" : batal ? "❌" : "⏳"}</p>
        <h2 className="mt-2 text-lg font-extrabold text-coffee-800">
          {lunas
            ? "Pembayaran Berhasil"
            : batal
              ? "Pesanan Dibatalkan"
              : data.paymentMethod === "CASH"
                ? "Menunggu Pembayaran di Kasir"
                : "Menunggu Pembayaran"}
        </h2>
        <p className="mt-1 text-sm text-coffee-500">
          No. {data.orderNumber}
          {data.tableNumber ? ` · Meja ${data.tableNumber}` : ""}
        </p>
        <p className="mt-3 text-2xl font-extrabold text-coffee-800">{rupiah(data.total)}</p>

        {!lunas && !batal && data.paymentMethod === "CASH" && (
          <p className="mt-3 rounded-xl bg-white p-3 text-sm text-coffee-500">
            Tunjukkan nomor pesanan ini ke kasir untuk membayar.
          </p>
        )}
        {!lunas && !batal && data.paymentMethod === "QRIS" && qr && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Kode QRIS pembayaran" className="mx-auto h-56 w-56" />
            <p className="mt-2 text-xs text-coffee-400">
              Pindai dengan aplikasi bank / e-wallet Anda.
            </p>
            {data.claimedPaidAt ? (
              <p className="mx-auto mt-3 max-w-xs rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">
                Terima kasih — kasir sedang memeriksa pembayaran Anda.
              </p>
            ) : (
              <button
                onClick={klaimSudahBayar}
                disabled={mengklaim}
                className="btn btn-primary mt-3 w-full"
              >
                {mengklaim ? "Mengirim…" : "Saya Sudah Bayar"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-coffee-400">Rincian</p>
        {data.items.map((i, n) => (
          <div key={n} className="flex justify-between py-1 text-sm">
            <span className="text-coffee-600">
              {i.name} <span className="text-coffee-400">×{i.quantity}</span>
            </span>
            <span className="font-semibold text-coffee-700">{rupiah(i.subtotal)}</span>
          </div>
        ))}
      </div>

      {(lunas || batal) && (
        <button
          onClick={() => {
            setOrderId(null);
            sessionStorage.removeItem("kk-qr");
            onPesanLagi();
          }}
          className="btn btn-primary w-full"
        >
          Pesan Lagi
        </button>
      )}
    </div>
  );
}
