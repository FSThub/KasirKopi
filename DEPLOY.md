# 🚀 Panduan Deploy KasirKopi ke Vercel

Total ~15 menit. Semua tool di bawah punya paket **gratis**.

---

## Langkah 1 — Siapkan Database PostgreSQL (Neon)

1. Buka [neon.tech](https://neon.tech) → daftar (bisa pakai akun GitHub).
2. **Create Project** → beri nama `kasirkopi` → pilih region terdekat (mis. Singapore).
3. Setelah jadi, salin **Connection string** (format `postgresql://...`).
   > Pilih yang **Pooled connection** untuk dipakai aplikasi (lebih cocok untuk serverless Vercel).

Simpan connection string ini — akan dipakai di Langkah 3 & 4.

---

## Langkah 2 — Push kode ke GitHub

Repo git sudah diinisialisasi. Tinggal buat repo kosong di GitHub lalu:

```bash
git remote add origin https://github.com/<username>/kasirkopi.git
git branch -M main
git push -u origin main
```

---

## Langkah 3 — Siapkan tabel database (sekali saja)

Dari komputer Anda, arahkan ke database Neon lalu buat tabel + data awal:

```bash
# Ganti dengan connection string Neon Anda
export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/kasirkopi?sslmode=require"

npx prisma db push     # buat semua tabel
npm run db:seed        # isi 5 kategori + 19 menu contoh (opsional)
```

> Windows PowerShell: `$env:DATABASE_URL="..."` lalu jalankan perintahnya.

---

## Langkah 4 — Deploy di Vercel

1. Buka [vercel.com](https://vercel.com) → login dengan GitHub.
2. **Add New → Project** → pilih repo `kasirkopi` → **Import**.
3. Framework otomatis terdeteksi **Next.js**. Jangan ubah build settings.
4. Buka **Environment Variables**, tambahkan:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | connection string Neon (Langkah 1) |
   | `MIDTRANS_SERVER_KEY` | *(opsional)* server key Midtrans |
   | `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) atau `true` |
   | `NEXT_PUBLIC_STORE_NAME` | `KasirKopi` (atau nama toko Anda) |

5. Klik **Deploy**. Tunggu ±1–2 menit → dapat URL `https://kasirkopi-xxx.vercel.app`.

---

## Langkah 5 — (Opsional) Aktifkan QRIS otomatis (Midtrans)

Setelah aplikasi online:

1. Dashboard Midtrans → **Settings → Configuration**.
2. Isi **Payment Notification URL**:
   ```
   https://kasirkopi-xxx.vercel.app/api/midtrans/notification
   ```
3. Selesai — pembayaran QRIS akan ter-update otomatis.

---

## ✅ Checklist selesai

- [ ] Database Neon dibuat & connection string disalin
- [ ] `prisma db push` berhasil (tabel terbentuk)
- [ ] Kode ter-push ke GitHub
- [ ] Project di-import & di-deploy di Vercel
- [ ] Environment variables diisi
- [ ] (Opsional) Notification URL Midtrans diisi

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| Build gagal `Can't reach database` | Pastikan `DATABASE_URL` benar & pakai `?sslmode=require`. Build tidak butuh koneksi DB, tapi env harus ada. |
| Menu kosong saat dibuka | Tabel belum di-seed. Jalankan Langkah 3. |
| QRIS "mode demo" | `MIDTRANS_SERVER_KEY` belum diisi **dan** QRIS statis belum diatur. |
| Pembayaran QRIS tidak update otomatis | Cek Payment Notification URL di Midtrans sudah benar & mengarah ke domain produksi. |
