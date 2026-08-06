import crypto from "crypto";

/**
 * Integrasi Midtrans Core API untuk pembayaran QRIS.
 * Dipanggil langsung via fetch (tanpa SDK) agar ringan & mudah di-deploy.
 * Docs: https://docs.midtrans.com/reference/qris
 */

export function isMidtransConfigured(): boolean {
  return !!process.env.MIDTRANS_SERVER_KEY;
}

/**
 * Ringkasan mode pembayaran yang sedang aktif.
 *
 * CATATAN: awalan kunci TIDAK bisa dipakai menyimpulkan lingkungan. Midtrans
 * generasi lama memakai awalan "Mid-server-" untuk kunci sandbox juga, jadi
 * kunci tanpa awalan "SB-" belum tentu kunci produksi. Satu-satunya cara
 * memastikan adalah menanyakannya ke Midtrans — lihat periksaKunci().
 */
export function midtransMode(): {
  configured: boolean;
  production: boolean;
  endpoint: string;
} {
  return {
    configured: isMidtransConfigured(),
    production: process.env.MIDTRANS_IS_PRODUCTION === "true",
    endpoint: baseUrl(),
  };
}

export type HasilPeriksa = {
  configured: boolean;
  production: boolean;
  endpoint: string;
  /** Apakah kunci diterima oleh endpoint yang sedang dipakai. */
  kunciValid: boolean;
  /** Lingkungan tempat kunci benar-benar diterima. */
  lingkunganKunci: "produksi" | "sandbox" | "tidak diketahui";
  uangNyata: boolean;
  pesan: string;
};

let cache: { waktu: number; hasil: HasilPeriksa } | null = null;

/**
 * Tanyakan langsung ke Midtrans apakah server key diterima, di endpoint
 * produksi maupun sandbox. Memakai kueri status transaksi fiktif — hanya
 * membaca, tidak pernah membuat transaksi atau memindahkan uang.
 * Hasil di-cache 5 menit agar tidak membebani halaman Pengaturan.
 */
export async function periksaKunci(paksa = false): Promise<HasilPeriksa> {
  const mode = midtransMode();
  if (!mode.configured) {
    return {
      ...mode,
      kunciValid: false,
      lingkunganKunci: "tidak diketahui",
      uangNyata: false,
      pesan: "Midtrans belum dikonfigurasi. Pembayaran QRIS memakai string QRIS merchant.",
    };
  }
  if (!paksa && cache && Date.now() - cache.waktu < 5 * 60_000) return cache.hasil;

  const dummy = "CEK-KUNCI-" + Date.now();
  const cek = async (base: string) => {
    try {
      const r = await fetch(`${base}/v2/${dummy}/status`, {
        headers: { Accept: "application/json", Authorization: authHeader() },
      });
      // 401 = kunci ditolak. Selain itu (mis. 404 "transaksi tidak ada") = diterima.
      return r.status !== 401;
    } catch {
      return false;
    }
  };

  const [okProd, okSandbox] = await Promise.all([
    cek("https://api.midtrans.com"),
    cek("https://api.sandbox.midtrans.com"),
  ]);

  const lingkunganKunci = okProd ? "produksi" : okSandbox ? "sandbox" : "tidak diketahui";
  const kunciValid = mode.production ? okProd : okSandbox;
  const uangNyata = mode.production && okProd;

  let pesan: string;
  if (!kunciValid && lingkunganKunci !== "tidak diketahui") {
    pesan =
      `Kunci ditolak di endpoint ${mode.production ? "produksi" : "sandbox"}, ` +
      `tetapi diterima di ${lingkunganKunci}. Setel MIDTRANS_IS_PRODUCTION=` +
      `${lingkunganKunci === "produksi"}.`;
  } else if (!kunciValid) {
    pesan = "Kunci Midtrans ditolak di kedua lingkungan. Periksa kembali server key.";
  } else if (!uangNyata) {
    pesan =
      "Kunci ini hanya berlaku di SANDBOX, sehingga QR yang terbit adalah QR uji coba: " +
      "terbaca e-wallet tetapi pembayaran selalu gagal. Untuk menerima uang sungguhan, " +
      "aktifkan akun produksi Midtrans lalu pakai server key produksi — atau gunakan " +
      "string QRIS merchant Anda sendiri di bawah.";
  } else {
    pesan = "Kunci produksi aktif. Pembayaran QRIS masuk ke rekening merchant Anda.";
  }

  const hasil: HasilPeriksa = {
    ...mode,
    kunciValid,
    lingkunganKunci,
    uangNyata,
    pesan,
  };
  cache = { waktu: Date.now(), hasil };
  return hasil;
}

