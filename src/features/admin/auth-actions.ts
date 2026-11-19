"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import { createSession, destroySession, revokeOtherSessions } from "@/features/auth/sessions";
import { requireAdmin } from "./guard";

export type FormState = { error?: string; ok?: string } | null;

export async function adminLoginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(200) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Login va parolni kiriting." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`admin-login:${ip}`, 8, 900).ok || !rateLimit(`admin-login:${parsed.data.email}`, 5, 900).ok) {
    return { error: "Juda koʻp urinish. 15 daqiqa kuting." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { roles: { include: { role: true } } },
  });
  const ok = await verifyPassword(user?.passwordHash, parsed.data.password);
  const perms = new Set(user?.roles.flatMap((r) => r.role.permissions) ?? []);
  if (!user || !ok || !user.isActive || !(perms.has("*") || perms.has("admin:access"))) {
    return { error: "Login yoki parol notoʻgʻri." };
  }

  await createSession(user.id);
  await prisma.auditLog.create({ data: { actorId: user.id, action: "admin.login", entity: "User", entityId: user.id, ipAddress: ip } });
  redirect("/admin/orders");
}

export async function adminLogoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  if (next.length < 12) return { error: "Yangi parol — kamida 12 belgi." };
  if (next !== repeat) return { error: "Parollar mos kelmadi." };
  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!(await verifyPassword(user?.passwordHash, current))) return { error: "Joriy parol notoʻgʻri." };
  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(next) } });
  await revokeOtherSessions(admin.id);
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "admin.password_change", entity: "User", entityId: admin.id } });
  return { ok: "Parol oʻzgartirildi. Boshqa seanslar yakunlandi." };
}
