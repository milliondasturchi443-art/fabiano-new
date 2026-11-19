"use client";

import Image from "next/image";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { checkoutAction } from "@/features/orders/checkout-action";
import { formatMoney, fromMinor, toMinor } from "@/lib/money";
import { validateCheckout, type CheckoutField, type FieldErrors } from "@/features/orders/checkout-validate";
import { PhoneInput } from "@/components/lead/PhoneInput";
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
  cart, deliveries, payments, prefill,
}: {
  cart: CartView;
  deliveries: DeliveryOption[];
  payments: ("CASH_ON_DELIVERY" | "PAYME" | "CLICK")[];
  prefill: { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null };
}) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const ta = useTranslations("account");
  const locale = useLocale() as AppLocale;
  const tl = useTranslations("lead");
  const tr = useTranslations("receipt");
  const [state, dispatch, pending] = useActionState(checkoutAction, null);
  const regions = t.raw("regions") as string[];
  const v = state?.values ?? {};
  const [region, setRegion] = useState("");
  const [local, setLocal] = useState<FieldErrors | null>(null);
  const fe: FieldErrors = local ?? state?.fields ?? {};
  const fmsg = (f: CheckoutField) => {
    const code = fe[f];
    if (!code) return null;
    if (code.startsWith("NAME_") || code.startsWith("PHONE_")) return tl(`errors.${code}` as "errors.GENERIC");
    return t.has(`errors.${code}`) ? t(`errors.${code}` as "errors.GENERIC") : t("errors.INVALID_INPUT");
  };
  const errText = (f: CheckoutField) => {
    const m = fmsg(f);
    return m ? <span id={`co-${f}-err`} className="mt-1.5 block text-[0.78rem] text-danger">{m}</span> : null;
  };
  const inv = (f: CheckoutField) => (fe[f] ? { "aria-invalid": true as const, "aria-describedby": `co-${f}-err` } : {});

  // Заказ создан → открываем чек (жёсткий переход, не зависит от потока RSC)
  useEffect(() => {
    if (state?.ok && state.url) window.location.assign(state.url);
  }, [state]);
  const done = Boolean(state?.ok);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    if (done) { e.preventDefault(); return; }
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs = validateCheckout(Object.fromEntries([...fd.entries()].map(([k, x]) => [k, String(x)])));
    if (Object.keys(errs).length) {
      setLocal(errs);
      const first = (["firstName", "lastName", "phone", "region", "district", "street", "house"] as const).find((k) => errs[k]);
      if (first) e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setLocal(null);
    startTransition(() => dispatch(fd));
  }
  const [deliveryId, setDeliveryId] = useState(deliveries[0]?.id ?? "");

  const available = deliveries.filter((d) => d.regions.length === 0 || !region || d.regions.includes(region));
  const delivery = available.find((d) => d.id === deliveryId) ?? available[0];
  const money = (v: string) => formatMoney(v, locale);

  const { shipping, total } = useMemo(() => {
    const afterDiscount = toMinor(cart.totals.subtotal) - toMinor(cart.totals.discount);
    const ship = !delivery ? 0n : delivery.freeFrom && afterDiscount >= toMinor(delivery.freeFrom) ? 0n : toMinor(delivery.price);
    return { shipping: fromMinor(ship), total: fromMinor(afterDiscount + ship) };
  }, [cart.totals, delivery]);

  const err = state?.error && state.error !== "CHECK_FIELDS" ? (t.has(`errors.${state.error}`) ? t(`errors.${state.error}` as "errors.GENERIC") : t("errors.GENERIC")) : null;
  const input = "field mt-1.5";
  const label = "text-xs font-medium text-muted";

  return (
    <form
      onSubmit={submit}
      onChange={(e) => {
        if (!local && !state?.fields) return;
        const fd = new FormData(e.currentTarget);
        setLocal(validateCheckout(Object.fromEntries([...fd.entries()].map(([k, x]) => [k, String(x)]))));
      }}
      noValidate
      className="grid gap-12 pb-28 lg:grid-cols-[1fr_24rem] lg:gap-16 lg:pb-0">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-12">
        <fieldset>
          <legend className="text-3xl">{t("contact")}</legend>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label><span className={label}>{ta("firstName")} *</span><input name="firstName" required autoComplete="given-name" placeholder={tl("firstNamePh")} defaultValue={v.firstName ?? prefill.firstName ?? ""} className={input} {...inv("firstName")} />{errText("firstName")}</label>
            <label><span className={label}>{ta("lastName")} *</span><input name="lastName" required autoComplete="family-name" placeholder={tl("lastNamePh")} defaultValue={v.lastName ?? prefill.lastName ?? ""} className={input} {...inv("lastName")} />{errText("lastName")}</label>
            <div><span className={label}>{ta("phone")} *</span><div className="mt-1.5"><PhoneInput name="phone" defaultValue={v.phone ?? prefill.phone ?? ""} invalid={Boolean(fe.phone)} describedBy={fe.phone ? "co-phone-err" : undefined} /></div>{errText("phone")}</div>
            <label><span className={label}>{ta("email")} ({ta("optional")})</span><input name="email" type="email" inputMode="email" autoComplete="email" defaultValue={v.email ?? prefill.email ?? ""} className={input} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-3xl">{t("shipping")}</legend>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={label}>{t("region")} *</span>
              <select name="region" required value={region || v.region || ""} onChange={(e) => setRegion(e.target.value)} className={input} {...inv("region")}>
                <option value="" disabled>{t("selectRegion")}</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errText("region")}
            </label>
            <label className="sm:col-span-2"><span className={label}>{t("district")} *</span><input name="district" required autoComplete="address-level2" defaultValue={v.district} className={input} {...inv("district")} />{errText("district")}</label>
            <label className="sm:col-span-2"><span className={label}>{t("street")} *</span><input name="street" required autoComplete="address-line1" defaultValue={v.street} className={input} {...inv("street")} />{errText("street")}</label>
            <label><span className={label}>{t("house")} *</span><input name="house" required defaultValue={v.house} className={input} {...inv("house")} />{errText("house")}</label>
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
                <span className="price text-right text-sm">{Number(d.price) === 0 ? (d.type === "PICKUP" ? t("free") : t("priceOnRequest")) : money(d.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-3xl">{t("paymentMethod")}</legend>
          <div className="mt-6 space-y-3">
            {payments.map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-4 border border-line bg-paper p-4 transition-[border-color,box-shadow] duration-200 hover:border-[#d8c4b2] has-[:checked]:border-gold has-[:checked]:shadow-[0_0_0_3px_rgb(92_20_34/0.1)]">
                <input type="radio" name="paymentProvider" value={p} defaultChecked={(v.paymentProvider || payments[0]) === p} className="h-4 w-4 accent-[var(--color-gold)]" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{t(`pay.${p}.name`)}</span>
                  <span className="block text-xs text-muted">{t(`pay.${p}.hint`)}</span>
                </span>
                {p !== "CASH_ON_DELIVERY" && <span className="font-caps text-[0.7rem] tracking-[0.15em] text-champagne">{p === "PAYME" ? "Payme" : "Click"}</span>}
              </label>
            ))}
            <p className="text-xs text-muted">{t("prepayNote")}</p>
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
          <div className="flex justify-between gap-3"><dt className="text-muted">{tc("shipping")}</dt><dd className="price text-right">{shipping !== "0.00" ? money(shipping) : delivery && Number(delivery.price) === 0 && delivery.type !== "PICKUP" ? t("priceOnRequest") : t("free")}</dd></div>
          {delivery && Number(delivery.price) === 0 && delivery.type !== "PICKUP" && <p className="text-xs text-muted">{t("priceOnRequestHint")}</p>}
        </dl>
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="eyebrow">{tc("total")}</span>
          <span className="price text-xl">{money(total)}</span>
        </div>
        {err && <p role="alert" className="mt-5 text-sm text-danger">{err}</p>}
        {Object.keys(fe).length > 0 && <p role="alert" className="mt-5 text-sm text-danger">{t("errors.CHECK_FIELDS")}</p>}
        <button type="submit" disabled={pending || done || !delivery} className="btn btn-primary mt-6 w-full disabled:opacity-50">{pending || done ? "…" : t("placeOrder")}</button>
        {done && <p role="status" className="mt-4 text-sm text-success">✓ {tr("opening")}</p>}
      </aside>
    </form>
  );
}
