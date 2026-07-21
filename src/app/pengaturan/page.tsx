"use client";

import { useEffect, useState } from "react";

export default function PengaturanPage() {
  const [storeName, setStoreName] = useState("");
  const [tax, setTax] = useState("0");
  const [qris, setQris] = useState("");
  const [configured, setConfigured] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setStoreName(d.store_name || "");
        setTax(d.tax_percent || "0");
        setQris(d.qris_merchant_string || "");
        setConfigured(!!d.qris_configured);
      })
      .catch(() => {
        /* biarkan default; jangan crash halaman */
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setNote("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          tax_percent: tax,
          qris_merchant_string: qris,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.demo) {
        setNote("Database belum terhubung — pengaturan tidak tersimpan permanen (mode demo).");
      } else {
        setSaved(true);
        setConfigured(qris.trim().length >= 20);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setNote("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 lg:pt-8">
      <h1 className="mb-4 text-xl font-extrabold text-coffee-800">Pengaturan</h1>

      <div className="space-y-4">
        <div className="card p-4">
          <label className="mb-1 block text-sm font-medium text-coffee-600">Nama Toko</label>
          <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          <p className="mt-1 text-xs text-coffee-400">Tampil di struk.</p>
        </div>

        <div className="card p-4">
          <label className="mb-1 block text-sm font-medium text-coffee-600">Pajak / PB1 (%)</label>
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
          <p className="mt-1 text-xs text-coffee-400">Isi 0 jika tidak memungut pajak.</p>
        </div>

        <div className="card border-l-4 border-blue-400 p-4">
          <p className="text-sm font-semibold text-coffee-700">📱 Pembayaran QRIS</p>
          <p className="mt-1 text-xs text-coffee-500">
            <b>Direkomendasikan:</b> pakai <b>Midtrans</b> agar status pembayaran update
            otomatis (tanpa konfirmasi manual). Isi <code>MIDTRANS_SERVER_KEY</code> di environment
            variable, lalu set Payment Notification URL di dashboard Midtrans ke{" "}
            <code>/api/midtrans/notification</code>.
          </p>
          <p className="mt-2 text-xs text-coffee-500">
            Jika Midtrans belum diisi, aplikasi memakai <b>QRIS statis</b> di bawah (dikonfirmasi
            manual oleh kasir).
          </p>
        </div>

        <div className="card p-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-coffee-600">QRIS Merchant (statis)</label>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                configured ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              {configured ? "✓ Terpasang" : "Belum diatur (mode demo)"}
            </span>
          </div>
          <textarea
            className="input min-h-[120px] font-mono text-xs"
            value={qris}
            onChange={(e) => setQris(e.target.value)}
            placeholder="00020101021126..."
          />
          <div className="mt-2 space-y-1 text-xs text-coffee-500">
            <p className="font-semibold text-coffee-600">Cara mendapatkan string QRIS:</p>
            <p>
              1. Ambil QRIS <b>statis</b> dari penyedia Anda (GoPay Merchant, QRIS bank, dll).
            </p>
            <p>
              2. Scan/decode QR tersebut menjadi teks (mis. dengan aplikasi QR scanner yang
              menampilkan raw text), lalu tempel di sini.
            </p>
            <p>
              3. Aplikasi otomatis mengubahnya jadi QRIS <b>dinamis</b> (nominal mengikuti total
              belanja) yang bisa dibayar via aplikasi bank / e-wallet apa pun.
            </p>
          </div>
        </div>

        {note && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">{note}</p>
        )}

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? "Menyimpan…" : saved ? "✓ Tersimpan" : "Simpan Pengaturan"}
        </button>
      </div>
    </div>
  );
}
