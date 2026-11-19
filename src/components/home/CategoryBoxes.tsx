import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

/** Два блока Erkaklar / Ayollar с чипами категорий (из прототипа). */
export async function CategoryBoxes({ covers, names }: { covers: { men: string | null; women: string | null }; names: { men: string[]; women: string[] } }) {
  const [t, tn] = await Promise.all([getTranslations("home"), getTranslations("nav")]);
  const boxes = [
    { href: "/men", title: tn("men"), img: covers.men, chips: names.men },
    { href: "/women", title: tn("women"), img: covers.women, chips: names.women },
  ];
  return (
    <section className="page-x mx-auto max-w-[var(--container-page)] pb-16 md:pb-[100px]">
      <div className="grid gap-3.5 md:grid-cols-2 md:gap-[26px]">
        {boxes.map((b) => (
          <Link key={b.href} href={b.href} className="group relative flex h-[220px] items-end overflow-hidden border border-line bg-[radial-gradient(ellipse_at_80%_20%,rgb(92_14_29/0.55),var(--color-paper)_70%)] p-[22px] md:h-[340px] md:p-[34px]">
            {b.img && <Image src={b.img} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover opacity-55 transition-[transform,opacity] duration-[1200ms] group-hover:scale-105 group-hover:opacity-70" />}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-[rgb(10_6_6/0.9)]" />
            <div className="relative z-[2]">
              <p className="eyebrow text-champagne">{t("collectionLabel")}</p>
              <h3 className="text-4xl leading-none md:text-[2.875rem]">{b.title}</h3>
              {b.chips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {b.chips.slice(0, 6).map((c) => (
                    <span key={c} className="border border-line bg-canvas/50 px-2.5 py-1 text-xs text-muted">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
