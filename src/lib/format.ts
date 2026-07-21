export function rupiah(n: number): string {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

export function tanggal(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