function baseUrl(): string {
  const prod = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return prod ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function authHeader(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  return "Basic " + Buffer.from(serverKey + ":").toString("base64");
}

export type QrisCharge = {
  transactionId: string;
  orderId: string;
  qrString: string | null;
  qrUrl: string | null;
  expiryTime: string | null;
  status: string;
};

/** Buat transaksi QRIS di Midtrans. */
export async function chargeQris(orderId: string, amount: number): Promise<QrisCharge> {
  const cek = await periksaKunci();
  if (!cek.uangNyata) console.warn("[midtrans] " + cek.pesan);

  const res = await fetch(`${baseUrl()}/v2/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: { order_id: orderId, gross_amount: Math.round(amount) },
      qris: { acquirer: "gopay" },
    }),
  });

  const data = await res.json();
  if (!res.ok || Number(data.status_code) >= 400) {
    const msg = data.status_message || data.error_messages?.join(", ") || "Gagal charge Midtrans";
    throw new Error(`Midtrans: ${msg}`);
  }

  const actions: { name: string; url: string }[] = data.actions || [];
  const qrAction = actions.find((a) => a.name === "generate-qr-code");

  return {
    transactionId: data.transaction_id,
    orderId: data.order_id,
    qrString: data.qr_string ?? null,
    qrUrl: qrAction?.url ?? null,
    expiryTime: data.expiry_time ?? null,
    status: data.transaction_status,
  };
}

/**
 * Cek status transaksi LANGSUNG ke Midtrans (GET /v2/{order_id}/status).
 * Berguna untuk testing lokal tanpa webhook publik: aplikasi bisa
 * mem-polling status pembayaran sendiri. order_id = orderNumber.
 */
export async function getTransactionStatus(
  orderId: string
): Promise<{ status: "PAID" | "PENDING" | "CANCELLED"; transactionId: string | null }> {
  const res = await fetch(`${baseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: "application/json", Authorization: authHeader() },
  });
  const data = await res.json().catch(() => ({}));
  // 404 = transaksi belum tercatat/belum dibayar → anggap masih menunggu.
  if (!res.ok) return { status: "PENDING", transactionId: null };
  return {
    status: mapStatus(data.transaction_status, data.fraud_status),
    transactionId: data.transaction_id ?? null,
  };
}

/**
 * Verifikasi signature webhook Midtrans.
 * signature = sha512(order_id + status_code + gross_amount + serverKey)
 */
export function verifySignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const raw = payload.order_id + payload.status_code + payload.gross_amount + serverKey;
  const hash = crypto.createHash("sha512").update(raw).digest("hex");
  return hash === payload.signature_key;
}

/** Petakan status transaksi Midtrans -> status order aplikasi. */
export function mapStatus(transactionStatus: string, fraudStatus?: string): "PAID" | "PENDING" | "CANCELLED" {
  if (transactionStatus === "capture") {
    return fraudStatus === "challenge" ? "PENDING" : "PAID";
  }
  if (transactionStatus === "settlement") return "PAID";
  if (["deny", "cancel", "expire", "failure"].includes(transactionStatus)) return "CANCELLED";
  return "PENDING";
}
