"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter, type AppLocale } from "@/i18n/routing";
import { discountPercent, formatMoney } from "@/lib/money";
import { cartApi } from "@/features/cart/client";
import {
  findVariant, imagesForColor, initialColor, initialSize, sizeState, sizesFor, totalAvailable,
} from "@/features/product/variants";
import type { ProductDetail as Product } from "@/services/product";
import { Gallery } from "./Gallery";
import { SizeGuideDialog } from "./SizeGuideDialog";
import { TryOnButton } from "./TryOnButton";
import { WishlistButton } from "./WishlistButton";

export function ProductDetail({ product, requestedColor, tryOn }: { product: Product; requestedColor?: string | null; tryOn: boolean }) {
  const t = useTranslations("product");
  const tc = useTranslations("cart");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  const [color, setColor] = useState(() => initialColor(product.colors, product.variants, requestedColor));
  const [size, setSize] = useState(() => initialSize(product.variants, color));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const [pending, startTransition] = useTransition();

  const sizes = useMemo(() => sizesFor(product.variants), [product.variants]);
  const images = useMemo(() => imagesForColor(product.images, color), [product.images, color]);
  const variant = findVariant(product.variants, color, size);
  const price = variant?.price ?? product.price;
  const off = discountPercent(price, product.compareAtPrice);
  const soldOut = totalAvailable(product.variants) === 0;
  const colorName = product.colors.find((c) => c.code === color)?.name;

  const chooseColor = (code: string) => {
    setColor(code);
    setMessage(null);
    // Сохраняем размер, если он есть и в новом цвете; иначе сбрасываем
    if (size && sizeState(product.variants, code, size) === "missing") setSize(initialSize(product.variants, code));
    // URL с цветом — можно поделиться конкретным вариантом (без перезагрузки и без записи в историю)
    router.replace(`${pathname}?color=${code}`, { scroll: false });
  };

  const add = (thenCheckout: boolean) => {
    if (!variant) {
      setNeedSize(true);
      setMessage({ kind: "error", text: t("selectSize") });
      return;
    }
    startTransition(async () => {
      const r = await cartApi.add(locale, variant.id, 1);
      if (!r.ok) {
        const key = `errors.${r.error.error}`;
        setMessage({ kind: "error", text: tc.has(key) ? tc(key as "errors.GENERIC", { available: r.error.available ?? 0 }) : tc("errors.GENERIC") });
        return;
      }
      if (thenCheckout) router.push("/checkout");
      else setMessage({ kind: "ok", text: tc("added") });
    });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage({ kind: "ok", text: t("linkCopied") });
      }
    } catch {
      /* пользователь закрыл диалог «поделиться» */
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
      <Gallery images={images} name={product.name} />

      <div className="lg:sticky lg:top-28 lg:h-fit lg:max-w-[30rem]">
        <div className="flex items-center gap-2">
          {product.isNew && <span className="eyebrow bg-cream px-2 py-1 text-[0.625rem] text-wine-deep">{t("new")}</span>}
          {off && <span className="eyebrow bg-wine px-2 py-1 text-[0.625rem] text-cream">−{off}%</span>}
        </div>
        <h1 className="mt-3 text-4xl leading-tight md:text-5xl">{product.name}</h1>
        <p className="mt-4 flex items-baseline gap-3 text-lg">
          <span className="price">{formatMoney(price, locale, product.currency)}</span>
          {off && product.compareAtPrice && <s className="price text-base text-muted">{formatMoney(product.compareAtPrice, locale, product.currency)}</s>}
        </p>
        <p className="mt-2 text-xs text-muted">{t("sku")}: {variant?.sku ?? product.sku}</p>

        {/* Цвет */}
        {product.colors.length > 0 && (
          <fieldset className="mt-8">
            <legend className="text-sm"><span className="text-muted">{t("color")}:</span> {colorName}</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.colors.map((c) => {
                const any = product.variants.some((v) => v.colorCode === c.code && v.available > 0);
                return (
                  <label key={c.code} className="cursor-pointer" title={c.name}>
                    <input type="radio" name="color" value={c.code} checked={c.code === color} onChange={() => chooseColor(c.code)} className="peer sr-only" />
                    <span
                      className={`relative block h-9 w-9 rounded-full border border-ink/15 ring-offset-[3px] ring-offset-canvas peer-checked:ring-1 peer-checked:ring-gold peer-focus-visible:ring-1 peer-focus-visible:ring-ink ${any ? "" : "opacity-40"}`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {!any && <span className="absolute left-1/2 top-1/2 h-px w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-wine/60" aria-hidden />}
                    </span>
                    <span className="sr-only">{c.name}{any ? "" : ` — ${t("outOfStock")}`}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Размер */}
        {sizes.length > 0 && color && (
          <fieldset className="mt-8" aria-invalid={needSize && !size}>
            <div className="flex items-center justify-between">
              <legend className={`text-sm ${needSize && !size ? "text-danger" : ""}`}>
                <span className="text-muted">{t("size")}:</span> {size ?? t("selectSize")}
              </legend>
              {product.sizeGuide && <SizeGuideDialog table={product.sizeGuide.table} highlight={size} />}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {sizes.map((s) => {
                const state = sizeState(product.variants, color, s);
                if (state === "missing") return null;
                return (
                  <label key={s} className={state === "soldout" ? "cursor-not-allowed" : "cursor-pointer"}>
                    <input
                      type="radio" name="size" value={s}
                      checked={size === s}
                      disabled={state === "soldout"}
                      onChange={() => { setSize(s); setNeedSize(false); setMessage(null); }}
                      className="peer sr-only"
                    />
                    <span className="flex h-12 items-center justify-center border border-line text-sm font-medium transition-colors hover:border-muted peer-checked:border-gold peer-checked:bg-gold peer-checked:text-canvas peer-disabled:text-muted/50 peer-disabled:line-through peer-focus-visible:outline peer-focus-visible:outline-1">
                      {s}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Наличие */}
        <p className="mt-5 text-xs" aria-live="polite">
          {soldOut ? (
            <span className="text-danger">{t("outOfStock")}</span>
          ) : variant ? (
            variant.available === 0 ? <span className="text-danger">{t("outOfStock")}</span>
              : variant.available <= 3 ? <span className="text-accent">{t("lowStock", { count: variant.available })}</span>
              : <span className="text-success">{t("inStock")}</span>
          ) : null}
        </p>

        {/* Действия */}
        <div className="mt-5 grid gap-3">
          <button type="button" onClick={() => add(false)} disabled={pending || soldOut} className="btn btn-primary w-full disabled:opacity-40">
            {t("addToCart")}
          </button>
          <button type="button" onClick={() => add(true)} disabled={pending || soldOut} className="btn btn-outline w-full disabled:opacity-40">
            {t("buyNow")}
          </button>
          {tryOn && images[0] && (
            <TryOnButton
              productName={product.name}
              imageUrl={images[0].url}
              categorySlug={product.category.slug}
              colorCode={color}
            />
          )}
        </div>

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`mt-4 flex items-center justify-between gap-4 text-sm ${message.kind === "error" ? "text-danger" : ""}`}>
            {message.text}
            {message.kind === "ok" && message.text === tc("added") && (
              <Link href="/cart" className="eyebrow link-underline shrink-0 pb-0.5">{tc("viewCart")}</Link>
            )}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <WishlistButton productId={product.id} />
          <button type="button" onClick={share} className="eyebrow link-underline pb-1">{t("share")}</button>
        </div>

        {/* Описание */}
        <div className="mt-10 divide-y divide-line border-y border-line">
          <Details title={t("description")} open>
            <p className="whitespace-pre-line">{product.description}</p>
          </Details>
          {product.material && <Details title={t("material")}><p className="whitespace-pre-line">{product.material}</p></Details>}
          {product.care && <Details title={t("care")}><p className="whitespace-pre-line">{product.care}</p></Details>}
        </div>
      </div>
    </div>
  );
}

function Details({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group py-1">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-lg font-light transition-transform group-open:rotate-45" aria-hidden>+</span>
      </summary>
      <div className="pb-5 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}
