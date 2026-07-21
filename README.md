# ☕ KasirKopi (KK)

Aplikasi **kasir kopi** berbasis web yang cepat, sederhana, dan **mobile friendly**. Mendukung pembayaran **Tunai** dan **QRIS** (QRIS dinamis yang bisa di-scan aplikasi bank / e-wallet apa pun).

## ✨ Fitur

- 🛒 **Kasir (POS)** — katalog menu, kategori, pencarian, keranjang, hitung total & kembalian
- 📱 **Pembayaran QRIS** — otomatis membuat QRIS **dinamis** dari QRIS statis merchant (nominal = total belanja)
- 💵 **Pembayaran Tunai** — tombol nominal cepat & perhitungan kembalian
- 🧾 **Struk** — bisa dicetak (print)
- 📋 **Riwayat transaksi**
- ☕ **Kelola menu** — tambah/edit/hapus produk, tandai habis
- 📊 **Laporan** — pendapatan harian, grafik 7 hari, menu terlaris, rincian metode bayar
- ⚙️ **Pengaturan** — nama toko, pajak, string QRIS merchant

## 🧱 Tech Stack

| Layer      | Teknologi                          |
| ---------- | ---------------------------------- |
| Frontend   | Next.js 14 (App Router) + Tailwind |
| Backend    | Node.js (Next.js Route Handlers)   |
| Database   | PostgreSQL + Prisma ORM            |
| Deployment | Vercel                             |

## 🚀 Menjalankan secara lokal

```bash
# 1. Install dependency
npm install

# 2. Siapkan environment
cp .env.example .env
#    lalu isi DATABASE_URL (PostgreSQL) di file .env

# 3. Buat tabel & isi data contoh
npm run db:push
npm run db:seed

# 4. Jalankan
npm run dev
```

Buka http://localhost:3000

> Butuh PostgreSQL. Rekomendasi: **Supabase** (gratis). Isi `DATABASE_URL` (Connection Pooler,
> port 6543, `?pgbouncer=true`) dan `DIRECT_URL` (Direct, port 5432) di `.env`.
> Lihat [DEPLOY.md](DEPLOY.md) untuk langkah lengkapnya.

## 📱 Mengatur Pembayaran QRIS

Ada dua mode; aplikasi memilih otomatis:

### Mode A — Midtrans (direkomendasikan, otomatis) ✅
Status pembayaran ter-update otomatis via webhook — kasir tak perlu konfirmasi manual.

1. Daftar di [midtrans.com](https://midtrans.com) (sandbox gratis untuk uji coba).
2. Dashboard → **Settings → Access Keys** → salin **Server Key**.
3. Set environment variable:
   - `MIDTRANS_SERVER_KEY` = server key Anda
   - `MIDTRANS_IS_PRODUCTION` = `false` (sandbox) atau `true` (produksi)
4. Dashboard Midtrans → **Settings → Configuration → Payment Notification URL** →
   isi `https://<domain-anda>/api/midtrans/notification`
5. Selesai. Pilih QRIS saat bayar → QR muncul → customer scan & bayar → struk muncul otomatis.

### Mode B — QRIS statis (fallback, konfirmasi manual)
Dipakai bila `MIDTRANS_SERVER_KEY` kosong.

1. Dapatkan **QRIS statis** dari penyedia (GoPay Merchant, QRIS bank, dll).
2. Decode QR statis menjadi teks (diawali `00020101...`).
3. Menu **⚙️ Atur** → tempel di kolom **QRIS Merchant** → Simpan (atau env `QRIS_MERCHANT_STRING`).
4. Aplikasi mengubahnya jadi QRIS **dinamis** (nominal = total belanja). Kasir menekan
   "Konfirmasi Sudah Dibayar" setelah customer membayar.

> Untuk menguji webhook Midtrans di lokal, gunakan tunneling seperti `ngrok` lalu daftarkan
> URL publiknya di dashboard Midtrans.

## ☁️ Deploy ke Vercel

1. Push project ke GitHub.
2. Import repo di [vercel.com](https://vercel.com).
3. Tambahkan Environment Variables di Vercel:
   - `DATABASE_URL` — connection string PostgreSQL (mis. Vercel Postgres / Neon)
   - `QRIS_MERCHANT_STRING` — (opsional) string QRIS merchant
4. Deploy. Setelah itu jalankan sekali `prisma db push` & seed (mis. via `vercel` CLI atau koneksi langsung) untuk menyiapkan tabel.

Build command sudah otomatis menjalankan `prisma generate` (lihat `package.json`).

## 🗂️ Struktur singkat

```
src/
├─ app/
│  ├─ page.tsx            # Kasir (POS)
│  ├─ riwayat/            # Riwayat transaksi
│  ├─ dashboard/          # Laporan
│  ├─ produk/             # Kelola menu
│  ├─ pengaturan/         # Pengaturan + QRIS
│  └─ api/                # Backend (products, orders, qris, stats, settings)
├─ components/            # BottomNav, CheckoutSheet, ReceiptModal
└─ lib/                   # prisma, store (cart), qris, format, types
prisma/
├─ schema.prisma
└─ seed.ts
```
