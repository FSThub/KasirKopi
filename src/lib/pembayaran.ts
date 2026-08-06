import { prisma } from "./prisma";
import { periksaKunci } from "./midtrans";

/**
 * Menentukan kanal QRIS mana yang dipakai untuk sebuah transaksi.
 *
 * Hanya kanal yang benar-benar dapat menerima uang yang dipakai:
 *
 *   1. Payment gateway produksi (kunci terbukti diterima endpoint produksi)
 *        → status pembayaran terverifikasi otomatis lewat webhook.
 *   2. String QRIS merchant milik toko
 *        → QR statis diubah menjadi QR dinamis bernominal sesuai standar EMVCo;
 *          uang masuk langsung ke rekening merchant, kasir mengonfirmasi.
 *
 * Bila keduanya belum tersedia, dipakai QR contoh agar alur tetap dapat
 * didemonstrasikan — dan ini ditandai jelas lewat isDemo.
 */
export type KanalQris =
  | { kanal: "midtrans"; uangNyata: true }
  | { kanal: "statis"; merchant: string; isDemo: boolean };

export async function pilihKanalQris(): Promise<KanalQris> {
  const cek = await periksaKunci();
  if (cek.configured && cek.uangNyata) return { kanal: "midtrans", uangNyata: true };

  const merchant = await ambilQrisMerchant();
  if (merchant.length >= 20) return { kanal: "statis", merchant, isDemo: false };

  return { kanal: "statis", merchant: "", isDemo: true };
}

/** String QRIS merchant dari Pengaturan, mundur ke environment variable. */
export async function ambilQrisMerchant(): Promise<string> {
  try {
    const s = await prisma.setting.findUnique({ where: { key: "qris_merchant_string" } });
    return (s?.value || process.env.QRIS_MERCHANT_STRING || "").trim();
  } catch {
    return (process.env.QRIS_MERCHANT_STRING || "").trim();
  }
}
