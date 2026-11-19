/**
 * Начальные справочники. Идемпотентно (upsert). Никаких фиктивных товаров, заказов или клиентов.
 * Первый администратор: SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (только из env, пароль хешируется argon2id).
 */
import { PrismaClient, type Gender } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { STATIC_PAGES } from "./content/pages";

const prisma = new PrismaClient();

type T3 = { uz: string; ru: string; en: string };

const ROLES: { name: string; permissions: string[] }[] = [
  { name: "customer", permissions: [] },
  { name: "content_editor", permissions: ["admin:access", "content:write", "products:read", "collections:write"] },
  { name: "manager", permissions: ["admin:access", "products:read", "products:write", "orders:read", "orders:write", "customers:read", "coupons:write", "inventory:write"] },
  { name: "admin", permissions: ["*"] },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "ONE"];

const COLORS: { code: string; hex: string; names: T3 }[] = [
  { code: "black", hex: "#171717", names: { uz: "Qora", ru: "Чёрный", en: "Black" } },
  { code: "white", hex: "#FFFFFF", names: { uz: "Oq", ru: "Белый", en: "White" } },
  { code: "ivory", hex: "#F2EDE3", names: { uz: "Fil suyagi", ru: "Слоновая кость", en: "Ivory" } },
  { code: "sand", hex: "#CDB89A", names: { uz: "Qum rang", ru: "Песочный", en: "Sand" } },
  { code: "camel", hex: "#B08A5E", names: { uz: "Tuya juni", ru: "Кэмел", en: "Camel" } },
  { code: "brown", hex: "#5B4232", names: { uz: "Jigarrang", ru: "Коричневый", en: "Brown" } },
  { code: "grey", hex: "#8C8A86", names: { uz: "Kulrang", ru: "Серый", en: "Grey" } },
  { code: "navy", hex: "#1F2A44", names: { uz: "Toʻq koʻk", ru: "Тёмно-синий", en: "Navy" } },
  { code: "olive", hex: "#5E6146", names: { uz: "Zaytun", ru: "Оливковый", en: "Olive" } },
  { code: "burgundy", hex: "#5C1A24", names: { uz: "Bordo", ru: "Бордовый", en: "Burgundy" } },
];

const CATS: Record<string, T3> = {
  "t-shirts": { uz: "Futbolkalar", ru: "Футболки", en: "T-Shirts" },
  tops: { uz: "Toplar", ru: "Топы", en: "Tops" },
  shirts: { uz: "Koʻylaklar", ru: "Рубашки", en: "Shirts" },
  hoodies: { uz: "Hudilar", ru: "Худи", en: "Hoodies" },
  sweatshirts: { uz: "Svitshotlar", ru: "Свитшоты", en: "Sweatshirts" },
  dresses: { uz: "Koʻylaklar (ayollar)", ru: "Платья", en: "Dresses" },
  jackets: { uz: "Kurtkalar", ru: "Куртки", en: "Jackets" },
  pants: { uz: "Shimlar", ru: "Брюки", en: "Pants" },
  jeans: { uz: "Jinsilar", ru: "Джинсы", en: "Jeans" },
  shorts: { uz: "Shortilar", ru: "Шорты", en: "Shorts" },
  skirts: { uz: "Yubkalar", ru: "Юбки", en: "Skirts" },
  shoes: { uz: "Poyabzallar", ru: "Обувь", en: "Shoes" },
  accessories: { uz: "Aksessuarlar", ru: "Аксессуары", en: "Accessories" },
};

const MEN = ["t-shirts", "shirts", "hoodies", "sweatshirts", "jackets", "pants", "jeans", "shorts", "shoes", "accessories"];
const WOMEN = ["t-shirts", "tops", "shirts", "hoodies", "dresses", "jackets", "pants", "jeans", "skirts", "shoes", "accessories"];

const COLLECTIONS: { slug: string; names: T3 }[] = [
  { slug: "mens", names: { uz: "Erkaklar kolleksiyasi", ru: "Мужская коллекция", en: "Men's Collection" } },
  { slug: "womens", names: { uz: "Ayollar kolleksiyasi", ru: "Женская коллекция", en: "Women's Collection" } },
  { slug: "essentials", names: { uz: "Essentials", ru: "Essentials", en: "Essentials" } },
  { slug: "streetwear", names: { uz: "Streetwear", ru: "Streetwear", en: "Streetwear" } },
  { slug: "premium", names: { uz: "Premium kolleksiya", ru: "Премиальная коллекция", en: "Premium Collection" } },
];

async function main() {
  for (const r of ROLES) {
    await prisma.role.upsert({ where: { name: r.name }, create: r, update: { permissions: r.permissions } });
  }
  for (const [i, code] of SIZES.entries()) {
    await prisma.size.upsert({ where: { code }, create: { code, sortOrder: i }, update: { sortOrder: i } });
  }
  for (const c of COLORS) {
    await prisma.color.upsert({ where: { code: c.code }, create: c, update: { hex: c.hex, names: c.names } });
  }
  const seedCats = async (gender: Gender, slugs: string[]) => {
    for (const [i, slug] of slugs.entries()) {
      const cat = await prisma.category.upsert({
        where: { gender_slug: { gender, slug } },
        create: { gender, slug, sortOrder: i },
        update: {},
      });
      for (const locale of ["uz", "ru", "en"] as const) {
        await prisma.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: cat.id, locale } },
          create: { categoryId: cat.id, locale, name: CATS[slug]![locale] },
          update: {},
        });
      }
    }
  };
  await seedCats("MEN", MEN);
  await seedCats("WOMEN", WOMEN);

  for (const [i, c] of COLLECTIONS.entries()) {
    const col = await prisma.collection.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, sortOrder: i, isFeatured: true },
      update: {},
    });
    for (const locale of ["uz", "ru", "en"] as const) {
      await prisma.collectionTranslation.upsert({
        where: { collectionId_locale: { collectionId: col.id, locale } },
        create: { collectionId: col.id, locale, name: c.names[locale] },
        update: {},
      });
    }
  }

  await prisma.storeSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });

  // Все платёжные методы выключены: включаются в Dashboard после настройки credentials.
  for (const provider of ["PAYME", "CLICK", "CASH_ON_DELIVERY"] as const) {
    await prisma.paymentMethodConfig.upsert({ where: { provider }, create: { provider, isEnabled: false }, update: {} });
  }

  // Информационные страницы: создаются один раз, правки администратора не перезаписываются
  for (const locale of ["uz", "ru", "en"] as const) {
    for (const p of STATIC_PAGES[locale]) {
      await prisma.staticPage.upsert({
        where: { slug_locale: { slug: p.slug, locale } },
        create: { slug: p.slug, locale, title: p.title, body: p.body },
        update: {},
      });
    }
  }

  // Первый администратор. Пароль генерирует Render (ADMIN_INITIAL_PASSWORD, generateValue) —
  // он виден только владельцу в Render → Environment. Повторный seed пароль НЕ меняет.
  const email = (process.env.ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL)?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("Admin initial password must be at least 12 characters");
    const existing = await prisma.user.findUnique({ where: { email } });
    const admin =
      existing ??
      (await prisma.user.create({
        data: { email, passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }), firstName: "Admin" },
      }));
    const role = await prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: role.id } },
      create: { userId: admin.id, roleId: role.id },
      update: {},
    });
    console.log(`Admin ready: ${email}${existing ? " (existing, password unchanged)" : " (created)"}`);
  } else {
    console.log("ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD not set — admin user not created.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
