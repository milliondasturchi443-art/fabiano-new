import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { SimpleText } from "@/components/ui/SimpleText";
import { LeadForm } from "@/components/lead/LeadForm";
import { formatUzPhone } from "@/lib/phone";
import { contactInfo, socialList } from "@/lib/site-content";
import { getStoreSettings } from "@/services/catalog";
import { assertLocale, locales, type AppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export const revalidate = 600;

async function getPage(slug: string, locale: AppLocale) {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return null;
  return prisma.staticPage.findUnique({ where: { slug_locale: { slug, locale } } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  assertLocale(locale);
  const page = await getPage(slug, locale);
  if (!page) return {};
  return {
    title: page.title,
    description: page.body.replace(/^## .*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 160),
    alternates: { canonical: `/${locale}/pages/${slug}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/pages/${slug}`])) },
  };
}

export default async function StaticPage({ params }: Props) {
  const { locale, slug } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const page = await getPage(slug, locale);
  if (!page) notFound();
  const [t, settings] = await Promise.all([getTranslations("catalog"), slug === "contact" ? getStoreSettings().catch(() => null) : null]);
  const c = settings ? contactInfo(settings) : null;
  const rows = c
    ? ([
        c.phone && ["Telefon", formatUzPhone(c.phone), `tel:${c.phone}`],
        c.phone2 && ["Telefon", formatUzPhone(c.phone2), `tel:${c.phone2}`],
        c.email && ["Email", c.email, `mailto:${c.email}`],
        c.address && ["Manzil", c.address, null],
        c.hours && ["Ish vaqti", c.hours, null],
        ...socialList(settings?.socials).map((x) => [x.label, x.url.replace(/^https?:\/\//, ""), x.url]),
      ].filter(Boolean) as [string, string, string | null][])
    : [];

  return (
    <>
      <SiteHeader />
      <main id="main" className="page-x mx-auto max-w-[var(--container-page)] pb-8">
        <Breadcrumbs items={[{ name: t("home"), href: "/" }, { name: page.title }]} locale={locale} className="pt-6" />
        <article className="mx-auto max-w-2xl pb-8 pt-10 md:pt-16">
          <span className="block h-10 w-px bg-accent" aria-hidden />
          <h1 className="mt-6 text-5xl md:text-6xl">{page.title}</h1>
          {rows.length > 0 && (
            <dl className="mt-10 divide-y divide-line border-y border-line">
              {rows.map(([k, v, href], i) => (
                <div key={i} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                  <dt className="eyebrow text-[0.62rem] text-gold">{k}</dt>
                  <dd className="text-right">{href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" className="break-all text-champagne hover:underline">{v}</a> : v}</dd>
                </div>
              ))}
            </dl>
          )}
          <SimpleText body={page.body} className="mt-10" />
        </article>
        {slug === "contact" && <div className="pb-8"><LeadForm page="contact" /></div>}
      </main>
    </>
  );
}
