import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductRail } from "@/components/home/ProductRail";
import { getProductBySlug, getRelatedProducts, isAnywearActive, isTryOnEnabledFor } from "@/services/product";
import { getDeliveryInfo } from "@/services/catalog";
import { totalAvailable } from "@/features/product/variants";
import { locales, type AppLocale, assertLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: AppLocale; slug: string }>;
  searchParams: Promise<{ color?: string }>;
};

export const revalidate = 120;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  assertLocale(locale);
  const p = await getProductBySlug(slug, locale);
  if (!p) return {};
  const title = p.metaTitle ?? p.name;
  const description = p.metaDescription ?? p.description.slice(0, 160);
  const path = `/product/${p.slug}`;
  // Для превью и для виджета примерки: фото, отмеченное «KIYISH», иначе первое
  const image = (p.tryOnAsset.url && p.images.find((i) => i.url === p.tryOnAsset.url)) || p.images[0];
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/${locale}${path}`,
      images: image ? [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] : undefined,
    },
    other: { "product:price:amount": String(p.price), "product:price:currency": p.currency },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const product = await getProductBySlug(slug, locale);
  if (!product) notFound();

  const [{ color }, t, tn, tp, related, tryOn, delivery, anywear] = await Promise.all([
    searchParams,
    getTranslations("catalog"),
    getTranslations("nav"),
    getTranslations("product"),
    getRelatedProducts(product, locale),
    isTryOnEnabledFor(product),
    getDeliveryInfo(locale),
    isAnywearActive(),
  ]);
  const deliveryNote = delivery.note || (delivery.eta ? tp("deliveryNote", { days: delivery.eta }) : null);

  const genderPath = product.category.gender === "WOMEN" ? "/women" : "/men";
  const genderName = product.category.gender === "WOMEN" ? tn("women") : tn("men");
  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL) ?? "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    // абсолютные ссылки; фото для примерки — первым (его берёт виджет Anywear)
    image: [...new Set([product.tryOnAsset.url, ...product.images.map((i) => i.url)].filter((u): u is string => Boolean(u)))]
      .slice(0, 6)
      .map((u) => (u.startsWith("/") ? `${base || "https://fabiano-store.onrender.com"}${u}` : u)),
    url: `${base}/${locale}/product/${product.slug}`,
    ...(product.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count } } : {}),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability: totalAvailable(product.variants) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${base}/${locale}/product/${product.slug}`,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <SiteHeader />
      <main id="main" className="page-x mx-auto max-w-[var(--container-page)] pb-8">
        <Breadcrumbs
          locale={locale}
          className="py-5"
          items={[
            { name: t("home"), href: "/" },
            { name: genderName, href: genderPath },
            { name: product.category.name, href: `${genderPath}/${product.category.slug}` },
            { name: product.name },
          ]}
        />
        <ProductDetail product={product} requestedColor={color} tryOn={tryOn} anywear={anywear} deliveryNote={deliveryNote} />
        {related.length > 0 && (
          <ProductRail title={tp("related")} href={`${genderPath}/${product.category.slug}`} viewAll={t("allInCategory")} products={related} emptyText="" />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </main>
    </>
  );
}
