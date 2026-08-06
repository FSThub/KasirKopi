/**
 * Algoritma Apriori (Agrawal & Srikant, 1994) untuk penggalian aturan asosiasi
 * dari riwayat transaksi kedai kopi.
 *
 * Dipakai untuk dua hal:
 *   1. Skor "best seller" otomatis pada menu (bintang 5 / 4 / 3) yang ikut
 *      berubah mengikuti menu yang paling sering dibeli pelanggan.
 *   2. Rekomendasi upsell berbasis aturan asosiasi (A -> B).
 *
 * Semua dihitung di dalam aplikasi tanpa layanan pihak ketiga.
 */

/** Satu transaksi = daftar id/nama produk yang unik dalam satu struk. */
export type Transaksi = string[];

export type Itemset = {
  items: string[];
  /** Jumlah transaksi yang memuat itemset ini. */
  count: number;
  /** count / jumlah transaksi. */
  support: number;
};

export type Aturan = {
  antecedent: string[];
  consequent: string;
  support: number;
  confidence: number;
  lift: number;
};

const kunci = (items: string[]) => items.join("");

/**
 * Tahap inti Apriori: bangkitkan frequent itemset secara bertingkat.
 * L1 -> C2 -> L2 -> C3 -> ... sampai tidak ada kandidat yang lolos minSupport.
 *
 * @param transaksi    daftar transaksi (item unik per transaksi)
 * @param minSupport   ambang support minimum (0..1)
 * @param maxK         panjang itemset maksimum yang digali
 */
export function frequentItemsets(
  transaksi: Transaksi[],
  minSupport = 0.05,
  maxK = 3
): Map<string, Itemset> {
  const hasil = new Map<string, Itemset>();
  const n = transaksi.length;
  if (n === 0) return hasil;

  // Set per transaksi supaya pengecekan "memuat" berbiaya O(1).
  const sets = transaksi.map((t) => new Set(t));
  const minCount = Math.max(1, Math.ceil(minSupport * n));

  // ---- L1: item tunggal ----
  const hitung1 = new Map<string, number>();
  for (const s of sets) {
    for (const it of s) hitung1.set(it, (hitung1.get(it) ?? 0) + 1);
  }
  let Lk: string[][] = [];
  for (const [item, c] of hitung1) {
    if (c >= minCount) {
      const items = [item];
      hasil.set(kunci(items), { items, count: c, support: c / n });
      Lk.push(items);
    }
  }

  // ---- Lk berikutnya ----
  for (let k = 2; k <= maxK && Lk.length > 0; k++) {
    const kandidat = gabungKandidat(Lk, k);
    const lolos: string[][] = [];
    for (const kand of kandidat) {
      // Pemangkasan Apriori: semua subset (k-1) harus frequent.
      if (!semuaSubsetFrequent(kand, hasil)) continue;
      let c = 0;
      for (const s of sets) {
        let muat = true;
        for (const it of kand) {
          if (!s.has(it)) {
            muat = false;
            break;
          }
        }
        if (muat) c++;
      }
      if (c >= minCount) {
        hasil.set(kunci(kand), { items: kand, count: c, support: c / n });
        lolos.push(kand);
      }
    }
    Lk = lolos;
  }

  return hasil;
}

/** Gabungkan pasangan itemset (k-1) yang berbagi prefiks menjadi kandidat k. */
function gabungKandidat(Lk: string[][], k: number): string[][] {
  const out: string[][] = [];
  const terlihat = new Set<string>();
  for (let i = 0; i < Lk.length; i++) {
    for (let j = i + 1; j < Lk.length; j++) {
      const a = Lk[i];
      const b = Lk[j];
      let samaPrefiks = true;
      for (let x = 0; x < k - 2; x++) {
        if (a[x] !== b[x]) {
          samaPrefiks = false;
          break;
        }
      }
      if (!samaPrefiks || a[k - 2] === b[k - 2]) continue;
      const kand = [...a, b[k - 2]].sort();
      const ku = kunci(kand);
      if (!terlihat.has(ku)) {
        terlihat.add(ku);
        out.push(kand);
      }
    }
  }
  return out;
}

/** Prinsip Apriori: itemset tidak mungkin frequent bila ada subset yang tidak frequent. */
function semuaSubsetFrequent(kand: string[], frequent: Map<string, Itemset>): boolean {
  for (let i = 0; i < kand.length; i++) {
    const subset = kand.filter((_, idx) => idx !== i);
    if (!frequent.has(kunci(subset))) return false;
  }
  return true;
}

/**
 * Turunkan aturan asosiasi A -> B dari frequent itemset.
 * confidence = support(A ∪ B) / support(A); lift = confidence / support(B).
 */
