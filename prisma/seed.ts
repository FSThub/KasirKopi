import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const data: { category: string; emoji: string; items: [string, number, string][] }[] = [
  {
    category: "Kopi Susu",
    emoji: "🥛",
    items: [
      ["Kopi Susu Gula Aren", 18000, "🥛"],
      ["Es Kopi Susu", 16000, "🧋"],
      ["Kopi Susu Pandan", 20000, "🥛"],
      ["Kopi Susu Vanilla", 20000, "🥛"],
    ],
  },
  {
    category: "Espresso Based",
    emoji: "☕",
    items: [
      ["Espresso", 12000, "☕"],
      ["Americano", 15000, "☕"],
      ["Cappuccino", 22000, "☕"],
      ["Cafe Latte", 22000, "☕"],
      ["Caramel Macchiato", 26000, "☕"],
    ],
  },
  {
    category: "Manual Brew",
    emoji: "🫗",
    items: [
      ["V60", 25000, "🫗"],
      ["Tubruk", 12000, "🫗"],
      ["Vietnam Drip", 20000, "🫗"],
    ],
  },
  {
    category: "Non Kopi",
    emoji: "🍵",
    items: [
      ["Matcha Latte", 24000, "🍵"],
      ["Chocolate", 22000, "🍫"],
      ["Red Velvet", 24000, "🥤"],
      ["Teh Tarik", 15000, "🍵"],
    ],
  },
  {
    category: "Snack",
    emoji: "🍪",
    items: [
      ["Croissant", 18000, "🥐"],
      ["Roti Bakar", 15000, "🍞"],
      ["French Fries", 20000, "🍟"],
    ],
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Hapus data lama (urutan penting karena relasi)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    const category = await prisma.category.create({
      data: { name: c.category, sort: i },
    });
    for (const [name, price, emoji] of c.items) {
      await prisma.product.create({
        data: { name, price, emoji, categoryId: category.id },
      });
    }
    console.log(`  ✔ ${c.category} (${c.items.length} produk)`);
  }

  // Setting QRIS default (bisa diubah di halaman Pengaturan)
  await prisma.setting.upsert({
    where: { key: "qris_merchant_string" },
    update: {},
    create: { key: "qris_merchant_string", value: process.env.QRIS_MERCHANT_STRING || "" },
  });
  await prisma.setting.upsert({
    where: { key: "store_name" },
    update: {},
    create: { key: "store_name", value: process.env.NEXT_PUBLIC_STORE_NAME || "KasirKopi" },
  });
  await prisma.setting.upsert({
    where: { key: "tax_percent" },
    update: {},
    create: { key: "tax_percent", value: "0" },
  });

  console.log("✅ Seed selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
