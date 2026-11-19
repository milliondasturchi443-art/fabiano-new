"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeUzPhone } from "@/lib/phone";
import { hashPassword } from "@/features/auth/password";
import { INFO_PAGES, SOCIALS, SOCIAL_LABEL, TEXT_FIELDS, socialUrl, type SiteTexts } from "@/lib/site-content";
import { requireAdmin } from "./guard";
import type { FormState } from "./auth-actions";

const LANGS = ["uz", "ru", "en"] as const;
type Lang = (typeof LANGS)[number];

async function settingsRow() {
  return prisma.storeSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
}

// ── Sayt matnlari ───────────────────────────────────

export async function saveSiteTextsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("*");
  const lang = String(form.get("lang") ?? "uz") as Lang;
  if (!LANGS.includes(lang)) return { error: "Til notoʻgʻri." };

  const texts: SiteTexts = {};
  for (const f of TEXT_FIELDS) {
    const v = String(form.get(f.key) ?? "").trim().slice(0, f.max);
    if (v) texts[f.key] = v;
  }
  const s = await settingsRow();
  const prev = (s.homeContent ?? {}) as Record<string, unknown> & {
    texts?: Partial<Record<Lang, SiteTexts>>;
    announce?: Partial<Record<Lang, string>>;
    about?: Partial<Record<Lang, string>>;
  };
  const homeContent = {
    ...prev,
    texts: { ...(prev.texts ?? {}), [lang]: texts },
    // старые поля этого языка больше не используются — иначе очищенный текст «вернётся»
    announce: { ...(prev.announce ?? {}), [lang]: undefined },
    about: { ...(prev.about ?? {}), [lang]: undefined },
  };
  await prisma.storeSettings.update({ where: { id: "default" }, data: { homeContent: JSON.parse(JSON.stringify(homeContent)) } });

  for (const p of INFO_PAGES) {
    const body = String(form.get(`page_${p.slug}`) ?? "").trim().slice(0, 20000);
    const existing = await prisma.staticPage.findUnique({ where: { slug_locale: { slug: p.slug, locale: lang } } });
    if (!body) continue; // пустое поле не стирает страницу
    if (existing) {
      if (existing.body !== body) await prisma.staticPage.update({ where: { id: existing.id }, data: { body } });
    } else {
      await prisma.staticPage.create({ data: { slug: p.slug, locale: lang, title: p.title[lang], body } });
    }
  }

  await prisma.auditLog.create({ data: { actorId: admin.id, action: "settings.texts", entity: "StoreSettings", entityId: "default" } });
  revalidatePath("/", "layout");
  return { ok: "Saqlandi — saytda darhol koʻrinadi." };
}

// ── Aloqa va tarmoqlar ──────────────────────────────

export async function saveContactsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("*");
  const str = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const phone = (k: string) => {
    const raw = str(k, 30);
    if (!raw) return "";
    const d = raw.replace(/\D/g, "");
    return normalizeUzPhone(d.length === 9 ? `+998${d}` : raw) ?? null;
  };
  const p1 = phone("phone");
  const p2 = phone("phone2");
  if (p1 === null) return { error: "Asosiy telefon: 9 ta raqam, masalan 90 123 45 67." };
  if (p2 === null) return { error: "Qoʻshimcha telefon: 9 ta raqam, masalan 90 123 45 67." };
  const email = str("email", 254);
  if (email && !z.string().email().safeParse(email).success) return { error: "Email notoʻgʻri." };

  const socials: Record<string, string> = {};
  for (const k of SOCIALS) {
    const raw = str(k, 300);
    if (!raw) continue;
    const url = socialUrl(k, raw);
    if (!url) return { error: `${SOCIAL_LABEL[k]}: @nom yoki toʻliq havola yozing.` };
    socials[k] = url;
  }

  await settingsRow();
  await prisma.storeSettings.update({
    where: { id: "default" },
    data: {
      contactPhone: p1 || null,
      contactEmail: email || null,
      address: { text: str("address", 300) || undefined, hours: str("hours", 120) || undefined, phone2: p2 || undefined },
      socials,
    },
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "settings.contacts", entity: "StoreSettings", entityId: "default" } });
  revalidatePath("/", "layout");
  return { ok: "Saqlandi — saytning pastki qismida va «Aloqa» sahifasida koʻrinadi." };
}

// ── Toʻlov va yetkazish ─────────────────────────────

