import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import type { AppLocale } from "@/i18n/routing";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  isNew: boolean;
  inStock: boolean;
  image: { url: string; width: number; height: number; alt: string } | null;
  hoverImage: { url: string; width: number; height: number; alt: string } | null;
  colors: { code: string; hex: string; name: string }[];
  gender: "MEN" | "WOMEN" | "UNISEX";
  categoryName: string | null;
}

export const cardInclude = (locale: AppLocale) =>
  ({
    translations: { where: { locale }, select: { name: true } },
    category: { select: { translations: { where: { locale }, select: { name: true } } } },
    images: { orderBy: { sortOrder: "asc" }, take: 2, select: { storageKey: true, width: true, height: true, alt: true } },
    variants: {
      where: { isActive: true },
      select: { color: { select: { code: true, hex: true, names: true } }, inventory: { select: { quantity: true, reserved: true } } },
    },
  }) satisfies Prisma.ProductInclude;

export type CardRow = Prisma.ProductGetPayload<{ include: ReturnType<typeof cardInclude> }>;

export function localized(json: Prisma.JsonValue | null, locale: AppLocale): string {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const v = (json as Record<string, unknown>)[locale];
    if (typeof v === "string") return v;
  }
  return "";
}

export function toCard(p: CardRow, locale: AppLocale): ProductCardData {
  const name = p.translations[0]?.name ?? p.sku;
  const img = (i: CardRow["images"][number] | undefined) => {
    const url = mediaUrl(i?.storageKey);
    return i && url ? { url, width: i.width, height: i.height, alt: localized(i.alt, locale) || name } : null;
  };
  const colors = new Map<string, ProductCardData["colors"][number]>();
  let inStock = false;
  for (const v of p.variants) {
    colors.set(v.color.code, { code: v.color.code, hex: v.color.hex, name: localized(v.color.names, locale) });
    if (v.inventory && v.inventory.quantity - v.inventory.reserved > 0) inStock = true;
  }
  return {
    id: p.id,
    slug: p.slug,
    name,
    price: p.price.toString(),
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
    currency: p.currency,
    isNew: p.isNew,
    inStock,
    image: img(p.images[0]),
    hoverImage: img(p.images[1]),
    colors: [...colors.values()],
    gender: p.gender,
    categoryName: p.category.translations[0]?.name ?? null,
  };
}

const published = { status: "ACTIVE" } satisfies Prisma.ProductWhereInput;

export async function getNewArrivals(locale: AppLocale, take = 8): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { ...published, isNew: true },
    orderBy: { publishedAt: "desc" },
    take,
    include: cardInclude(locale),
  });
  return rows.map((r) => toCard(r, locale));
}

export async function getBestSellers(locale: AppLocale, take = 8): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { ...published, salesCount: { gt: 0 } },
    orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
    take,
    include: cardInclude(locale),
  });
  return rows.map((r) => toCard(r, locale));
}

export interface CollectionTile {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export async function getFeaturedCollections(locale: AppLocale): Promise<CollectionTile[]> {
  const rows = await prisma.collection.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: { sortOrder: "asc" },
    take: 5,
    include: { translations: { where: { locale } } },
  });
  return rows.map((c) => ({
    slug: c.slug,
    name: c.translations[0]?.name ?? c.slug,
    description: c.translations[0]?.description ?? null,
    imageUrl: mediaUrl(c.imageUrl),
  }));
}

export interface HeroData {
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
}

/** Активный баннер из Dashboard. null → главная показывает типографический hero без фото. */
export async function getActiveHero(locale: AppLocale): Promise<HeroData | null> {
  const now = new Date();
  const b = await prisma.heroBanner.findFirst({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
  });
  if (!b) return null;
  const content = (b.content ?? {}) as Record<string, { title?: string; subtitle?: string } | undefined>;
  return {
    title: content[locale]?.title ?? null,
    subtitle: content[locale]?.subtitle ?? null,
    imageUrl: mediaUrl(b.imageKey),
    mobileImageUrl: mediaUrl(b.mobileImageKey),
  };
}

export async function getStoreSettings() {
  return prisma.storeSettings.findUnique({ where: { id: "default" } });
}

/** Обложки для арок и блоков категорий: первое фото опубликованного товара каждого пола. */
export async function getGenderCovers(): Promise<{ men: string | null; women: string | null }> {
  const pick = async (gender: "MEN" | "WOMEN") => {
    const img = await prisma.productImage.findFirst({
      where: { product: { status: "ACTIVE", gender } },
      orderBy: [{ product: { publishedAt: "desc" } }, { sortOrder: "asc" }],
      select: { storageKey: true },
    });
    return mediaUrl(img?.storageKey);
  };
  const [men, women] = await Promise.all([pick("MEN"), pick("WOMEN")]);
  return { men, women };
}

export async function getGenderCategoryNames(locale: AppLocale): Promise<{ men: string[]; women: string[] }> {
  const rows = await prisma.category.findMany({
    where: { isActive: true, parentId: null, gender: { in: ["MEN", "WOMEN"] } },
    orderBy: { sortOrder: "asc" },
    select: { gender: true, translations: { where: { locale }, select: { name: true } } },
  });
  const names = (g: "MEN" | "WOMEN") => rows.filter((r) => r.gender === g).map((r) => r.translations[0]?.name).filter((n): n is string => Boolean(n));
  return { men: names("MEN"), women: names("WOMEN") };
}
