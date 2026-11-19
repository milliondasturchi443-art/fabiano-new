"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeUzPhone } from "@/lib/phone";
import { changeOrderStatus, StatusError } from "@/features/orders/status";
import type { OrderStatus } from "@/features/orders/order-number";
import { requireAdmin } from "./guard";
import type { FormState } from "./auth-actions";

const money = z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/);

// ── Заказы ──────────────────────────────────────────

export async function changeOrderStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("orders:write");
  const id = String(form.get("id") ?? "");
  const to = String(form.get("to") ?? "") as OrderStatus;
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  try {
    await changeOrderStatus(id, to, admin.id, note);
  } catch (e) {
    if (e instanceof StatusError) return { error: e.code === "NOT_FOUND" ? "Buyurtma topilmadi." : "Bunday holatga oʻtish mumkin emas." };
    console.error("[admin] status", e);
    return { error: "Holatni oʻzgartirib boʻlmadi." };
  }
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/", "layout");
  return { ok: "Holat yangilandi." };
}

/** Кнопки статусов в списке заказов (без формы состояния). */
export async function setOrderStatusAction(form: FormData) {
  const admin = await requireAdmin("orders:write");
  const id = String(form.get("id") ?? "");
  const to = String(form.get("to") ?? "") as OrderStatus;
  try {
    await changeOrderStatus(id, to, admin.id, "");
  } catch (e) {
    if (!(e instanceof StatusError)) console.error("[admin] status", e);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/** День доставки, который увидит покупатель в чеке. Пустое значение — снять дату. */
export async function setDeliveryDateAction(form: FormData) {
  const admin = await requireAdmin("orders:write");
  const id = String(form.get("id") ?? "");
  const raw = String(form.get("deliveryDate") ?? "").trim();
  if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
  const date = raw ? new Date(`${raw}T00:00:00Z`) : null;
  if (date && Number.isNaN(date.getTime())) return;
  await prisma.order.update({ where: { id }, data: { deliveryDate: date } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "order.delivery_date", entity: "Order", entityId: id, diff: { deliveryDate: raw || null } } });
  revalidatePath("/admin", "layout");
}

/** Цена доставки по договорённости: админ вписывает её в заказ — меняется итог в чеке и сумма к оплате. */
export async function setOrderShippingAction(form: FormData) {
  const admin = await requireAdmin("orders:write");
  const id = String(form.get("id") ?? "");
  const raw = String(form.get("shipping") ?? "").replace(/\s/g, "");
  if (!/^\d{1,9}$/.test(raw)) return;
  const o = await prisma.order.findUnique({ where: { id }, select: { status: true, subtotal: true, discountTotal: true, deliverySnapshot: true } });
  if (!o || ["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status)) return;
  const shipping = Number(raw);
  const grand = Math.max(0, Number(o.subtotal) - Number(o.discountTotal) + shipping);
  const snap = (o.deliverySnapshot ?? {}) as Record<string, unknown>;
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { shippingTotal: String(shipping), grandTotal: String(grand), deliverySnapshot: { ...snap, price: String(shipping) } } }),
    prisma.payment.updateMany({ where: { orderId: id, status: "PENDING" }, data: { amount: String(grand) } }),
    prisma.auditLog.create({ data: { actorId: admin.id, action: "order.shipping_price", entity: "Order", entityId: id, diff: { shipping } } }),
  ]);
  revalidatePath("/admin", "layout");
}

// ── Промокоды ───────────────────────────────────────

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,40}$/),
  type: z.enum(["PERCENT", "FIXED"]),
  value: money,
  minOrderAmount: money.optional().or(z.literal("")),
  maxDiscount: money.optional().or(z.literal("")),
  usageLimit: z.string().regex(/^\d{0,7}$/),
  perUserLimit: z.string().regex(/^\d{0,4}$/),
  expiresAt: z.string().optional(),
});

