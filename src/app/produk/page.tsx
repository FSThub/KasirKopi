"use client";

import { useEffect, useRef, useState } from "react";
import { rupiah } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { Icon, PRODUCT_ICONS, resolveProductIcon } from "@/components/Icon";
import ProductImage from "@/components/ProductImage";

/** Kompres & ubah file gambar jadi data URL (maks ~640px, JPEG). */
async function fileToDataUrl(file: File, max = 640): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [p, c] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setProducts(p);
    setCategories(c);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(p: Product) {
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !p.isAvailable }),
    });
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`Hapus "${p.name}"?`)) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    load();
  }

  const grouped = categories.map((c) => ({
    category: c,
    items: products.filter((p) => p.categoryId === c.id),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 lg:pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-coffee-800">Kelola Menu</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.5} /> Tambah
        </button>
      </div>

      {grouped.map(({ category, items }) => (
        <div key={category.id} className="mb-5">
          <p className="mb-2 text-sm font-bold text-coffee-500">{category.name}</p>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="card card-hover flex animate-rise items-center gap-3 p-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-coffee-50 ring-1 ring-coffee-100">
                  <ProductImage
                    name={p.name}
                    category={p.category?.name}
                    src={p.image}
                    className="h-12 w-12"
                    artClassName="h-9 w-9"
                  />
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${p.isAvailable ? "text-coffee-800" : "text-coffee-300 line-through"}`}>
                    {p.name}
                  </p>
                  <p className="text-sm text-coffee-500">{rupiah(p.price)}</p>
                </div>
                <button
                  onClick={() => toggle(p)}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    p.isAvailable ? "bg-green-50 text-green-600" : "bg-coffee-100 text-coffee-400"
                  }`}
                >
                  {p.isAvailable ? "Tersedia" : "Habis"}
                </button>
                <button
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                  aria-label={`Edit ${p.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-coffee-400 transition hover:bg-coffee-100 hover:text-coffee-700"
                >
                  <Icon name="pencil" className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => remove(p)}
                  aria-label={`Hapus ${p.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-red-300 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Icon name="trash" className="h-[18px] w-[18px]" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-coffee-300">Belum ada menu di kategori ini.</p>
            )}
          </div>
        </div>
      ))}

      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState<string>(product ? String(product.price) : "");
  const [emoji, setEmoji] = useState(resolveProductIcon(product?.emoji));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [image, setImage] = useState<string>(product?.image ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("File harus berupa gambar");
    try {
      setImage(await fileToDataUrl(file));
      setError("");
    } catch {
      setError("Gagal memproses gambar");
    }
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Nama wajib diisi");
    if (!categoryId) return setError("Pilih kategori");
    setSaving(true);
    const body = { name, price, emoji, categoryId, image: image || null };
    const res = product
      ? await fetch(`/api/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Gagal menyimpan");
      return;
    }
    onSaved();
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-sheet max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-safe sm:max-w-md sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-coffee-200 sm:hidden" />
        <h2 className="mb-4 text-lg font-bold tracking-tight">{product ? "Edit Menu" : "Tambah Menu"}</h2>

        <div className="space-y-3">
          {/* Foto produk */}
          <div>
            <label className="mb-1 block text-sm font-medium text-coffee-600">Foto Menu</label>
            <div className="flex items-center gap-3">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-coffee-50 ring-1 ring-coffee-100">
                <ProductImage
                  name={name || "Menu"}
                  src={image || undefined}
                  className="h-20 w-20"
                  artClassName="h-14 w-14"
                />
              </span>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost px-3 py-2 text-sm"
                >
                  <Icon name="plus" className="h-4 w-4" strokeWidth={2.5} />
                  {image ? "Ganti Foto" : "Unggah Foto"}
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Hapus foto
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-coffee-600">Nama Menu</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Kopi Susu Gula Aren" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-coffee-600">Harga (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="18000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-coffee-600">Kategori</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-coffee-600">Ikon</label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_ICONS.map((name) => (
                <button
                  key={name}
                  onClick={() => setEmoji(name)}
                  aria-label={`Ikon ${name}`}
                  aria-pressed={emoji === name}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    emoji === name ? "bg-coffee-700 text-white" : "bg-white text-coffee-600 ring-1 ring-coffee-100"
                  }`}
                >
                  <Icon name={name} className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-ghost">
            Batal
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
