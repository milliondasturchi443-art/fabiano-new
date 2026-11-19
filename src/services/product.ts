import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { cardInclude, localized, toCard, type ProductCardData } from "./catalog";
import type { AppLocale } from "@/i18n/routing";
import type { ColorOption, GalleryImage, VariantOption } from "@/features/product/variants";

export interface SizeGuideTable {
  columns: string[];
  rows: string[][];
  unit?: string;
}

export interface ProductDetail {
  id: string;
  slug: string;
  sku: string;
  brand: string;
  gender: "MEN" | "WOMEN" | "UNISEX";
  name: string;
  description: string;
  material: string | null;
  care: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  isNew: boolean;
  category: { slug: string; name: string; gender: "MEN" | "WOMEN" | "UNISEX" };
  colors: ColorOption[];
  variants: VariantOption[];
  images: GalleryImage[];
  sizeGuide: { name: string; table: SizeGuideTable } | null;
  tryOnEnabled: boolean;
  rating: { average: number; count: number } | null;
}

/** cache(): generateMetadata и страница делят один запрос. */
export const getProductBySlug = cache(async (slug: string, locale: AppLocale): Promise<ProductDetail | null> => {
  const p = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      translations: { where: { locale } },
      category: { include: { translations: { where: { locale }, select: { name: true } } } },
      images: { orderBy: { sortOrder: "asc" }, include: { color: { select: { code: true } } } },
      variants: {
        where: { isActive: true },
        include: { size: true, color: true, inventory: true },
      },
      sizeGuide: true,
    },
  });
  if (!p) return null;
  const t = p.translations[0];
  const name = t?.name ?? p.sku;

  const colors = new Map<string, ColorOption>();
  for (const v of p.variants) colors.set(v.color.code, { code: v.color.code, name: localized(v.color.names, locale), hex: v.color.hex });

  const reviews = await prisma.review.aggregate({
    where: { productId: p.id, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand,
    gender: p.gender,
    name,
    description: t?.description ?? "",
    material: t?.material ?? null,
    care: t?.care ?? null,
    metaTitle: t?.metaTitle ?? null,
    metaDescription: t?.metaDescription ?? null,
    price: p.price.toString(),
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
    currency: p.currency,
    isNew: p.isNew,
    category: { slug: p.category.slug, name: p.category.translations[0]?.name ?? p.category.slug, gender: p.category.gender },
    colors: [...colors.values()],
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      colorCode: v.color.code,
      size: v.size.code,
      sizeOrder: v.size.sortOrder,
      available: v.inventory ? Math.max(0, v.inventory.quantity - v.inventory.reserved) : 0,
      price: (v.priceOverride ?? p.price).toString(),
    })),
    images: p.images.flatMap((i) => {
      const url = mediaUrl(i.storageKey);
      return url ? [{ url, width: i.width, height: i.height, alt: localized(i.alt, locale) || name, colorCode: i.color?.code ?? null }] : [];
    }),
    sizeGuide: p.sizeGuide ? { name: p.sizeGuide.name, table: p.sizeGuide.table as unknown as SizeGuideTable } : null,
    tryOnEnabled: p.tryOnEnabled,
    rating: reviews._count > 0 && reviews._avg.rating ? { average: Math.round(reviews._avg.rating * 10) / 10, count: reviews._count } : null,
  };
});

export async function getRelatedProducts(product: ProductDetail, locale: AppLocale, take = 4): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", id: { not: product.id }, category: { slug: product.category.slug, gender: product.category.gender } },
    orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
    take,
    include: cardInclude(locale),
  });
  return rows.map((r) => toCard(r, locale));
}

/**
 * Живая примерка (Decart Lucy V-TON) доступна, если на сервере задан DECART_API_KEY,
 * в админке включена «Jonli kiyib koʻrish» и у товара есть хотя бы одно фото.
 */
export async function isTryOnEnabledFor(product: ProductDetail): Promise<boolean> {
  if (!process.env.DECART_API_KEY || product.images.length === 0) return false;
  const s = await prisma.storeSettings.findUnique({ where: { id: "default" }, select: { tryOnEnabled: true } });
  return Boolean(s?.tryOnEnabled);
}