export async function createCouponAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("coupons:write");
  const p = couponSchema.safeParse(Object.fromEntries(["code", "type", "value", "minOrderAmount", "maxDiscount", "usageLimit", "perUserLimit", "expiresAt"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { error: "Maydonlarni tekshiring: kod (lotin harflari/raqamlar), qiymat raqam bilan." };
  const d = p.data;
  if (Number(d.value) <= 0) return { error: "Chegirma qiymati noldan katta boʻlishi kerak." };
  if (d.type === "PERCENT" && Number(d.value) > 100) return { error: "Foiz 100 dan katta boʻlishi mumkin emas." };
  if (await prisma.coupon.findUnique({ where: { code: d.code } })) return { error: "Bunday promokod allaqachon mavjud." };
  const expires = d.expiresAt ? new Date(`${d.expiresAt}T23:59:59+05:00`) : null;
  if (expires && Number.isNaN(expires.getTime())) return { error: "Tugash sanasi notoʻgʻri." };
  await prisma.coupon.create({
    data: {
      code: d.code,
      type: d.type,
      value: d.value,
      minOrderAmount: d.minOrderAmount || null,
      maxDiscount: d.maxDiscount || null,
      usageLimit: d.usageLimit ? Number(d.usageLimit) : null,
      perUserLimit: d.perUserLimit ? Number(d.perUserLimit) : null,
      expiresAt: expires,
    },
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "coupon.create", entity: "Coupon", entityId: d.code } });
  revalidatePath("/admin/coupons");
  return { ok: `Promokod ${d.code} yaratildi.` };
}

export async function toggleCouponAction(form: FormData) {
  await requireAdmin("coupons:write");
  const id = String(form.get("id") ?? "");
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (c) await prisma.coupon.update({ where: { id }, data: { isActive: !c.isActive } });
  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(form: FormData) {
  await requireAdmin("coupons:write");
  const id = String(form.get("id") ?? "");
  const used = await prisma.couponUsage.count({ where: { couponId: id } });
  if (used > 0) await prisma.coupon.update({ where: { id }, data: { isActive: false } });
  else await prisma.coupon.deleteMany({ where: { id } });
  revalidatePath("/admin/coupons");
}

// ── Настройки магазина ──────────────────────────────

export async function saveSettingsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("*");
  const phoneRaw = String(form.get("contactPhone") ?? "").trim();
  const phone = phoneRaw ? normalizeUzPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Telefon: +998 XX XXX XX XX formatida." };
  const email = String(form.get("contactEmail") ?? "").trim();
  if (email && !z.string().email().safeParse(email).success) return { error: "Email notoʻgʻri." };
  const url = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s && /^https:\/\/[^\s]+$/.test(s) ? s : s ? null : "";
  };
  const instagram = url(form.get("instagram"));
  const telegram = url(form.get("telegram"));
  if (instagram === null || telegram === null) return { error: "Ijtimoiy tarmoq havolalari https:// bilan boshlanishi kerak" };
  const locales = form.getAll("enabledLocales").map(String).filter((l): l is "uz" | "ru" | "en" => ["uz", "ru", "en"].includes(l));
  if (!locales.includes("uz")) locales.unshift("uz"); // основной язык выключить нельзя

  await prisma.storeSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  await prisma.storeSettings.update({
    where: { id: "default" },
    data: {
      contactPhone: phone,
      contactEmail: email || null,
      socials: { instagram: instagram || undefined, telegram: telegram || undefined },
      enabledLocales: locales,
    },
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "settings.update", entity: "StoreSettings", entityId: "default" } });
  revalidatePath("/", "layout");
  return { ok: "Sozlamalar saqlandi." };
}

export async function togglePaymentAction(form: FormData) {
  await requireAdmin("*");
  const provider = String(form.get("provider") ?? "");
  if (provider !== "CASH_ON_DELIVERY") return; // Payme/Click включаются только после настройки credentials (PHASE 6)
  const cfg = await prisma.paymentMethodConfig.upsert({ where: { provider }, create: { provider, isEnabled: false }, update: {} });
  await prisma.paymentMethodConfig.update({ where: { provider }, data: { isEnabled: !cfg.isEnabled } });
  revalidatePath("/admin/settings");
}

