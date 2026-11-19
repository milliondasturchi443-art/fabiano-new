"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeUzPhone } from "@/lib/phone";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./sessions";
import { getSessionUser } from "./session";
import { mergeGuestCartIntoUser } from "@/services/cart";
import { isLocale } from "@/i18n/routing";

export type AuthState = { error?: string; fields?: Record<string, string>; values?: Record<string, string> } | null;

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Только относительные пути своего сайта — защита от open redirect. */
function safeNext(next: unknown, fallback: string): string {
  return typeof next === "string" && /^\/(?!\/)[\w\-/?=&.%]*$/.test(next) ? next : fallback;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = String(form.get("locale") ?? "uz");
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  const keep = { email: String(form.get("email") ?? "").slice(0, 254) };
  if (!parsed.success) return { error: "INVALID_INPUT", values: keep };
  const { email, password } = parsed.data;

  const addr = await ip();
  if (!rateLimit(`login:${addr}`, 10, 600).ok || !rateLimit(`login:${email}`, 5, 600).ok) return { error: "RATE_LIMITED", values: keep };

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(user?.passwordHash, password);
  if (!user || !ok || !user.isActive) return { error: "INVALID_CREDENTIALS", values: keep };

  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  redirect(safeNext(form.get("next"), `/${isLocale(locale) ? locale : "uz"}/account`));
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(200),
});

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = String(form.get("locale") ?? "uz");
  const parsed = registerSchema.safeParse(Object.fromEntries(["firstName", "lastName", "email", "phone", "password"].map((k) => [k, form.get(k) ?? ""])));
  const keep = Object.fromEntries(["firstName", "lastName", "email", "phone"].map((k) => [k, String(form.get(k) ?? "").slice(0, 254)]));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: field === "password" ? "PASSWORD_SHORT" : "INVALID_INPUT", fields: { field }, values: keep };
  }
  const d = parsed.data;
  const phone = d.phone ? normalizeUzPhone(d.phone) : null;
  if (d.phone && !phone) return { error: "INVALID_PHONE", values: keep };

  if (!rateLimit(`register:${await ip()}`, 5, 3600).ok) return { error: "RATE_LIMITED", values: keep };

  const exists = await prisma.user.findFirst({ where: { OR: [{ email: d.email }, ...(phone ? [{ phone }] : [])] }, select: { id: true } });
  if (exists) return { error: "ACCOUNT_EXISTS", values: keep };

  const role = await prisma.role.findUnique({ where: { name: "customer" } });
  const user = await prisma.user.create({
    data: {
      email: d.email,
      phone,
      firstName: d.firstName,
      lastName: d.lastName,
      passwordHash: await hashPassword(d.password),
      locale: isLocale(locale) ? locale : "uz",
      ...(role ? { roles: { create: { roleId: role.id } } } : {}),
    },
  });
  await createSession(user.id);
  await mergeGuestCartIntoUser(user.id);
  redirect(safeNext(form.get("next"), `/${isLocale(locale) ? locale : "uz"}/account`));
}

export async function logoutAction(form: FormData) {
  await destroySession();
  const locale = String(form.get("locale") ?? "uz");
  redirect(`/${isLocale(locale) ? locale : "uz"}`);
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateProfileAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await getSessionUser();
  if (!user) return { error: "UNAUTHORIZED" };
  const parsed = profileSchema.safeParse({ firstName: form.get("firstName"), lastName: form.get("lastName"), phone: form.get("phone") ?? "" });
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const phone = parsed.data.phone ? normalizeUzPhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { error: "INVALID_PHONE" };
  if (phone) {
    const taken = await prisma.user.findFirst({ where: { phone, NOT: { id: user.id } }, select: { id: true } });
    if (taken) return { error: "PHONE_TAKEN" };
  }
  await prisma.user.update({ where: { id: user.id }, data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone } });
  return { fields: { saved: "1" } };
}
