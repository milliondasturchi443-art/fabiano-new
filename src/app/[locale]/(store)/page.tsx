import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Hero } from "@/components/home/Hero";
import { SectionHead } from "@/components/home/SectionHead";
import { NewArrivals } from "@/components/home/NewArrivals";
import { CategoryBoxes } from "@/components/home/CategoryBoxes";
import { AboutSection } from "@/components/home/AboutSection";
import { LeadForm } from "@/components/lead/LeadForm";
import { getActiveHero, getGenderCategoryNames, getGenderCovers, getNewArrivals, getStoreSettings } from "@/services/catalog";
import { siteTexts } from "@/lib/site-content";
import { assertLocale, type AppLocale } from "@/i18n/routing";

// ISR: главная пересобирается раз в 5 минут; изменения из админки сбрасывают кэш через revalidatePath.
export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);

  const [t, hero, covers, names, products, settings] = await Promise.all([
    getTranslations("home"),
    getActiveHero(locale),
    getGenderCovers(),
    getGenderCategoryNames(locale),
    getNewArrivals(locale, 16),
    getStoreSettings().catch(() => null),
  ]);
  const texts = siteTexts(settings?.homeContent, locale);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero data={hero} covers={covers} texts={texts} />

        <section className="py-16 md:py-[100px]">
          <div className="page-x mx-auto max-w-[var(--container-page)]">
            <SectionHead eyebrow="FABIANO" title={texts.newTitle || t("newArrivals")} />
            {products.length > 0 ? (
              <NewArrivals products={products} />
            ) : (
              <div className="empty-box">
                <p className="logo-script inline-block text-[4rem]">Fabiano</p>
                <h3 className="mb-2 mt-3 text-[2.125rem]">{t("emptyTitle")}</h3>
                <p className="mx-auto max-w-[440px] text-muted">{t("emptyText")}</p>
              </div>
            )}
          </div>
        </section>

        <CategoryBoxes covers={covers} names={names} />
        <AboutSection text={texts.aboutText} title={texts.aboutTitle} />

        <section className="py-16 md:py-[100px]">
          <div className="page-x mx-auto max-w-[var(--container-page)]">
            <LeadForm page="home" title={texts.leadTitle} text={texts.leadText} />
          </div>
        </section>
      </main>
    </>
  );
}
