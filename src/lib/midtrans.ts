import crypto from "crypto";

/**
 * Integrasi Midtrans Core API untuk pembayaran QRIS.
 * Dipanggil langsung via fetch (tanpa SDK) agar ringan & mudah di-deploy.
 * Docs: https://docs.midtrans.com/reference/qris
 */

export function isMidtransConfigured(): boolean {
  return !!process.env.MIDTRANS_SERVER_KEY;
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
