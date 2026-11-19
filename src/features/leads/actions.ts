"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { capitalizeName, uzPhoneDigits, validatePersonName, validateUzMobile } from "@/lib/validate-contact";
import { isLocale } from "@/i18n/routing";

export type LeadValues = { firstName: string; lastName: string; phone: string; question: string };

export type LeadState =
  | { status: "idle" }
  | { status: "error"; field?: "firstName" | "lastName" | "phone"; code: string; values: LeadValues }
  | { status: "ok"; name: string; phone: string };

export async function submitLeadAction(_prev: LeadState, form: FormData): Promise<LeadState> {
  // honeypot
  if (String(form.get("website") ?? "")) return { status: "ok", name: "", phone: "" };

  const firstName = String(form.get("firstName") ?? "");
  const lastName = String(form.get("lastName") ?? "");
  const digits = uzPhoneDigits(String(form.get("phone") ?? ""));
  const question = String(form.get("question") ?? "").trim().slice(0, 500) || null;
  const productId = String(form.get("productId") ?? "").slice(0, 40) || null;
  const page = String(form.get("page") ?? "").slice(0, 200) || null;

  const values: LeadValues = { firstName, lastName, phone: digits, question: question ?? "" };
  const e1 = validatePersonName(firstName);
  if (e1) return { status: "error", field: "firstName", code: e1, values };
  const e2 = validatePersonName(lastName);
  if (e2) return { status: "error", field: "lastName", code: e2, values };
  const e3 = validateUzMobile(digits);
  if (e3) return { status: "error", field: "phone", code: e3, values };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`lead:${ip}`, 5, 3600).ok || !rateLimit(`lead:${digits}`, 3, 3600).ok) return { status: "error", code: "RATE_LIMITED", values };

  const locale = await getLocale();
  try {
    await prisma.lead.create({
      data: {
        firstName: capitalizeName(firstName),
        lastName: capitalizeName(lastName),
        phone: `+998${digits}`,
        question,
        productId,
        page,
        locale: isLocale(locale) ? locale : "uz",
      },
    });
  } catch (err) {
    console.error("[lead] create failed", err instanceof Error ? err.message : err);
    return { status: "error", code: "GENERIC", values };
  }
  return { status: "ok", name: capitalizeName(firstName), phone: digits };
}