export async function toggleTryOnAction() {
  await requireAdmin("*");
  if (!process.env.DECART_API_KEY) return; // без ключа Decart включать нечего
  const s = await prisma.storeSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  await prisma.storeSettings.update({ where: { id: "default" }, data: { tryOnEnabled: !s.tryOnEnabled } });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

const deliverySchema = z.object({
  type: z.enum(["COURIER", "PICKUP", "OTHER"]),
  name_uz: z.string().trim().min(2).max(80),
  name_ru: z.string().trim().min(2).max(80),
  name_en: z.string().trim().max(80),
  price: money,
  freeFrom: money.optional().or(z.literal("")),
  etaDays: z.string().trim().max(10),
});

export async function createDeliveryAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin("*");
  const p = deliverySchema.safeParse(Object.fromEntries(["type", "name_uz", "name_ru", "name_en", "price", "freeFrom", "etaDays"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { error: "Nomini (UZ va RU) va narxini raqam bilan kiriting (0 — bepul)." };
  const d = p.data;
  const count = await prisma.deliveryMethod.count();
  await prisma.deliveryMethod.create({
    data: {
      type: d.type,
      names: { uz: d.name_uz, ru: d.name_ru, en: d.name_en || d.name_ru },
      price: d.price,
      freeFrom: d.freeFrom || null,
      etaDays: d.etaDays || null,
      sortOrder: count,
    },
  });
  revalidatePath("/admin/settings");
  return { ok: "Yetkazib berish usuli qoʻshildi." };
}

export async function toggleDeliveryAction(form: FormData) {
  await requireAdmin("*");
  const id = String(form.get("id") ?? "");
  const m = await prisma.deliveryMethod.findUnique({ where: { id } });
  if (m) await prisma.deliveryMethod.update({ where: { id }, data: { isEnabled: !m.isEnabled } });
  revalidatePath("/admin/settings");
}

export async function deleteDeliveryAction(form: FormData) {
  await requireAdmin("*");
  const id = String(form.get("id") ?? "");
  const used = await prisma.order.count({ where: { deliveryMethodId: id } });
  if (used) await prisma.deliveryMethod.update({ where: { id }, data: { isEnabled: false } });
  else await prisma.deliveryMethod.deleteMany({ where: { id } });
  revalidatePath("/admin/settings");
  redirect("/admin/settings#delivery");
}

// ── Murojaatlar (заявки) ─────────────────────────────

export async function toggleLeadAction(form: FormData) {
  await requireAdmin("orders:read");
  const id = String(form.get("id") ?? "");
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (lead) {
    const done = lead.status === "NEW";
    await prisma.lead.update({ where: { id }, data: { status: done ? "DONE" : "NEW", handledAt: done ? new Date() : null } });
  }
  revalidatePath("/admin", "layout");
}

export async function deleteLeadAction(form: FormData) {
  await requireAdmin("*");
  await prisma.lead.deleteMany({ where: { id: String(form.get("id") ?? "") } });
  revalidatePath("/admin", "layout");
}

// ── Matnlar: e'lon va «Biz haqimizda» ─────────────────

export async function saveTextsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("*");
  const pick = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v ? v.slice(0, k.startsWith("about") ? 2000 : 160) : undefined;
  };
  const current = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  const prev = (current?.homeContent ?? {}) as Record<string, unknown>;
  const homeContent = {
    ...prev,
    announce: { uz: pick("announce_uz"), ru: pick("announce_ru"), en: pick("announce_en") },
    about: { uz: pick("about_uz"), ru: pick("about_ru"), en: pick("about_en") },
  };
  await prisma.storeSettings.upsert({ where: { id: "default" }, create: { id: "default", homeContent }, update: { homeContent } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "settings.texts", entity: "StoreSettings", entityId: "default" } });
  revalidatePath("/", "layout");
  return { ok: "Matnlar saqlandi." };
}
