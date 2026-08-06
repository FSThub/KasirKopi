"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "@/components/Icon";

/**
 * Pembuat kode QR untuk ditempel di meja.
 * QR mengarah ke halaman pemesanan pelanggan (<alamat>/menu?meja=N), sehingga
 * nomor meja langsung terisi begitu pelanggan memindai.
 *
 * Alamat dasar wajib bisa dijangkau ponsel pelanggan — "localhost" tidak bisa,
 * karena pada ponsel itu menunjuk ke ponsel itu sendiri.
 */
const KUNCI_SIMPAN = "kasirkopi-qr-base-url";

export default function QrMeja() {
  const [dari, setDari] = useState("1");
  const [sampai, setSampai] = useState("6");
  const [alamat, setAlamat] = useState("");
  const [usulan, setUsulan] = useState<{ url: string; label: string; virtual: boolean }[]>([]);
  const [qr, setQr] = useState<{ meja: string; url: string; gambar: string }[]>([]);
  const [sibuk, setSibuk] = useState(false);

  // Alamat dasar: pilihan tersimpan → URL publik hasil deploy → Wi-Fi/Ethernet.
  useEffect(() => {
    const tersimpan = localStorage.getItem(KUNCI_SIMPAN);
    const asal = window.location.origin;
    type Lan = { url: string; nama: string; virtual: boolean };
    fetch("/api/host-info")
      .then((r) => (r.ok ? r.json() : { publik: null, lan: [] }))
      .then((d: { publik: string | null; lan: Lan[] }) => {
        const pilihan = [
          ...(d.publik ? [{ url: d.publik, label: "Alamat publik (deploy)", virtual: false }] : []),
          ...(d.lan ?? []).map((l) => ({
            url: l.url,
            label: l.virtual ? `${l.nama} — virtual, tidak bisa dipindai` : `${l.nama} (jaringan lokal)`,
            virtual: l.virtual,
          })),
          { url: asal, label: "Komputer ini saja", virtual: true },
        ].filter((v, i, a) => a.findIndex((x) => x.url === v.url) === i);
        setUsulan(pilihan);
        setAlamat(tersimpan || pilihan.find((p) => !p.virtual)?.url || asal);
      })
      .catch(() => {
        setUsulan([{ url: asal, label: "Komputer ini saja", virtual: true }]);
        setAlamat(tersimpan || asal);
      });
  }, []);

  const terpilih = usulan.find((u) => u.url === alamat.trim().replace(/\/+$/, ""));
  const tidakTerjangkau =
    alamat.includes("localhost") || alamat.includes("127.0.0.1") || !!terpilih?.virtual;

  const buat = async () => {
    const a = parseInt(dari, 10);
    const b = parseInt(sampai, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < a || b - a > 49) return;
    setSibuk(true);
    try {
      const dasar = alamat.trim().replace(/\/+$/, "");
      localStorage.setItem(KUNCI_SIMPAN, dasar);
      const hasil = [];
      for (let n = a; n <= b; n++) {
        const url = `${dasar}/menu?meja=${n}`;
        hasil.push({
          meja: String(n),
          url,
          // Margin lebih lebar & kontras penuh supaya terbaca saat dicetak.
          gambar: await QRCode.toDataURL(url, { margin: 2, width: 512 }),
        });
      }
      setQr(hasil);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-coffee-700">🪑 QR Pemesanan di Meja</p>
      <p className="mt-1 text-xs text-coffee-500">
        Cetak dan tempel di tiap meja. Pelanggan memindainya untuk memesan sendiri;
        nomor meja terisi otomatis.
      </p>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-coffee-600">
          Alamat aplikasi (yang dituju QR)
        </span>
        <input
          className="input"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="https://namatoko.vercel.app"
        />
      </label>

      {usulan.length > 0 && (
        <div className="mt-2 space-y-1">
          {usulan.map((u) => (
            <button
              key={u.url}
              type="button"
              onClick={() => setAlamat(u.url)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs ring-1 transition ${
                alamat === u.url
                  ? "bg-coffee-700 text-white ring-coffee-700"
                  : "bg-white text-coffee-600 ring-coffee-100 hover:bg-coffee-50"
              }`}
            >
              <span className="truncate font-semibold">{u.url}</span>
              <span className={alamat === u.url ? "text-white/80" : "text-coffee-400"}>
                {u.virtual ? "⚠ " : "✓ "}
                {u.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {tidakTerjangkau && (
        <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <b>Alamat ini tidak akan terbuka di ponsel pelanggan.</b> Alamat
          localhost dan adapter virtual (VMware/VirtualBox) hanya bisa dihubungi dari
          komputer ini sendiri — ponsel akan memuat terus tanpa hasil. Pilih baris
          bertanda ✓ di atas: alamat Wi-Fi untuk uji coba, atau alamat hasil deploy
          untuk dipasang permanen di meja.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-coffee-600">Meja dari</span>
          <input
            className="input"
            inputMode="numeric"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-coffee-600">sampai</span>
          <input
            className="input"
            inputMode="numeric"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
          />
        </label>
        <button onClick={buat} disabled={sibuk} className="btn btn-primary">
          <Icon name="qr" className="h-5 w-5" />
          {sibuk ? "Membuat…" : "Buat QR"}
        </button>
      </div>

      {qr.length > 0 && (
        <>
          {/* id dipakai oleh aturan @media print di globals.css */}
          <div id="qr-meja-cetak" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {qr.map((q) => (
              <div
                key={q.meja}
                className="qr-kartu rounded-2xl border border-coffee-100 p-3 text-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.gambar} alt={`QR meja ${q.meja}`} className="mx-auto w-full" />
                <p className="mt-1 text-sm font-bold text-coffee-800">Meja {q.meja}</p>
                <p className="qr-nama-toko mt-0.5 hidden text-[10px] text-coffee-500">
                  Pindai untuk memesan
                </p>
              </div>
            ))}
          </div>
          <button onClick={() => window.print()} className="btn btn-ghost mt-3 w-full">
            <Icon name="printer" className="h-5 w-5" /> Cetak
          </button>
          <p className="mt-2 break-all text-[11px] text-coffee-400">
            Contoh tautan: {qr[0].url}
          </p>
        </>
      )}
    </div>
  );
}
