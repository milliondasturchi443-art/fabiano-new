"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deleteStoredImage, storeImage, UploadError } from "@/lib/media-store";
import { requireAdmin } from "./guard";

const LOCALES = ["uz", "ru", "en"] as const;

function slugify(s: string) {
  const map: Record<string, string> = { "ʻ": "", "'": "", "’": "", ш: "sh", ч: "ch", щ: "sch", ж: "zh", ю: "yu", я: "ya", ё: "yo", х: "h", ц: "ts", ы: "y", э: "e", й: "y" };
  const lat = "абвгдезиклмнопрстуф".split("");
  const latTo = "abvgdeziklmnoprstuf".split("");
  return s
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? (lat.indexOf(c) >= 0 ? latTo[lat.indexOf(c)] : c))
    .join("")
    .replace(/[ъь]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export type ProductEditorState = { error?: string } | null;

const editorSchema = z.object({
  id: z.string().optional(),
  name_uz: z.string().trim().min(2).max(120),
  gender: z.enum(["MEN", "WOMEN", "UNISEX"]),
  categoryId: z.string().min(1),
  price: z.string().trim().regex(/^\d{1,12}$/),
  disc: z.string().trim().regex(/^\d{0,2}$/),
});

const stockSchema = z.array(z.object({ colorId: z.string().min(1), sizeId: z.string().min(1), stock: z.number().int().min(0).max(100000) })).max(400);
const orderSchema = z.array(z.string().regex(/^(old:[a-z0-9]+|new:\d{1,2})$/)).max(20);

/**
 * Сохранение товара из упрощённой формы (как в прототипе): тексты, цена со скидкой в %,
 * цвета, остатки по размерам и фото — всё одним запросом.
 */
export async function saveProductEditorAction(_prev: ProductEditorState, form: FormData): Promise<ProductEditorState> {
  const admin = await requireAdmin("products:write");
  const parsed = editorSchema.safeParse({
    id: form.get("id") || undefined,
    name_uz: form.get("name_uz"),
    gender: form.get("gender"),
    categoryId: form.get("categoryId"),
    price: String(form.get("price") ?? "").replace(/\s/g, ""),
    disc: String(form.get("disc") ?? "").trim(),
  });
  if (!parsed.success) {
    const f = String(parsed.error.issues[0]?.path[0] ?? "");
    return {
      error: ({
        name_uz: "Mahsulot nomini yozing (kamida 2 ta harf).",
        categoryId: "Kategoriyani tanlang.",
        price: "Narxni faqat raqam bilan yozing, masalan 450000.",
        disc: "Chegirma 0 dan 90 gacha boʻlgan son boʻlishi kerak.",
      } as Record<string, string>)[f] ?? "Maydonlarni tekshiring.",
    };
  }
  const d = parsed.data;
  const base = Number(d.price);
  const disc = Number(d.disc || 0);
  if (base <= 0) return { error: "Narx noldan katta boʻlishi kerak." };
  if (disc > 90) return { error: "Chegirma 90% dan oshmasin." };
  const finalPrice = disc > 0 ? Math.max(100, Math.round((base * (100 - disc)) / 100 / 100) * 100) : base;
  const active = form.get("active") === "on";

  let stock: z.infer<typeof stockSchema>;
  let order: z.infer<typeof orderSchema>;
  try {
    stock = stockSchema.parse(JSON.parse(String(form.get("stock") ?? "[]")));
    order = orderSchema.parse(JSON.parse(String(form.get("imageOrder") ?? "[]")));
  } catch {
    return { error: "Formadagi maʼlumotlar notoʻgʻri. Sahifani yangilab qayta urinib koʻring." };
  }
  const colorIds = form.getAll("colorIds").map(String).filter(Boolean);
  if (colorIds.length === 0) return { error: "Kamida bitta rangni tanlang." };
  stock = stock.filter((s) => colorIds.includes(s.colorId));
  if (active && !stock.some((s) => s.stock > 0)) return { error: "Sotuvga chiqarish uchun kamida bitta oʻlcham sonini yozing." };

  const files = form.getAll("newImages").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 12) return { error: "Bir martada 12 tadan koʻp rasm yuklab boʻlmaydi." };
  if (active && order.length === 0) return { error: "Kamida bitta rasm qoʻshing." };

  const txt = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const names = { uz: d.name_uz, ru: txt("name_ru", 120) || d.name_uz, en: txt("name_en", 120) || d.name_uz };
  const descUz = txt("desc_uz", 4000);
  const descs = { uz: descUz, ru: txt("desc_ru", 4000) || descUz, en: txt("desc_en", 4000) || descUz };
  const material = txt("material", 300) || null;
  const care = txt("care", 300) || null;
  const collectionId = txt("collectionId", 40);

  const existing = d.id ? await prisma.product.findUnique({ where: { id: d.id }, select: { id: true, sku: true, slug: true, publishedAt: true } }) : null;
  if (d.id && !existing) return { error: "Mahsulot topilmadi." };
  let sku = existing?.sku ?? "";
  if (!sku) {
    for (let i = 0; i < 5 && !sku; i++) {
      const candidate = `FB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      if (!(await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } }))) sku = candidate;
    }
    if (!sku) return { error: "Artikul yaratib boʻlmadi, qayta urinib koʻring." };
  }
  const slug = existing?.slug ?? `${slugify(names.en) || slugify(names.uz) || "mahsulot"}-${sku.toLowerCase()}`;

  // Сначала сохраняем фото (вне транзакции: sharp и запись байтов могут занять время)
  const stored: { storageKey: string; width: number; height: number }[] = [];
  for (const f of files) {
    try {
      stored.push(await storeImage(f));
    } catch (e) {
      for (const s of stored) await deleteStoredImage(s.storageKey);
      const code = e instanceof UploadError ? e.code : "ERROR";
      return { error: `Rasm yuklanmadi (${f.name}): ${({ TOO_LARGE: "12 MB dan katta", NOT_IMAGE: "rasm emas", UNSUPPORTED: "format qoʻllab-quvvatlanmaydi", EMPTY: "boʻsh fayl" } as Record<string, string>)[code] ?? "xato"}.` };
    }
  }

  const [colors, sizes] = await Promise.all([prisma.color.findMany(), prisma.size.findMany()]);
  const colorById = new Map(colors.map((c) => [c.id, c]));
  const sizeById = new Map(sizes.map((s) => [s.id, s]));
  let removedKeys: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        tryOnPrompt: txt("tryOnPrompt", 600) || null,
        sku,
        slug,
        gender: d.gender,
        categoryId: d.categoryId,
        price: String(finalPrice),
        compareAtPrice: disc > 0 ? String(base) : null,
        status: active ? ("ACTIVE" as const) : ("DRAFT" as const),
        isNew: form.get("isNew") === "on",
        isFeatured: form.get("isFeatured") === "on",
        publishedAt: active ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
      };
      const p = existing ? await tx.product.update({ where: { id: existing.id }, data }) : await tx.product.create({ data: { ...data, brand: "FABIANO" } });

      for (const l of LOCALES) {
        const row = { name: names[l], description: descs[l], material, care };
        await tx.productTranslation.upsert({
          where: { productId_locale: { productId: p.id, locale: l } },
          create: { productId: p.id, locale: l, ...row },
          update: row,
        });
      }

      await tx.productCollection.deleteMany({ where: { productId: p.id } });
      if (collectionId) await tx.productCollection.create({ data: { productId: p.id, collectionId } });

      const keep: string[] = [];
      for (const v of stock) {
        const color = colorById.get(v.colorId);
        const size = sizeById.get(v.sizeId);
        if (!color || !size) continue;
        const vsku = `${sku}-${color.code}-${size.code}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");
        const variant = await tx.productVariant.upsert({
          where: { productId_colorId_sizeId: { productId: p.id, colorId: color.id, sizeId: size.id } },
          create: { productId: p.id, colorId: color.id, sizeId: size.id, sku: vsku },
          update: { isActive: true, sku: vsku },
        });
        keep.push(variant.id);
        const inv = await tx.inventory.findUnique({ where: { variantId: variant.id } });
        if (inv && v.stock < inv.reserved) throw new Error(`RESERVED:${color.code}/${size.code}:${inv.reserved}`);
        await tx.inventory.upsert({ where: { variantId: variant.id }, create: { variantId: variant.id, quantity: v.stock }, update: { quantity: v.stock } });
      }
      await tx.productVariant.updateMany({ where: { productId: p.id, id: { notIn: keep } }, data: { isActive: false } });

      // Фото: порядок из формы; старые, которых нет в списке, удаляем
      const oldImages = await tx.productImage.findMany({ where: { productId: p.id } });
      const keepOld = new Set(order.filter((o) => o.startsWith("old:")).map((o) => o.slice(4)));
      const removed = oldImages.filter((i) => !keepOld.has(i.id));
      if (removed.length) await tx.productImage.deleteMany({ where: { id: { in: removed.map((i) => i.id) } } });
      removedKeys = removed.map((i) => i.storageKey);
      const tryOnRef = String(form.get("tryOnImage") ?? "");
      for (const [pos, ref] of order.entries()) {
        const isTryOnAsset = ref === tryOnRef;
        if (ref.startsWith("old:")) {
          await tx.productImage.updateMany({ where: { id: ref.slice(4), productId: p.id }, data: { sortOrder: pos, isTryOnAsset } });
        } else {
          const s = stored[Number(ref.slice(4))];
          if (s) await tx.productImage.create({ data: { productId: p.id, storageKey: s.storageKey, width: s.width, height: s.height, sortOrder: pos, isTryOnAsset } });
        }
      }

      await tx.auditLog.create({ data: { actorId: admin.id, action: existing ? "product.update" : "product.create", entity: "Product", entityId: p.id } });
    });
  } catch (e) {
    for (const s of stored) await deleteStoredImage(s.storageKey);
    const m = e instanceof Error ? e.message : "";
    if (m.startsWith("RESERVED:")) {
      const [, combo, n] = m.split(":");
      return { error: `${combo} sonini ${n} dan kam qoʻyib boʻlmaydi — shuncha dona buyurtmalarda band.` };
    }
    console.error("[admin] saveProductEditor", e);
    return { error: "Mahsulotni saqlab boʻlmadi. Qayta urinib koʻring." };
  }
  for (const k of removedKeys) await deleteStoredImage(k);

  revalidatePath("/", "layout");
  redirect("/admin/products?saved=1");
}

