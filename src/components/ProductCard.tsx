"use client";

import { useState } from "react";
import { useCart } from "@/lib/store";
import { rupiah } from "@/lib/format";
import { Icon } from "@/components/Icon";
import ProductImage from "@/components/ProductImage";
import {
  MOODS,
  SIZES,
  SUGARS,
  ICES,
  sizeDelta,
  defaultOptions,
  type ItemOptions,
  type Mood,
  type Size,
  type Sugar,
  type Ice,
} from "@/lib/options";
import type { Product } from "@/lib/types";

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex min-w-9 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-coffee-700 text-white shadow-[var(--elev-1)]"
          : "bg-coffee-50 text-coffee-500 ring-1 ring-coffee-100 hover:bg-coffee-100"
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-coffee-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const [opt, setOpt] = useState<ItemOptions>(defaultOptions());
  const [added, setAdded] = useState(false);

  const unitPrice = product.price + sizeDelta(opt.size);
  const set = <K extends keyof ItemOptions>(k: K, v: ItemOptions[K]) =>
    setOpt((o) => ({ ...o, [k]: v }));

  const handleAdd = () => {
    add(product, opt);
    setAdded(true);
    setTimeout(() => setAdded(false), 1100);
  };

  return (
    <div className="card card-hover animate-rise flex flex-col p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-coffee-50 ring-1 ring-coffee-100">
          <ProductImage
            name={product.name}
            category={product.category?.name}
            src={product.image}
            className="h-24 w-24"
            artClassName="h-[86px] w-[86px]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight text-coffee-800">{product.name}</h3>
          {product.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-coffee-400">
              {product.description}
            </p>
          )}
          <p className="mt-1 font-extrabold text-coffee-700">{rupiah(unitPrice)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Group label="Mood">
          {MOODS.map((m: Mood) => (
            <Chip key={m} active={opt.mood === m} onClick={() => set("mood", m)} label={m}>
              <Icon name={m === "Panas" ? "flame" : "snowflake"} className="h-4 w-4" />
              {m}
            </Chip>
          ))}
        </Group>
        <Group label="Size">
          {SIZES.map((s) => (
            <Chip key={s.key} active={opt.size === s.key} onClick={() => set("size", s.key)}>
              {s.label}
            </Chip>
          ))}
        </Group>
        <Group label="Sugar">
          {SUGARS.map((s: Sugar) => (
            <Chip key={s} active={opt.sugar === s} onClick={() => set("sugar", s)}>
              {s}
            </Chip>
          ))}
        </Group>
        {opt.mood === "Dingin" && (
          <Group label="Ice">
            {ICES.map((s: Ice) => (
              <Chip key={s} active={opt.ice === s} onClick={() => set("ice", s)}>
                {s}
              </Chip>
            ))}
          </Group>
        )}
      </div>

      <button
        onClick={handleAdd}
        className={`btn mt-4 w-full ${added ? "bg-green-600 text-white" : "btn-primary"}`}
      >
        {added ? (
          <>
            <Icon name="check" className="h-5 w-5" strokeWidth={2.5} /> Ditambahkan
          </>
        ) : (
          <>
            <Icon name="plus" className="h-5 w-5" strokeWidth={2.5} /> Tambah ke Pesanan
          </>
        )}
      </button>
    </div>
  );
}
