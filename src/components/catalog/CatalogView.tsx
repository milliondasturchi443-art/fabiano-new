import { getLocale, getTranslations } from "next-intl/server";
import { Link, type AppLocale } from "@/i18n/routing";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterForm } from "./FilterForm";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { activeFilterCount, serializeCatalogFilters, type CatalogFilters } from "@/features/catalog/filters";
import type { CatalogResult, CategoryLink } from "@/services/catalog-list";

export async function CatalogView({
  title,
  description,
  basePath,
  filters,
  result,
  crumbs,
  categories,
  activeCategory,
  categoryBase,
}: {
  title: string;
  description?: string | null;
  /** Путь без локали, например "/men/hoodies" */
  basePath: string;
  filters: CatalogFilters;
  result: CatalogResult;
  crumbs: Crumb[];
  categories?: CategoryLink[];
  activeCategory?: string;
  categoryBase?: string;
}) {
  const t = await getTranslations("catalog");
  const locale = (await getLocale()) as AppLocale;
  const active = activeFilterCount(filters);
  const { page } = result;
  const pageHref = (n: number) => basePath + serializeCatalogFilters(filters, { page: n });

  return (
    <main id="main" className="page-x mx-auto max-w-[var(--container-page)] pb-8">
      <Breadcrumbs items={crumbs} locale={locale} className="pt-6" />

      <header className="pb-6 pt-6 md:pb-8 md:pt-10">
        <h1 className="text-5xl md:text-6xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-muted">{description}</p>}
        <p className="mt-3 text-sm text-muted lg:hidden">{t("results", { count: result.total })}</p>
      </header>

      {categories && categories.length > 0 && categoryBase && (
        <nav aria-label={t("filters")} className="-mx-[clamp(1.25rem,4vw,3.5rem)] mb-2 overflow-x-auto px-[clamp(1.25rem,4vw,3.5rem)] [scrollbar-width:none]">
          <ul className="flex gap-2 pb-4">
            <li>
              <Chip href={categoryBase} active={!activeCategory}>{t("allInCategory")}</Chip>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Chip href={`${categoryBase}/${c.slug}`} active={c.slug === activeCategory}>{c.name}</Chip>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <FilterForm filters={filters} facets={result.facets} action={`/${locale}${basePath}`} total={result.total} activeCount={active}>
        {result.items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-3xl">{active > 0 || filters.q ? t("emptyFiltered") : t("empty")}</p>
            {active > 0 && (
              <Link href={basePath} className="btn btn-outline mt-8">{t("clear")}</Link>
            )}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 md:gap-y-14">
              {result.items.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 4} />
                </li>
              ))}
            </ul>

            {page.pages > 1 && (
              <nav aria-label={t("page", { current: page.current, total: page.pages })} className="mt-16 flex items-center justify-between border-t border-line pt-6">
                {page.hasPrev ? (
                  <Link href={pageHref(page.current - 1)} rel="prev" className="eyebrow link-underline min-h-11 content-center pb-1">← {t("prev")}</Link>
                ) : <span />}
                <span className="text-sm text-muted">{t("page", { current: page.current, total: page.pages })}</span>
                {page.hasNext ? (
                  <Link href={pageHref(page.current + 1)} rel="next" className="eyebrow link-underline min-h-11 content-center pb-1">{t("next")} →</Link>
                ) : <span />}
              </nav>
            )}
          </>
        )}
      </FilterForm>
    </main>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center whitespace-nowrap border px-4 text-xs font-medium tracking-wide transition-colors ${
        active ? "border-gold bg-gold text-canvas" : "border-line hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}
