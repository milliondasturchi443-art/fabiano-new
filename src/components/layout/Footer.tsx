import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { formatUzPhone } from "@/lib/phone";
import { contactInfo, siteTexts, socialList, type SocialKey } from "@/lib/site-content";

interface FooterProps {
  settings: { socials?: unknown; contactPhone?: string | null; contactEmail?: string | null; address?: unknown; homeContent?: unknown } | null;
  locale: "uz" | "ru" | "en";
}

const ICONS: Record<SocialKey, string> = {
  instagram:
    "M12 7.3A4.7 4.7 0 1012 16.7 4.7 4.7 0 0012 7.3zm0 7.8a3.1 3.1 0 110-6.2 3.1 3.1 0 010 6.2zM17 6a1.1 1.1 0 100 2.2A1.1 1.1 0 0017 6zM16.1 2.1C14.5 2 9.5 2 7.9 2.1 4.6 2.3 2.3 4.6 2.1 7.9 2 9.5 2 14.5 2.1 16.1c.2 3.3 2.5 5.6 5.8 5.8 1.6.1 6.6.1 8.2 0 3.3-.2 5.6-2.5 5.8-5.8.1-1.6.1-6.6 0-8.2-.2-3.3-2.5-5.6-5.8-5.8zM20 16c-.1 2.4-1.6 3.9-4 4-1.5.1-6.5.1-8 0-2.4-.1-3.9-1.6-4-4-.1-1.5-.1-6.5 0-8 .1-2.4 1.6-3.9 4-4 1.5-.1 6.5-.1 8 0 2.4.1 3.9 1.6 4 4 .1 1.5.1 6.5 0 8z",
  telegram:
    "M21.9 4.3l-3.2 15c-.2 1-.9 1.3-1.7.8l-4.9-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 12.9l-4.8-1.5c-1-.3-1-1 .2-1.5l18.8-7.2c.9-.3 1.6.2 1.4 1.6z",
  whatsapp:
    "M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2z",
  facebook: "M14 8V6.2c0-.8.2-1.2 1.4-1.2H17V2h-2.6C11.3 2 10 3.5 10 6v2H8v3h2v11h4V11h2.7L17 8h-3z",
  tiktok: "M16.6 5.8A4.3 4.3 0 0115.5 3h-3.1v12.4a2.6 2.6 0 11-1.8-2.5V9.7a5.7 5.7 0 104.9 5.7V9.1a7.3 7.3 0 004.3 1.4V7.4a4.3 4.3 0 01-3.2-1.6z",
  youtube: "M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15V9l5.2 3L10 15z",
};

export async function Footer({ settings, locale }: FooterProps) {
  const [t, tn, tf] = await Promise.all([getTranslations("footer"), getTranslations("newsletter"), getTranslations("nav")]);
  const year = new Date().getFullYear();
  const social = socialList(settings?.socials);
  const c = contactInfo(settings);
  const texts = siteTexts(settings?.homeContent, locale);

  const col = (title: string, links: { href: string; label: string }[]) => (
    <div>
      <h2 className="mb-[18px] font-caps text-[0.66rem] font-medium uppercase tracking-[0.3em] text-gold">{title}</h2>
      <ul className="flex flex-col gap-2.5 text-sm text-muted">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="transition-colors hover:text-champagne">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="mt-24 border-t border-line bg-paper pb-8 pt-20 md:mt-32">
      <div className="page-x mx-auto max-w-[var(--container-page)]">
        <div className="grid gap-11 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="md:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="FABIANO" className="logo-script inline-block text-[3.375rem]">Fabiano</Link>
            <p className="mt-2.5 max-w-xs whitespace-pre-line text-sm text-muted">{texts.footerText || tn("text")}</p>
            {social.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {social.map((x) => (
                  <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label} className="grid h-[42px] w-[42px] place-items-center rounded-full border border-line transition-all duration-300 hover:bg-gold hover:text-canvas">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={ICONS[x.key]} /></svg>
                  </a>
                ))}
              </div>
            )}
            <NewsletterForm compact source="footer" className="mt-6 max-w-xs" />
          </div>

          {col(t("help"), [
            { href: "/pages/shipping-returns", label: t("shipping") },
            { href: "/pages/faq", label: t("faq") },
            { href: "/pages/privacy", label: t("privacy") },
            { href: "/account", label: tf("account") },
          ])}
          {col(t("company"), [
            { href: "/pages/about", label: t("about") },
            { href: "/pages/terms", label: t("terms") },
            { href: "/catalog?new=1", label: tf("newArrivals") },
            { href: "/catalog?sale=1", label: tf("sale") },
          ])}

          <div>
            <h2 className="mb-[18px] font-caps text-[0.66rem] font-medium uppercase tracking-[0.3em] text-gold">{t("contact")}</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-muted">
              {c.phone && <li><a href={`tel:${c.phone}`} className="price whitespace-nowrap transition-colors hover:text-champagne">{formatUzPhone(c.phone)}</a></li>}
              {c.phone2 && <li><a href={`tel:${c.phone2}`} className="price whitespace-nowrap transition-colors hover:text-champagne">{formatUzPhone(c.phone2)}</a></li>}
              {c.email && <li><a href={`mailto:${c.email}`} className="transition-colors hover:text-champagne">{c.email}</a></li>}
              {c.address && <li className="leading-relaxed">{c.address}</li>}
              {c.hours && <li>{c.hours}</li>}
              {!c.phone && !c.email && social.length === 0 && <li><Link href="/pages/contact" className="transition-colors hover:text-champagne">{t("contact")}</Link></li>}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-3.5 border-t border-hair pt-6 text-[0.78rem] text-muted">
          <span>© {year} FABIANO. {t("rights")}</span>
        </div>
      </div>
    </footer>
  );
}
