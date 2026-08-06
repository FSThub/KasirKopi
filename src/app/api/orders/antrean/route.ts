import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTransactionStatus, isMidtransConfigured } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

/** Pesanan QRIS yang menggantung lebih lama dari ini dianggap kedaluwarsa. */
const BATAS_MENIT = 60;
/** Pesanan yang sudah selesai tetap ditampilkan selama ini agar kasir melihat hasilnya. */
const TAMPIL_SELESAI_JAM = 12;
/** Jeda minimum antar penanyaan status ke Midtrans untuk satu pesanan. */
const JEDA_SINKRON_MS = 8000;

const terakhirSinkron = new Map<string, number>();

/**
 * GET /api/orders/antrean — papan pesanan dari QR meja.
 *
 * Mengembalikan pesanan yang masih menunggu DAN yang baru saja selesai, supaya
 * kasir melihat perubahannya — bukan pesanan yang tiba-tiba hilang begitu lunas.
 *
 * Status pesanan QRIS disinkronkan ke Midtrans sebelum daftar dikirim, sehingga
 * pembayaran pelanggan tampil "berhasil" dengan sendirinya tanpa kasir menekan
 * tombol apa pun. Ini juga menutup kasus webhook tidak sampai — misalnya saat
 * aplikasi berjalan di localhost yang tak terjangkau server Midtrans.
 */
export async function GET() {
  try {
    const menunggu = await prisma.order.findMany({
      where: { orderType: "QR_TABLE", status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { items: true },
    });

    if (isMidtransConfigured()) await sinkronkan(menunggu);

    const sejak = new Date(Date.now() - TAMPIL_SELESAI_JAM * 3600_000);
    const orders = await prisma.order.findMany({
      where: {
        orderType: "QR_TABLE",
        OR: [{ status: "PENDING" }, { status: { in: ["PAID", "CANCELLED"] }, createdAt: { gte: sejak } }],
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return NextResponse.json(orders);
  } catch (e) {
    console.warn(
      "[/api/orders/antrean] DB tidak tersedia:",
      e instanceof Error ? e.message : e
    );
    return NextResponse.json([]);
  }
}

type Antre = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentRef: string | null;
  createdAt: Date;
};

async function sinkronkan(orders: Antre[]) {
  const batas = Date.now() - BATAS_MENIT * 60_000;
  // Hanya pesanan yang benar-benar punya transaksi Midtrans (ditandai
  // paymentRef) yang bisa ditanyakan statusnya. Pesanan QRIS dari string
  // merchant toko tidak punya padanan di Midtrans dan dikonfirmasi kasir.
  const perlu = orders.filter(
    (o) =>
      o.paymentMethod === "QRIS" &&
      !!o.paymentRef &&
      Date.now() - (terakhirSinkron.get(o.id) ?? 0) > JEDA_SINKRON_MS
  );

  await Promise.allSettled(
    perlu.map(async (o) => {
      terakhirSinkron.set(o.id, Date.now());
      try {
        const cek = await getTransactionStatus(o.orderNumber);
        if (cek.status !== "PENDING") {
          await prisma.order.update({
            where: { id: o.id },
            data: { status: cek.status, paymentRef: cek.transactionId ?? undefined },
          });
          terakhirSinkron.delete(o.id);
          return;
        }
        // Masih PENDING di Midtrans, tetapi kode QR-nya sudah kedaluwarsa.
        if (o.createdAt.getTime() < batas) {
          await prisma.order.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
          terakhirSinkron.delete(o.id);
        }
      } catch {
        /* jaringan/Midtrans bermasalah — biarkan status apa adanya */
      }
    })
  );
}
