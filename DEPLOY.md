# 🚀 Panduan Deploy KasirKopi ke Vercel

Total ~15 menit. Semua tool di bawah punya paket **gratis**.

---

## Langkah 1 — Siapkan Database PostgreSQL (Supabase)

1. Buka [supabase.com](https://supabase.com) → **New project** (bisa login pakai GitHub).
2. Isi **Name** = `kasirkopi`, buat **Database Password** yang kuat (SIMPAN — dipakai di URL), pilih region terdekat (mis. **Southeast Asia (Singapore)**).
3. Tunggu project selesai dibuat (~1 menit).
4. Buka **Project Settings → Database → Connection string** dan siapkan **dua** URL:

   | Env | Ambil dari | Ciri |
   |-----|-----------|------|
   | `DATABASE_URL` | Tab **Connection pooling** (Transaction) | port **6543**, host `...pooler.supabase.com`. **Tambahkan** `?pgbouncer=true` di akhir. |
   | `DIRECT_URL` | **Session** / Direct connection | port **5432** |

   Contoh:
   ```
   DATABASE_URL="postgresql://postgres.abcd:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.abcd:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
   ```

   > Ganti `PASSWORD` dengan password DB (Langkah 2) dan `abcd` dengan project ref Anda.
   > Kalau ada karakter spesial di password (mis. `@ # $`), URL-encode dulu.

Simpan kedua URL ini — dipakai di Langkah 3 & 4.

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

Dari komputer Anda, arahkan ke database Supabase lalu buat tabel + data awal.
Isi kedua URL di file `.env` (salin dari `.env.example`), lalu:

```bash
npx prisma db push     # buat semua tabel (pakai DIRECT_URL)
npm run db:seed        # isi 5 kategori + 19 menu contoh (opsional)
```

> `prisma db push` otomatis memakai `DIRECT_URL` (port 5432). Pastikan `DATABASE_URL`
> **dan** `DIRECT_URL` terisi di `.env`.
>
> Windows PowerShell tanpa file `.env`:
> `$env:DATABASE_URL="..."; $env:DIRECT_URL="..."` lalu jalankan perintahnya.

---

## Langkah 4 — Deploy di Vercel

1. Buka [vercel.com](https://vercel.com) → login dengan GitHub.
2. **Add New → Project** → pilih repo `kasirkopi` → **Import**.
3. Framework otomatis terdeteksi **Next.js**. Jangan ubah build settings.
4. Buka **Environment Variables**, tambahkan:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | pooler Supabase, port 6543 + `?pgbouncer=true` (Langkah 1) |
   | `DIRECT_URL` | direct Supabase, port 5432 (Langkah 1) |
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
| Build gagal `Can't reach database` | Build tidak butuh koneksi DB, tapi `DATABASE_URL` & `DIRECT_URL` harus ada di env Vercel. |
| `prisma db push` timeout / error prepared statement | Pastikan pakai `DIRECT_URL` (port 5432), bukan pooler 6543, untuk push/migrasi. |
| Query lambat / error di produksi | `DATABASE_URL` harus pooler port **6543** + `?pgbouncer=true` (bukan direct 5432). |
| Menu kosong saat dibuka | Tabel belum di-seed. Jalankan Langkah 3. |
| QRIS "mode demo" | `MIDTRANS_SERVER_KEY` belum diisi **dan** QRIS statis belum diatur. |
| Pembayaran QRIS tidak update otomatis | Cek Payment Notification URL di Midtrans sudah benar & mengarah ke domain produksi. |
