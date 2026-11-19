"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { checkoutAction } from "@/features/orders/checkout-action";
import { formatMoney, fromMinor, toMinor } from "@/lib/money";
import type { CartView } from "@/services/cart";
import type { AppLocale } from "@/i18n/routing";

export interface DeliveryOption {
  id: string;
  type: "COURIER" | "PICKUP" | "OTHER";
  name: string;
  price: string;
  freeFrom: string | null;
  etaDays: string | null;
  regions: string[];
}

export function CheckoutForm({
  cart, deliveries, codEnabled, prefill,
}: {
  cart: CartView;
  deliveries: DeliveryOption[];
  codEnabled: boolean;
  prefill: { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null };
}) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const ta = useTranslations("account");
  const locale = useLocale() as AppLocale;
  const [state, action, pending] = useActionState(checkoutAction, null);
  const regions = t.raw("regions") as string[];
  const v = state?.values ?? {};
  const [region, setRegion] = useState("");
  const [deliveryId, setDeliveryId] = useState(deliveries[0]?.id ?? "");

  const available = deliveries.filter((d) => d.regions.length === 0 || !region || d.regions.includes(region));
  const delivery = available.find((d) => d.id === deliveryId) ?? available[0];
  const money = (v: string) => formatMoney(v, locale);

  const { shipping, total } = useMemo(() => {
    const afterDiscount = toMinor(cart.totals.subtotal) - toMinor(cart.totals.discount);
    const ship = !delivery ? 0n : delivery.freeFrom && afterDiscount >= toMinor(delivery.freeFrom) ? 0n : toMinor(delivery.price);
    return { shipping: fromMinor(ship), total: fromMinor(afterDiscount + ship) };
  }, [cart.totals, delivery]);

  const err = state?.error ? (t.has(`errors.${state.error}`) ? t(`errors.${state.error}` as "errors.GENERIC") : t("errors.GENERIC")) : null;
  const input = "field mt-1.5";
  const label = "text-xs font-medium text-muted";

  return (
    <form action={action} className="grid gap-12 pb-28 lg:grid-cols-[1fr_24rem] lg:gap-16 lg:pb-0">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-12">
        <fieldset>
          <legend className="text-3xl">{t("contact")}</legend>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label><span className={label}>{ta("firstName")} *</span><input name="firstName" required autoComplete="given-name" defaultValue={v.firstName ?? prefill.firstName ?? ""} className={input} /></label>
            <label><span className={label}>{ta("lastName")} *</span><input name="lastName" required autoComplete="family-name" defaultValue={v.lastName ?? prefill.lastName ?? ""} className={input} /></label>
            <label><span className={label}>{ta("phone")} *</span><input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="+998 90 123 45 67" defaultValue={v.phone ?? prefill.phone ?? "+998 "} className={`${input} price`} /></label>
            <label><span className={label}>{ta("email")} ({ta("optional")})</span><input name="email" type="email" inputMode="email" autoComplete="email" defaultValue={v.email ?? prefill.email ?? ""} className={input} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-3xl">{t("shipping")}</legend>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={label}>{t("region")} *</span>
              <select name="region" required value={region} onChange={(e) => setRegion(e.target.value)} className={input}>
                <option value="" disabled>{t("selectRegion")}</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2"><span className={label}>{t("district")} *</span><input name="district" required autoComplete="address-level2" defaultValue={v.district} className={input} /></label>
            <label className="sm:col-span-2"><span className={label}>{t("street")} *</span><input name="street" required autoComplete="address-line1" defaultValue={v.street} className={input} /></label>
            <label><span className={label}>{t("house")} *</span><input name="house" required defaultValue={v.house} className={input} /></label>
            <label><span className={label}>{t("apartment")}</span><input name="apartment" defaultValue={v.apartment} className={input} /></label>
            <label className="sm:col-span-2">
              <span className={label}>{t("comment")}</span>
              <textarea name="comment" defaultValue={v.comment} rows={3} maxLength={500} placeholder={t("commentPlaceholder")} className="field mt-1.5" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-3xl">{t("deliveryMethod")}</legend>
          <div className="mt-6 space-y-3">
            {available.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-4 border border-line bg-paper p-4 transition-[border-color,box-shadow] duration-200 hover:border-[#d8c4b2] has-[:checked]:border-gold has-[:checked]:shadow-[0_0_0_3px_rgb(92_20_34/0.1)]">
                <input type="radio" name="deliveryMethodId" value={d.id} checked={delivery?.id === d.id} onChange={() => setDeliveryId(d.id)} className="h-4 w-4 accent-[var(--color-gold)]" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{d.name}</span>
                  {d.etaDays && <span className="block text-xs text-muted">{t("eta", { days: d.etaDays })}</span>}
                </span>
                <span className="price text-sm">{Number(d.price) === 0 ? t("free") : money(d.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-3xl">{t("paymentMethod")}</legend>
          <div className="mt-6 space-y-3">
            {codEnabled && (
              <label className="flex cursor-pointer items-center gap-4 border border-line bg-paper p-4 transition-[border-color,box-shadow] duration-200 hover:border-[#d8c4b2] has-[:checked]:border-gold has-[:checked]:shadow-[0_0_0_3px_rgb(92_20_34/0.1)]">
                <input type="radio" name="paymentProvider" value="CASH_ON_DELIVERY" defaultChecked className="h-4 w-4 accent-[var(--color-gold)]" />
                <span>
                  <span className="block text-sm font-medium">{t("cod")}</span>
                  <span className="block text-xs text-muted">{t("codHint")}</span>
                </span>
              </label>
            )}
          </div>
        </fieldset>
      </div>

      <aside className="card h-fit p-6 md:p-8 lg:sticky lg:top-28">
        <h2 className="eyebrow font-sans">{t("summary")}</h2>
        <ul className="mt-6 space-y-4">
          {cart.lines.map((l) => (
            <li key={l.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-sm">
              <div className="relative aspect-[3/4] overflow-hidden bg-surface">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="price absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1 text-[0.625rem] text-cream">{l.quantity}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate">{l.name}</p>
                <p className="text-xs text-muted">{l.color.name} · {l.size}</p>
              </div>
              <p className="price">{money(l.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{tc("subtotal")}</dt><dd className="price">{money(cart.totals.subtotal)}</dd></div>
          {cart.totals.discount !== "0.00" && <div className="flex justify-between"><dt className="text-muted">{tc("discount")}</dt><dd className="price text-accent">−{money(cart.totals.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">{tc("shipping")}</dt><dd className="price">{shipping === "0.00" ? t("free") : money(shipping)}</dd></div>
        </dl>
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="eyebrow">{tc("total")}</span>
          <span className="price text-xl">{money(total)}</span>
        </div>
        {err && <p role="alert" className="mt-5 text-sm text-danger">{err}</p>}
        <button type="submit" disabled={pending || !delivery} className="btn btn-primary mt-6 w-full disabled:opacity-50">{t("placeOrder")}</button>
      </aside>
    </form>
  );
}
