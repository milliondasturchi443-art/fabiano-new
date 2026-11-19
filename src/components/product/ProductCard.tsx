import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, type AppLocale } from "@/i18n/routing";
import { formatMoney, discountPercent } from "@/lib/money";
import { Hanger } from "@/components/ui/Hanger";
import type { ProductCardData } from "@/services/catalog";

/** Карточка товара из прототипа: арочное фото, бейджи по центру, название Italiana, золотая цена, цвета. */
export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const t = useTranslations("product");
  const tn = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const off = discountPercent(product.price, product.compareAtPrice);
  const visibleColors = product.colors.slice(0, 6);
  const gender = product.gender === "MEN" ? tn("men") : product.gender === "WOMEN" ? tn("women") : null;

  return (
    <article className="group relative border border-hair bg-paper p-1.5 pb-3.5 transition-[border-color,transform] duration-500 ease-[var(--ease-fabiano)] hover:-translate-y-1 hover:border-line md:p-2.5 md:pb-[18px]">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden rounded-t-[140px] bg-surface" aria-label={product.name}>
        {product.image ? (
          <>
            <Image
              src={product.image.url}
              alt={product.image.alt}
              fill
              priority={priority}
              sizes="(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 25vw"
              className="object-cover transition-transform duration-[1100ms] ease-[var(--ease-fabiano)] group-hover:scale-105"
            />
            {product.hoverImage && (
              <Image
                src={product.hoverImage.url}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 25vw"
                className="hidden object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:block"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[radial-gradient(ellipse_at_50%_35%,#231b1c,#141011_75%)] text-gold-deep">
            <Hanger className="w-[36%]" />
            <span className="font-caps text-[0.56rem] uppercase tracking-[0.3em]">{t("noImage")}</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-3 z-[2] flex justify-center gap-1.5 md:top-6">
          {product.isNew && <span className="border border-line bg-canvas/85 px-2 py-1 font-caps text-[0.56rem] uppercase tracking-[0.2em] text-champagne">{t("new")}</span>}
          {off && <span className="bg-wine px-2 py-1 font-caps text-[0.56rem] tracking-[0.2em] text-cream">−{off}%</span>}
          {!product.inStock && <span className="border border-line bg-canvas/85 px-2 py-1 font-caps text-[0.56rem] uppercase tracking-[0.2em] text-champagne">{t("soldOutShort")}</span>}
        </div>
      </Link>

      <div className="pt-3.5 text-center">
        {(gender || product.categoryName) && (
          <p className="font-caps text-[0.56rem] uppercase tracking-[0.24em] text-muted">
            {[gender, product.categoryName].filter(Boolean).join(" · ")}
          </p>
        )}
        <Link href={`/product/${product.slug}`} className="my-1.5 block font-serif text-lg leading-[1.15] md:text-[1.375rem]">{product.name}</Link>
        <p className="price flex items-baseline justify-center gap-2.5 text-sm text-champagne">
          <span>{formatMoney(product.price, locale, product.currency)}</span>
          {off && product.compareAtPrice && <s className="text-[0.78rem] font-normal text-muted">{formatMoney(product.compareAtPrice, locale, product.currency)}</s>}
        </p>
        {visibleColors.length > 0 && (
          <ul className="mt-2.5 flex justify-center gap-1.5" aria-label={t("colors", { count: product.colors.length })}>
            {visibleColors.map((c) => (
              <li key={c.code}>
                <span title={c.name} className="block h-3.5 w-3.5 rounded-full border border-white/15" style={{ backgroundColor: c.hex }} />
                <span className="sr-only">{c.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
