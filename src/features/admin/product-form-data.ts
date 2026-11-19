import "server-only";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { localized } from "@/services/catalog";

export interface EditorOptions {
  categories: { id: string; gender: "MEN" | "WOMEN" | "UNISEX"; slug: string; label: string }[];
  collections: { id: string; label: string }[];
  colors: { id: string; hex: string; label: string }[];
  sizes: { id: string; code: string }[];
}

export interface EditorProduct {
  id?: string;
  sku?: string;
  slug?: string;
  active: boolean;
  names: { uz: string; ru: string; en: string };
  descs: { uz: string; ru: string; en: string };
  material: string;
  care: string;
  gender: "MEN" | "WOMEN" | "UNISEX";
  categoryId: string;
  price: string; // цена до скидки
  disc: string; // %
  collectionId: string;
  isNew: boolean;
  isFeatured: boolean;
  colorIds: string[];
  stock: Record<string, number>; // `${colorId}:${sizeId}` → кол-во
  reserved: Record<string, number>;
  images: { id: string; url: string }[];
}

export async function loadEditorOptions(): Promise<EditorOptions> {
  const [categories, collections, colors, sizes] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ gender: "asc" }, { sortOrder: "asc" }], include: { translations: { where: { locale: "uz" } } } }),
    prisma.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { translations: { where: { locale: "uz" } } } }),
    prisma.color.findMany({ orderBy: { code: "asc" } }),
    prisma.size.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, gender: c.gender, slug: c.slug, label: c.translations[0]?.name ?? c.slug })),
    collections: collections.map((c) => ({ id: c.id, label: c.translations[0]?.name ?? c.slug })),
    colors: colors.map((c) => ({ id: c.id, hex: c.hex, label: localized(c.names, "uz") || c.code })),
    sizes: sizes.map((s) => ({ id: s.id, code: s.code })),
  };
}

export const emptyEditorProduct: EditorProduct = {
  active: true,
  names: { uz: "", ru: "", en: "" },
  descs: { uz: "", ru: "", en: "" },
  material: "",
  care: "",
  gender: "MEN",
  categoryId: "",
  price: "",
  disc: "",
  collectionId: "",
  isNew: true,
  isFeatured: false,
  colorIds: [],
  stock: {},
  reserved: {},
  images: [],
};

export async function loadEditorProduct(id: string): Promise<EditorProduct | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      collections: true,
      variants: { where: { isActive: true }, include: { inventory: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) return null;
  const t = (l: "uz" | "ru" | "en") => p.translations.find((x) => x.locale === l);
  const uz = t("uz");
  const compare = p.compareAtPrice ? Number(p.compareAtPrice) : null;
  const price = Number(p.price);
  const disc = compare && compare > price ? Math.round((1 - price / compare) * 100) : 0;
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    active: p.status === "ACTIVE",
    names: { uz: uz?.name ?? "", ru: t("ru")?.name ?? "", en: t("en")?.name ?? "" },
    descs: { uz: uz?.description ?? "", ru: t("ru")?.description ?? "", en: t("en")?.description ?? "" },
    material: uz?.material ?? "",
    care: uz?.care ?? "",
    gender: p.gender,
    categoryId: p.categoryId,
    price: String(Math.round(compare && compare > price ? compare : price)),
    disc: disc ? String(disc) : "",
    collectionId: p.collections[0]?.collectionId ?? "",
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    colorIds: [...new Set(p.variants.map((v) => v.colorId))],
    stock: Object.fromEntries(p.variants.map((v) => [`${v.colorId}:${v.sizeId}`, v.inventory?.quantity ?? 0])),
    reserved: Object.fromEntries(p.variants.map((v) => [`${v.colorId}:${v.sizeId}`, v.inventory?.reserved ?? 0])),
    images: p.images.flatMap((i) => {
      const url = mediaUrl(i.storageKey);
      return url ? [{ id: i.id, url }] : [];
    }),
  };
}
