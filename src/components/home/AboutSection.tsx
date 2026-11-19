import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import logoVelvet from "../../../public/brand/logo-velvet.jpg";

/** «Biz haqimizda» с вышитым логотипом. Текст можно заменить в админке (Sozlamalar → Matnlar). */
export async function AboutSection({ text, title }: { text?: string | null; title?: string | null }) {
  const t = await getTranslations("home");
  return (
    <section className="border-y border-hair bg-gradient-to-b from-paper to-canvas py-16 md:py-[100px]">
      <div className="page-x mx-auto grid max-w-[var(--container-page)] items-center gap-8 md:grid-cols-[420px_1fr] md:gap-20">
        <div className="mx-auto w-full max-w-[340px] border border-line bg-canvas p-3 md:max-w-none">
          <Image src={logoVelvet} alt="FABIANO" placeholder="blur" sizes="(max-width: 768px) 340px, 420px" className="aspect-square w-full object-contain" />
        </div>
        <div>
          <p className="eyebrow text-gold">{t("aboutEyebrow")}</p>
          <h2 className="mb-5 mt-3 text-[clamp(2.25rem,4vw,3.375rem)] leading-[1.05]">{title || t("aboutTitle")}</h2>
          <p className="max-w-[600px] whitespace-pre-line text-base font-light text-muted">{text || t("aboutText")}</p>
          <Link href="/pages/contact" className="lnk mt-7 inline-block">{t("contactLink")}</Link>
        </div>
      </div>
    </section>
  );
}
