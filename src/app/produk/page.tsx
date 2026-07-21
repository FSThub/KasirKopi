"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

const EMOJIS = ["☕", "🥛", "🧋", "🫗", "🍵", "🍫", "🥤", "🧊", "🥐", "🍞", "🍟", "🍪", "🍰"];

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
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-coffee-800">Kelola Menu</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          + Tambah
        </button>
      </div>

      {grouped.map(({ category, items }) => (
        <div key={category.id} className="mb-5">
          <p className="mb-2 text-sm font-bold text-coffee-500">{category.name}</p>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="card flex items-center gap-3 p-3">
                <span className="text-3xl">{p.emoji}</span>
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
                  className="text-coffee-400 hover:text-coffee-700"
                >
                  ✏️
                </button>
                <button onClick={() => remove(p)} className="text-red-300 hover:text-red-500">
                  🗑️
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
  const [emoji, setEmoji] = useState(product?.emoji ?? "☕");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!name.trim()) return setError("Nama wajib diisi");
    if (!categoryId) return setError("Pilih kategori");
    setSaving(true);
    const body = { name, price, emoji, categoryId };
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-coffee-50 p-5 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-coffee-200" />
        <h2 className="mb-4 text-lg font-bold">{product ? "Edit Menu" : "Tambah Menu"}</h2>

        <div className="space-y-3">
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
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`h-10 w-10 rounded-xl text-xl ${
                    emoji === e ? "bg-coffee-700" : "bg-white ring-1 ring-coffee-100"
                  }`}
                >
                  {e}
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
