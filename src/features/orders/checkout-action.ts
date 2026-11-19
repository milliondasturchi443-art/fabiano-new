"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { capitalizeName, uzPhoneDigits } from "@/lib/validate-contact";
import { validateCheckout, type FieldErrors } from "./checkout-validate";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/features/auth/session";
import { resolveCart } from "@/services/cart";
import { isLocale } from "@/i18n/routing";
import { CheckoutError, placeOrder } from "./place-order";

export type CheckoutState = { error?: string; fields?: FieldErrors; values?: Record<string, string> } | null;

const schema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(9).max(30),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
  region: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(120),
  street: z.string().trim().min(2).max(160),
  house: z.string().trim().min(1).max(30),
  apartment: z.string().trim().max(30).optional().or(z.literal("")),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
  deliveryMethodId: z.string().min(1).max(40),
  paymentProvider: z.literal("CASH_ON_DELIVERY"),
});

export async function checkoutAction(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const localeRaw = String(form.get("locale") ?? "uz");
  const locale = isLocale(localeRaw) ? localeRaw : "uz";

  const values = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("$") && k !== "locale").map(([k, v]) => [k, String(v).slice(0, 500)]));
  const fields = validateCheckout(values);
  if (Object.keys(fields).length) return { error: "CHECK_FIELDS", fields, values };
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    if (field === "deliveryMethodId") return { error: "DELIVERY_INVALID", values };
    if (field === "paymentProvider") return { error: "PAYMENT_INVALID", values };
    return { error: "INVALID_INPUT", values };
  }
  const d = parsed.data;
  const phone = `+998${uzPhoneDigits(d.phone)}`;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`checkout:${ip}`, 10, 600).ok) return { error: "RATE_LIMITED", values };

  const [user, cart] = await Promise.all([getSessionUser(), resolveCart(false)]);
  if (!cart) return { error: "EMPTY_CART", values };

  let result: { number: string; guestToken: string | null };
  try {
    result = await placeOrder({
      cartId: cart.id,
      userId: user?.id ?? null,
      locale,
      firstName: capitalizeName(d.firstName),
      lastName: capitalizeName(d.lastName),
      phone,
      email: d.email || user?.email || null,
      address: { region: d.region, district: d.district, street: d.street, house: d.house, apartment: d.apartment || null },
      comment: d.comment || null,
      deliveryMethodId: d.deliveryMethodId,
      paymentProvider: d.paymentProvider,
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.code, values };
    console.error("[checkout]", e);
    return { error: "GENERIC", values };
  }

  revalidatePath(`/${locale}`, "layout"); // остатки на витрине изменились
  const q = new URLSearchParams({ n: result.number, ...(result.guestToken ? { t: result.guestToken } : {}) });
  redirect(`/${locale}/checkout/success?${q.toString()}`);
}