export async function toggleProductVisibilityAction(form: FormData) {
  await requireAdmin("products:write");
  const id = String(form.get("id") ?? "");
  const p = await prisma.product.findUnique({ where: { id }, select: { status: true, publishedAt: true, _count: { select: { images: true, variants: true } } } });
  if (!p) return;
  const toActive = p.status !== "ACTIVE";
  if (toActive && (p._count.images === 0 || p._count.variants === 0)) redirect(`/admin/products/${id}?need=1`);
  await prisma.product.update({ where: { id }, data: { status: toActive ? "ACTIVE" : "DRAFT", publishedAt: toActive ? p.publishedAt ?? new Date() : p.publishedAt } });
  revalidatePath("/", "layout");
}

export async function deleteProductAction(form: FormData) {
  const admin = await requireAdmin("products:write");
  const id = String(form.get("id") ?? "");
  const images = await prisma.productImage.findMany({ where: { productId: id }, select: { storageKey: true } });
  const inOrders = await prisma.orderItem.count({ where: { productId: id } });
  if (inOrders > 0) {
    // Товар из истории заказов не удаляем — архивируем
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  } else {
    await prisma.product.delete({ where: { id } });
    for (const i of images) await deleteStoredImage(i.storageKey);
  }
  await prisma.auditLog.create({ data: { actorId: admin.id, action: inOrders ? "product.archive" : "product.delete", entity: "Product", entityId: id } });
  revalidatePath("/", "layout");
  redirect("/admin/products");
}
