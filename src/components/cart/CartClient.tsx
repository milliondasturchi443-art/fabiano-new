"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, type AppLocale } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";
import { cartApi, type CartApiError } from "@/features/cart/client";
import type { CartLineView, CartView } from "@/services/cart";
import { CloseIcon } from "@/components/ui/icons";

export function CartClient({ initial }: { initial: CartView }) {
  const t = useTranslations("cart");
  const locale = useLocale() as AppLocale;
  const [cart, setCart] = useState(initial);
  const [error, setError] = useState<{ lineId?: string; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [promo, setPromo] = useState("");

  const errText = (e: CartApiError) =>
    t.has(`errors.${e.error}`) ? t(`errors.${e.error}` as "errors.GENERIC", { available: e.available ?? 0 }) : t("errors.GENERIC");

  const run = (fn: () => ReturnType<typeof cartApi.get>, lineId?: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setCart(r.cart);
        setError(null);
      } else setError({ lineId, text: errText(r.error) });
    });

  const money = (v: string) => formatMoney(v, locale);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center md:py-32">
        <span className="h-12 w-px bg-accent" aria-hidden />
        <h1 className="mt-8 text-4xl md:text-5xl">{t("empty")}</h1>
        <p className="mt-4 max-w-sm text-muted">{t("emptyText")}</p>
        <Link href="/catalog" className="btn btn-primary mt-10">{t("continue")}</Link>
      </div>
    );
  }

  const { totals } = cart;
  const hasStockProblem = totals.stockErrors.length > 0;

  return (
    <div className="grid gap-12 pt-8 lg:grid-cols-[1fr_24rem] lg:gap-16 lg:pt-12">
      <section aria-labelledby="cart-title">
        <h1 id="cart-title" className="text-4xl md:text-5xl">
          {t("title")} <span className="price align-top font-sans text-base text-muted">({totals.itemCount})</span>
        </h1>
        <ul className={`mt-8 divide-y divide-line border-y border-line ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
          {cart.lines.map((l) => (
            <CartLine
              key={l.id}
              line={l}
              money={money}
              error={error?.lineId === l.id ? error.text : null}
              onQty={(q) => run(() => cartApi.update(locale, l.id, { quantity: q }), l.id)}
              onVariant={(variantId) => run(() => cartApi.update(locale, l.id, { variantId }), l.id)}
              onRemove={() => run(() => cartApi.remove(locale, l.id), l.id)}
              disabled={pending}
            />
          ))}
        </ul>
        <Link href="/catalog" className="eyebrow link-underline mt-8 inline-block pb-1">← {t("continue")}</Link>
      </section>

      <aside aria-labelledby="summary-title" className="card h-fit p-6 md:p-8 lg:sticky lg:top-28">
        <h2 id="summary-title" className="eyebrow font-sans">{t("summary")}</h2>

        {/* Промокод */}
        <div className="mt-6 border-b border-line pb-6">
          {totals.appliedCoupon || cart.couponCode ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={totals.couponError ? "text-danger" : ""}>
                {totals.couponError ? t(`errors.${totals.couponError}`) : t("promoApplied", { code: cart.couponCode ?? "" })}
              </span>
              <button type="button" disabled={pending} onClick={() => run(() => cartApi.removeCoupon(locale))} className="eyebrow link-underline shrink-0 pb-0.5">
                {t("promoRemove")}
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (promo.trim().length >= 2) run(() => cartApi.applyCoupon(locale, promo.trim()), "promo");
              }}
              className="flex items-end gap-3"
            >
              <label className="flex-1">
                <span className="sr-only">{t("promo")}</span>
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value.toUpperCase())}
                  placeholder={t("promo")}
                  autoCapitalize="characters"
                  maxLength={40}
                  className="h-11 w-full border-b border-line bg-transparent text-sm uppercase tracking-wider focus:border-ink focus:outline-none"
                />
              </label>
              <button type="submit" disabled={pending || promo.trim().length < 2} className="eyebrow h-11 disabled:opacity-40">{t("promoApply")}</button>
            </form>
          )}
          {error?.lineId === "promo" && <p role="alert" className="mt-2 text-xs text-danger">{error.text}</p>}
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <Row label={t("subtotal")} value={money(totals.subtotal)} />
          {totals.discount !== "0.00" && <Row label={t("discount")} value={`−${money(totals.discount)}`} accent />}
          <Row
            label={t("shipping")}
            value={!cart.shippingEstimated ? t("shippingAtCheckout") : totals.shipping === "0.00" ? t("shippingFree") : money(totals.shipping)}
            muted={!cart.shippingEstimated}
          />
        </dl>
        <div className="mt-6 flex items-baseline justify-between border-t border-line pt-6">
          <span className="eyebrow">{t("total")}</span>
          <span className="price text-xl">{money(totals.grandTotal)}</span>
        </div>

        {hasStockProblem ? (
          <p role="alert" className="mt-6 text-sm text-danger">{t("errors.INSUFFICIENT_STOCK", { available: totals.stockErrors[0]!.available })}</p>
        ) : null}
        <Link
          href="/checkout"
          aria-disabled={hasStockProblem || pending}
          className={`btn btn-primary mt-6 w-full ${hasStockProblem ? "pointer-events-none opacity-40" : ""}`}
        >
          {t("checkout")}
        </Link>
      </aside>

      {/* Мобильная фиксированная панель: итог + кнопка всегда под рукой */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-canvas px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div>
          <p className="text-xs text-muted">{t("total")}</p>
          <p className="price">{money(totals.grandTotal)}</p>
        </div>
        <Link href="/checkout" aria-disabled={hasStockProblem} className={`btn btn-primary ${hasStockProblem ? "pointer-events-none opacity-40" : ""}`}>
          {t("checkout")}
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`price text-right ${accent ? "text-accent" : ""} ${muted ? "text-xs text-muted" : ""}`}>{value}</dd>
    </div>
  );
}

function CartLine({
  line, money, error, onQty, onVariant, onRemove, disabled,
}: {
  line: CartLineView;
  money: (v: string) => string;
  error: string | null;
  onQty: (q: number) => void;
  onVariant: (variantId: string) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("cart");
  const colors = [...new Map(line.options.map((o) => [o.colorCode, o.colorName])).entries()];
  const sizesForColor = line.options.filter((o) => o.colorCode === line.color.code);
  const pick = (colorCode: string, size: string) =>
    line.options.find((o) => o.colorCode === colorCode && o.size === size) ?? line.options.find((o) => o.colorCode === colorCode && o.available > 0);
  const maxQty = Math.min(line.available, 99);
  const overStock = line.quantity > line.available;

  return (
    <li className="grid grid-cols-[6.5rem_1fr] gap-4 py-6 md:grid-cols-[8rem_1fr] md:gap-6">
      <Link href={`/product/${line.slug}`} className="relative block aspect-[3/4] overflow-hidden rounded-t-[60px] bg-surface">
        {line.image && <Image src={line.image} alt={line.name} fill sizes="128px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/product/${line.slug}`} className="link-underline text-sm md:text-base">{line.name}</Link>
            <p className="mt-1 text-xs text-muted">{line.sku}</p>
          </div>
          <button type="button" onClick={onRemove} disabled={disabled} aria-label={`${t("remove")}: ${line.name}`} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:text-ink">
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
          {colors.length > 1 ? (
            <label className="flex items-center gap-2">
              <span className="text-muted">{t("color")}</span>
              <select
                value={line.color.code}
                disabled={disabled}
                onChange={(e) => {
                  const v = pick(e.target.value, line.size);
                  if (v) onVariant(v.variantId);
                }}
                className="min-h-11 bg-transparent font-medium focus:outline-none"
              >
                {colors.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
          ) : (
            <span><span className="text-muted">{t("color")}</span> {line.color.name}</span>
          )}
          {sizesForColor.length > 1 ? (
            <label className="flex items-center gap-2">
              <span className="text-muted">{t("size")}</span>
              <select
                value={line.variantId}
                disabled={disabled}
                onChange={(e) => onVariant(e.target.value)}
                className="min-h-11 bg-transparent font-medium focus:outline-none"
              >
                {sizesForColor.map((o) => (
                  <option key={o.variantId} value={o.variantId} disabled={o.available === 0 && o.variantId !== line.variantId}>
                    {o.size}{o.available === 0 ? ` — ${t("unavailable")}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="flex min-h-11 items-center"><span className="text-muted">{t("size")}</span>&nbsp;{line.size}</span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <div className="flex h-11 items-center border border-line" role="group" aria-label={t("quantity")}>
            <button type="button" onClick={() => onQty(line.quantity - 1)} disabled={disabled || line.quantity <= 1} aria-label={t("decrease")} className="h-full w-11 transition-colors hover:bg-canvas disabled:opacity-30">−</button>
            <span className="price w-8 text-center text-sm" aria-live="polite">{line.quantity}</span>
            <button type="button" onClick={() => onQty(line.quantity + 1)} disabled={disabled || line.quantity >= maxQty} aria-label={t("increase")} className="h-full w-11 transition-colors hover:bg-canvas disabled:opacity-30">+</button>
          </div>
          <div className="text-right">
            <p className="price text-sm md:text-base">{money(line.lineTotal)}</p>
            {line.quantity > 1 && <p className="price text-xs text-muted">{line.quantity} × {money(line.unitPrice)}</p>}
          </div>
        </div>

        {line.available === 0 ? (
          <p className="mt-3 text-xs text-danger">{t("unavailable")}</p>
        ) : overStock ? (
          <p className="mt-3 text-xs text-danger">{t("errors.INSUFFICIENT_STOCK", { available: line.available })}</p>
        ) : line.available <= 3 ? (
          <p className="mt-3 text-xs text-accent">{t("onlyLeft", { count: line.available })}</p>
        ) : null}
        {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </li>
  );
}
