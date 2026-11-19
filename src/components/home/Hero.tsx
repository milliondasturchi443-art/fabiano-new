import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Hanger } from "@/components/ui/Hanger";
import type { HeroData } from "@/services/catalog";
import logoVelvet from "../../../public/brand/logo-velvet.jpg";

/** «Слово *в звёздочках*» → золотой акцент, как в прототипе. */
function Accent({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <em key={i} className="not-italic text-champagne">{p}</em> : <span key={i}>{p}</span>))}
    </>
  );
}

/**
 * Первый экран из прототипа: надпись, заголовок с золотым акцентом и три арки —
 * по бокам Erkaklar/Ayollar (фото первого товара или вешалка), в центре вышитый логотип на бархате.
 * Если в Dashboard загружен баннер — он встаёт в центральную арку вместо логотипа.
 */
export async function Hero({ data, covers }: { data: HeroData | null; covers: { men: string | null; women: string | null } }) {
  const [t, tn, th] = await Promise.all([getTranslations("hero"), getTranslations("nav"), getTranslations("home")]);
  const title = data?.title || t("title");
  const subtitle = data?.subtitle || t("subtitle");

  const side = (href: string, label: string, img: string | null) => (
    <Link href={href} className="group relative hidden h-[440px] rounded-t-full border border-gold/50 p-[9px] transition-transform duration-[600ms] ease-[var(--ease-fabiano)] hover:-translate-y-1.5 md:block">
      <div className="relative h-full overflow-hidden rounded-t-full bg-[radial-gradient(ellipse_at_50%_30%,#3a0a14,#140708_75%)]">
        {img ? (
          <Image src={img} alt="" fill sizes="(max-width: 1180px) 30vw, 340px" className="object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-gold opacity-55"><Hanger className="-mt-12 w-[44%]" /></div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[rgb(10_6_6/0.88)]" />
      </div>
      <div className="absolute inset-x-0 bottom-[30px] z-[3] text-center">
        <b className="block font-serif text-[2.125rem] font-normal tracking-[0.04em]">{label}</b>
        <span className="border-b border-gold pb-1 font-caps text-[0.625rem] uppercase tracking-[0.38em] text-champagne">{th("view")}</span>
      </div>
    </Link>
  );

  return (
    <section className="relative overflow-hidden pb-10 pt-8 text-center md:pt-14">
      <div className="pointer-events-none absolute left-1/2 top-[40%] h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgb(92_14_29/0.35),transparent_60%)]" aria-hidden />
      <div className="page-x relative mx-auto max-w-[var(--container-page)]">
        <p className="fade-up eyebrow text-[0.66rem] tracking-[0.45em] text-gold md:text-xs md:tracking-[0.6em]">{t("eyebrow")}</p>
        <h1 className="fade-up mx-auto mb-2.5 mt-4 max-w-[1100px] text-[clamp(2.875rem,7vw,6rem)] leading-[1.02] [animation-delay:100ms]">
          <Accent text={title} />
        </h1>
        <p className="fade-up mx-auto max-w-[560px] text-base font-light text-muted [animation-delay:180ms]">{subtitle}</p>

        <div className="fade-up relative mx-auto mt-7 grid max-w-[330px] items-end gap-7 [animation-delay:260ms] md:mt-[46px] md:max-w-[1180px] md:grid-cols-[1fr_1.22fr_1fr]">
          {side("/men", tn("men"), covers.men)}
          <div className="relative aspect-[1/1.12] rounded-t-full border border-gold/50 p-[9px] md:aspect-auto md:h-[540px]">
            <div className="relative h-full overflow-hidden rounded-t-full bg-[radial-gradient(ellipse_at_50%_70%,#4a0b17_0%,#2a050c_55%,#120607_100%)]">
              {data?.imageUrl ? (
                <Image src={data.imageUrl} alt="" fill priority sizes="(max-width: 768px) 90vw, 440px" className="object-cover" />
              ) : (
                <Image
                  src={logoVelvet}
                  alt="FABIANO"
                  priority
                  placeholder="blur"
                  sizes="(max-width: 768px) 90vw, 440px"
                  className="absolute inset-x-0 bottom-0 aspect-square w-full object-contain [mask-image:linear-gradient(to_bottom,transparent_0,#000_16%)]"
                />
              )}
            </div>
          </div>
          {side("/women", tn("women"), covers.women)}
        </div>

        <div className="fade-up relative z-[4] -mt-[22px] grid grid-cols-2 gap-2 px-1 [animation-delay:340ms] md:-mt-[27px] md:flex md:justify-center md:gap-3.5">
          <Link href="/men" className="btn btn-primary min-h-12 whitespace-normal px-2 text-center text-[0.6rem] tracking-[0.16em] md:min-h-[3.375rem] md:px-8 md:text-[0.72rem] md:tracking-[0.26em]">{t("shopMen")}</Link>
          <Link href="/women" className="btn btn-outline min-h-12 whitespace-normal px-2 text-center text-[0.6rem] tracking-[0.16em] md:min-h-[3.375rem] md:px-8 md:text-[0.72rem] md:tracking-[0.26em]">{t("shopWomen")}</Link>
        </div>
      </div>
    </section>
  );
}
