/**
 * QRIS helper — mengubah QRIS STATIS menjadi QRIS DINAMIS.
 *
 * QRIS mengikuti standar EMVCo (kumpulan TLV: Tag-Length-Value).
 * Untuk membuat QR yang bisa dibayar dengan nominal tertentu, kita:
 *   1. Ubah tag 01 (Point of Initiation) dari "11" (statis) -> "12" (dinamis).
 *   2. Sisipkan tag 54 (Transaction Amount) berisi nominal, tepat sebelum
 *      tag 58 (Country Code "ID").
 *   3. Hitung ulang CRC16-CCITT (tag 63) di akhir string.
 *
 * Hasilnya adalah string QRIS valid yang bila di-render menjadi QR bisa
 * di-scan & dibayar lewat aplikasi bank / e-wallet apa pun ke rekening merchant.
 */

/** CRC16-CCITT (False), init 0xFFFF, poly 0x1021 — sesuai spesifikasi QRIS. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Bangun QRIS dinamis dari QRIS statis + nominal (Rupiah, integer).
 * @throws Error jika string QRIS tidak valid.
 */
export function buildDynamicQris(staticQris: string, amount: number): string {
  // Bersihkan hanya line-break/tab & spasi tepi (spasi internal — mis. nama kota
  // "Jakarta Pusat" pada tag 60 — HARUS dipertahankan agar panjang TLV tetap valid).
  const qris = staticQris.replace(/[\r\n\t]/g, "").trim();
  if (qris.length < 20) throw new Error("String QRIS merchant tidak valid / kosong.");
  if (!qris.includes("5802ID")) throw new Error("String QRIS tidak mengandung Country Code (5802ID).");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nominal tidak valid.");

  // 1. Hapus CRC lama (8 karakter terakhir: "6304" + 4 hex).
  let base = qris.slice(0, -8);

  // 2. Statis -> dinamis.
  base = base.replace("010211", "010212");

  // 3. Susun tag 54 (nominal, tanpa desimal).
  const amountStr = String(Math.round(amount));
  const amountTag = "54" + pad2(amountStr.length) + amountStr;

  // 4. Sisipkan tepat sebelum "5802ID".
  const idx = base.indexOf("5802ID");
  const withAmount = base.slice(0, idx) + amountTag + base.slice(idx);

  // 5. Hitung ulang CRC atas seluruh string + "6304".
  const toCrc = withAmount + "6304";
  return toCrc + crc16(toCrc);
}

/**
 * Contoh QRIS statis (format valid, HANYA untuk demo tampilan).
 * GANTI dengan QRIS merchant asli Anda di halaman Pengaturan / env QRIS_MERCHANT_STRING.
 */
export const DEMO_QRIS =
  "00020101021126610014COM.GO-JEK.WWW01189360091432194657280210G4194657280303UMI51440014ID.CO.QRIS.WWW0215ID20232679489100303UMI5204581253033605802ID5910KasirKopi6013Jakarta Pusat61051012062070703A0163046A2C";