export async function savePaymentDeliveryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("*");
  const on = (k: string) => form.get(k) === "on";
  const num = (k: string) => String(form.get(k) ?? "").replace(/\s/g, "");
  const courierPrice = num("courierPrice");
  const freeFrom = num("freeFrom");
  if (courierPrice && !/^\d{1,9}$/.test(courierPrice)) return { error: "Kuryer narxini raqam bilan yozing, masalan 30000." };
  if (freeFrom && !/^\d{1,10}$/.test(freeFrom)) return { error: "«Bepul yetkazish» summasini raqam bilan yozing." };
  const pickupAddr = String(form.get("pickupAddr") ?? "").trim().slice(0, 300);
  if (on("pickup") && !pickupAddr) return { error: "Olib ketish punkti manzilini yozing." };
  const eta = String(form.get("etaDays") ?? "").trim().slice(0, 10);

  await prisma.paymentMethodConfig.upsert({
    where: { provider: "CASH_ON_DELIVERY" },
    create: { provider: "CASH_ON_DELIVERY", isEnabled: on("cod") },
    update: { isEnabled: on("cod") },
  });

  const courier = await prisma.deliveryMethod.findFirst({ where: { type: "COURIER" }, orderBy: { sortOrder: "asc" } });
  const courierData = {
    price: courierPrice || "0",
    freeFrom: freeFrom || null,
    etaDays: eta || null,
    isEnabled: on("courier"),
  };
  if (courier) await prisma.deliveryMethod.update({ where: { id: courier.id }, data: courierData });
  else await prisma.deliveryMethod.create({ data: { type: "COURIER", names: { uz: "Kuryer orqali", ru: "Курьером", en: "Courier" }, sortOrder: 0, ...courierData } });

  const pickup = await prisma.deliveryMethod.findFirst({ where: { type: "PICKUP" }, orderBy: { sortOrder: "asc" } });
  if (pickup || on("pickup")) {
    const pickupData = { price: "0", isEnabled: on("pickup"), pickupAddress: pickupAddr ? { uz: pickupAddr, ru: pickupAddr, en: pickupAddr } : undefined };
    if (pickup) await prisma.deliveryMethod.update({ where: { id: pickup.id }, data: pickupData });
    else await prisma.deliveryMethod.create({ data: { type: "PICKUP", names: { uz: "Doʻkondan olib ketish", ru: "Самовывоз", en: "Store pickup" }, sortOrder: 1, ...pickupData } });
  }

  await prisma.auditLog.create({ data: { actorId: admin.id, action: "settings.payment_delivery", entity: "StoreSettings", entityId: "default" } });
  revalidatePath("/", "layout");
  return { ok: "Saqlandi." };
}

// ── Adminlar ────────────────────────────────────────

export async function createAdminAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("*");
  const p = z
    .object({
      name: z.string().trim().min(2).max(60),
      email: z.string().trim().toLowerCase().email().max(254),
      password: z.string().min(10).max(200),
      role: z.enum(["admin", "manager"]),
    })
    .safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") || "admin" });
  if (!p.success) {
    const f = String(p.error.issues[0]?.path[0] ?? "");
    return { error: ({ name: "Ismni yozing.", email: "Login sifatida email yozing.", password: "Parol kamida 10 ta belgi boʻlsin." } as Record<string, string>)[f] ?? "Maydonlarni tekshiring." };
  }
  if (form.get("password") !== form.get("password2")) return { error: "Parollar mos kelmadi." };
  const d = p.data;
  const role = await prisma.role.findUnique({ where: { name: d.role } });
  if (!role) return { error: "Rol topilmadi." };
  const existing = await prisma.user.findUnique({ where: { email: d.email }, include: { roles: { include: { role: true } } } });
  if (existing?.roles.some((r) => r.role.permissions.includes("admin:access") || r.role.permissions.includes("*"))) return { error: "Bu login bilan admin allaqachon bor." };

  const passwordHash = await hashPassword(d.password);
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, firstName: d.name, isActive: true } })
    : await prisma.user.create({ data: { email: d.email, passwordHash, firstName: d.name } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "admin.create", entity: "User", entityId: user.id } });
  revalidatePath("/admin/admins");
  return { ok: `${d.name} qoʻshildi. Login: ${d.email}` };
}

export async function removeAdminAction(form: FormData) {
  const admin = await requireAdmin("*");
  const id = String(form.get("id") ?? "");
  if (id === admin.id) return; // себя удалить нельзя
  const staffRoles = await prisma.role.findMany({ where: { name: { in: ["admin", "manager", "content_editor"] } }, select: { id: true } });
  await prisma.userRole.deleteMany({ where: { userId: id, roleId: { in: staffRoles.map((r) => r.id) } } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "admin.remove", entity: "User", entityId: id } });
  revalidatePath("/admin/admins");
}

export async function saveProfileNameAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (name.length < 2) return { error: "Ismni yozing." };
  await prisma.user.update({ where: { id: admin.id }, data: { firstName: name } });
  revalidatePath("/admin", "layout");
  return { ok: "Saqlandi." };
}
