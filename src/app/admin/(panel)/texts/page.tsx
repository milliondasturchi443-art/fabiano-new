import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/admin/guard";
import { saveSiteTextsAction } from "@/features/admin/site-actions";
import { SaveForm } from "@/components/admin/ui";
import { INFO_PAGES, TEXT_FIELDS, siteTexts, type TextKey } from "@/lib/site-content";
import uz from "@/messages/uz.json";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";

export const metadata = { title: "Sayt matnlari" };

const MESSAGES = { uz, ru, en };
const LANGS = [
  { k: "uz", label: "Oʻzbekcha" },
  { k: "ru", label: "Ruscha" },
  { k: "en", label: "Inglizcha" },
] as const;
const GROUPS = [
  { k: "home", title: "Bosh sahifa" },
  { k: "about", title: "Biz haqimizda" },
  { k: "lead", title: "Raqam qoldirish boʻlimi" },
  { k: "footer", title: "Pastki qism" },
] as const;

function defaults(lang: keyof typeof MESSAGES): Partial<Record<TextKey, string>> {
  const m = MESSAGES[lang];
  return {
    heroEyebrow: m.hero.eyebrow, heroTitle: m.hero.title, heroText: m.hero.subtitle,
    btnMen: m.hero.shopMen, btnWomen: m.hero.shopWomen, newTitle: m.home.newArrivals,
    aboutTitle: m.home.aboutTitle, aboutText: m.home.aboutText,
    leadTitle: m.lead.title, leadText: m.lead.text, footerText: m.newsletter.text,
  };
}

export default async function AdminTexts({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  await requireAdmin("*");
  const { lang: l } = await searchParams;
  const lang = (["uz", "ru", "en"].includes(l ?? "") ? l : "uz") as "uz" | "ru" | "en";
  const [settings, pages] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: "default" } }),
    prisma.staticPage.findMany({ where: { locale: lang, slug: { in: INFO_PAGES.map((p) => p.slug) } } }),
  ]);
  const saved = siteTexts(settings?.homeContent, lang);
  const def = defaults(lang);
  const value = (k: TextKey) => saved[k] ?? def[k] ?? "";

  return (
    <div>
      <h2 className="h">Sayt matnlari</h2>
      <p className="sub">Saytdagi yozuvlarni oʻzgartiring. *Yulduzcha* ichidagi soʻz oltin rangda chiqadi.</p>
      <div className="ltabs" style={{ marginBottom: 18 }}>
        {LANGS.map((x) => <Link key={x.k} href={`/admin/texts?lang=${x.k}`} className={lang === x.k ? "on" : ""}>{x.label}</Link>)}
      </div>
      <SaveForm action={saveSiteTextsAction} key={lang}>
        <input type="hidden" name="lang" value={lang} />
        {GROUPS.map((g) => (
          <div className="panel" key={g.k}>
            <div className="panel-h"><h4>{g.title}</h4></div>
            <div className="panel-b fgrid">
              {TEXT_FIELDS.filter((f) => f.group === g.k).map((f) => (
                <div key={f.key} className={`fld ${"full" in f && f.full ? "full" : ""}`}>
                  <label htmlFor={`t-${f.key}`}>{f.label}</label>
                  {"area" in f && f.area ? (
                    <textarea id={`t-${f.key}`} className="inp" name={f.key} defaultValue={value(f.key)} placeholder={f.ph} maxLength={f.max} />
                  ) : (
                    <input id={`t-${f.key}`} className="inp" name={f.key} defaultValue={value(f.key)} placeholder={f.ph} maxLength={f.max} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="panel">
          <div className="panel-h"><h4>Maʼlumot sahifalari</h4></div>
          <div className="panel-b fgrid">
            {INFO_PAGES.map((p) => (
              <div key={p.slug} className="fld full">
                <label htmlFor={`pg-${p.slug}`}>{p.label}</label>
                <textarea id={`pg-${p.slug}`} className="inp" style={{ height: 180 }} name={`page_${p.slug}`} defaultValue={pages.find((x) => x.slug === p.slug)?.body ?? ""} maxLength={20000} />
                <span className="hint">«## Sarlavha» — boʻlim sarlavhasi, boʻsh qator — yangi xatboshi.</span>
              </div>
            ))}
          </div>
        </div>
      </SaveForm>
    </div>
  );
}
