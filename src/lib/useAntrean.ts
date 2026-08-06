"use client";

import { useEffect, useState } from "react";

/**
 * Jumlah pesanan QR meja yang masih menunggu.
 * Dipakai untuk lencana pada navigasi kasir supaya pesanan baru terlihat
 * tanpa perlu membuka halamannya.
 */
export function useAntrean(intervalMs = 15000): number {
  const [jumlah, setJumlah] = useState(0);

  useEffect(() => {
    let batal = false;
    let timer: ReturnType<typeof setInterval>;

    const ambil = async () => {
      try {
        const r = await fetch("/api/orders/antrean");
        // Sesi kasir tidak ada — hentikan polling daripada menabrak 401 terus.
        if (r.status === 401) {
          clearInterval(timer);
          return;
        }
        if (!r.ok) return;
        const d = await r.json();
        if (!batal) setJumlah(Array.isArray(d) ? d.length : 0);
      } catch {
        /* offline — coba lagi pada siklus berikutnya */
      }
    };

    ambil();
    timer = setInterval(ambil, intervalMs);
    return () => {
      batal = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return jumlah;
}