export function aturanAsosiasi(
  itemsets: Map<string, Itemset>,
  minConfidence = 0.2
): Aturan[] {
  const out: Aturan[] = [];
  for (const set of itemsets.values()) {
    if (set.items.length < 2) continue;
    for (const konsekuen of set.items) {
      const anteseden = set.items.filter((i) => i !== konsekuen);
      const sA = itemsets.get(kunci(anteseden))?.support;
      const sB = itemsets.get(kunci([konsekuen]))?.support;
      if (!sA || !sB) continue;
      const confidence = set.support / sA;
      if (confidence < minConfidence) continue;
      out.push({
        antecedent: anteseden,
        consequent: konsekuen,
        support: set.support,
        confidence,
        lift: confidence / sB,
      });
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence || b.support - a.support);
}

/* =====================================================================
 * Skor best seller (bintang)
 * =================================================================== */

export type SkorBestSeller = {
  /** 5 = Best Seller, 4 = Sering Dibeli, 3 = Suka Dibeli. */
  poin: 3 | 4 | 5;
  label: string;
  support: number;
  /** Jumlah transaksi yang memuat produk ini. */
  count: number;
};

export const LABEL_POIN: Record<3 | 4 | 5, string> = {
  5: "Best Seller",
  4: "Sering Dibeli",
  3: "Suka Dibeli",
};

export type ItemSupport = {
  kunci: string;
  support: number;
  /** Jumlah transaksi yang memuat menu ini (pembilang support). */
  count: number;
  /** Total unit terjual — beda dari count: 35 item dalam satu struk = 1 transaksi. */
  unit: number;
};

/** Poin menurut peringkat: juara 1 → 5, juara 2 → 4, juara 3 → 3. */
const POIN_PERINGKAT: (3 | 4 | 5)[] = [5, 4, 3];

/** Peringkat 1..n menurut sebuah ukuran; nilai sama mendapat peringkat sama. */
function peringkatMenurut(
  items: ItemSupport[],
  ukur: (i: ItemSupport) => number
): Map<string, number> {
  const urut = [...items].sort((a, b) => ukur(b) - ukur(a));
  const hasil = new Map<string, number>();
  let posisi = 0;
  let sebelumnya: number | null = null;
  urut.forEach((it, idx) => {
    const nilai = ukur(it);
    if (nilai !== sebelumnya) {
      posisi = idx + 1;
      sebelumnya = nilai;
    }
    hasil.set(it.kunci, posisi);
  });
  return hasil;
}

/**
 * Beri bintang pada sekelompok menu menurut PERINGKAT GABUNGAN dua ukuran:
 *
 *   1. support Apriori — berapa banyak transaksi memuat menu tersebut
 *      (seberapa sering pelanggan membelinya), dan
 *   2. unit terjual — berapa banyak porsi yang berpindah.
 *
 * Keduanya diperlukan karena masing-masing timpang bila berdiri sendiri:
 * support saja membuat pembelian 35 porsi dalam satu struk hanya dihitung satu
 * keranjang, sedangkan unit saja membuat satu pembeli borongan mengalahkan
 * menu yang dicari banyak orang. Peringkat akhir memakai rata-rata posisi pada
 * kedua ukuran, sehingga bebas dari satuan dan tidak perlu bobot yang
 * ditetapkan sembarangan.
 *
 * Dipakai per kategori, sehingga tiap kategori punya tepat satu ⭐5, satu ⭐4,
 * dan satu ⭐3; peringkat keempat ke bawah tidak diberi bintang.
 *
 * @param minCount jumlah transaksi minimum agar sebuah menu layak berbintang;
 *                 mencegah menu yang baru terjual sekali langsung jadi juara.
 */
export function skorRelatif(
  items: ItemSupport[],
  minCount = 2
): Map<string, SkorBestSeller> {
  const hasil = new Map<string, SkorBestSeller>();
  const layak = items.filter((i) => i.count >= minCount);
  if (layak.length === 0) return hasil;

  const pSupport = peringkatMenurut(layak, (i) => i.support);
  const pUnit = peringkatMenurut(layak, (i) => i.unit);

  // Peringkat gabungan; pemutus seri berlapis agar hasilnya selalu sama untuk
  // data yang sama: unit → support → nama.
  const urut = [...layak].sort((a, b) => {
    const ga = (pSupport.get(a.kunci)! + pUnit.get(a.kunci)!) / 2;
    const gb = (pSupport.get(b.kunci)! + pUnit.get(b.kunci)!) / 2;
    return ga - gb || b.unit - a.unit || b.support - a.support ||
      a.kunci.localeCompare(b.kunci);
  });

  urut.slice(0, POIN_PERINGKAT.length).forEach((it, peringkat) => {
    const poin = POIN_PERINGKAT[peringkat];
    hasil.set(it.kunci, {
      poin,
      label: LABEL_POIN[poin],
      support: it.support,
      count: it.count,
    });
  });
  return hasil;
}

/**
 * Versi global: seluruh menu dinilai dalam satu kelompok, tanpa data unit
 * (unit disamakan dengan jumlah transaksi). Dipertahankan untuk perbandingan;
 * aplikasi memakai penilaian per kategori lewat skorRelatif.
 */
export function skorBestSeller(
  transaksi: Transaksi[],
  minSupport = 0.03
): Map<string, SkorBestSeller> {
  const itemsets = frequentItemsets(transaksi, minSupport, 1);
  return skorRelatif(
    [...itemsets.values()]
      .filter((i) => i.items.length === 1)
      .map((i) => ({
        kunci: i.items[0],
        support: i.support,
        count: i.count,
        unit: i.count,
      })),
    1
  );
}

/** Support tiap menu (1-itemset) dari riwayat, hasil tahap pertama Apriori. */
export function supportSatuan(
  transaksi: Transaksi[],
  minSupport = 0.02
): Map<string, { support: number; count: number }> {
  const out = new Map<string, { support: number; count: number }>();
  for (const it of frequentItemsets(transaksi, minSupport, 1).values()) {
    if (it.items.length === 1) out.set(it.items[0], { support: it.support, count: it.count });
  }
  return out;
}

/** Buang sufiks opsi pada nama snapshot: "Cappuccino (M, Panas)" -> "Cappuccino". */
export function namaDasar(nama: string): string {
  return nama.split(" (")[0].split(" — ")[0].trim();
}
