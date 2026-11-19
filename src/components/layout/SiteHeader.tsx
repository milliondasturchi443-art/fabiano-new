import { getLocale } from "next-intl/server";
import { Header } from "./Header";
import { getStoreSettings } from "@/services/catalog";
import { prisma } from "@/lib/prisma";
import { isLocale, locales, type AppLocale } from "@/i18n/routing";

/** Server-обёртка шапки: категории для выпадающих меню, объявление и языки из настроек магазина. */
export async function SiteHeader(_props: { overlay?: boolean; hideLogoWhileTransparent?: boolean } = {}) {
  const l = await getLocale();
  const locale: AppLocale = isLocale(l) ? l : "uz";
  const [settings, cats] = await Promise.all([
    getStoreSettings().catch(() => null),
    prisma.category
      .findMany({
        where: { isActive: true, parentId: null, gender: { in: ["MEN", "WOMEN"] } },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, gender: true, translations: { where: { locale }, select: { name: true } } },
      })
      .catch(() => []),
  ]);
  const enabled = (settings?.enabledLocales?.length ? settings.enabledLocales : locales) as readonly AppLocale[];
  const home = (settings?.homeContent ?? {}) as { announce?: Partial<Record<AppLocale, string>> };
  const toNav = (g: "MEN" | "WOMEN") => cats.filter((c) => c.gender === g).map((c) => ({ slug: c.slug, name: c.translations[0]?.name ?? c.slug }));

  return (
    <Header
      enabledLocales={enabled}
      categories={{ men: toNav("MEN"), women: toNav("WOMEN") }}
      announcement={home.announce?.[locale]?.trim() || null}
    />
  );
}
