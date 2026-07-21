"use client";

import { useState } from "react";
import CoffeeArt, { coffeeArt } from "@/components/CoffeeArt";
import { productPhoto } from "@/lib/photos";

/**
 * Gambar produk: coba foto realistis (CDN); bila gagal dimuat atau tidak
 * ada pemetaan, fallback ke ilustrasi SVG CoffeeArt agar tidak pernah blank.
 */
export default function ProductImage({
  name,
  category,
  src,
  className = "h-20 w-20",
  artClassName,
}: {
  name: string;
  category?: string;
  /** Foto unggahan (data URL / URL). Bila ada, dipakai lebih dulu. */
  src?: string | null;
  className?: string;
  artClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const photo = src || productPhoto(name, category);

  if (photo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} object-cover`}
      />
    );
  }
  return <CoffeeArt art={coffeeArt(name, category)} className={artClassName ?? className} />;
}
