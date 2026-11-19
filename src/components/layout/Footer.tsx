import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { formatUzPhone } from "@/lib/phone";

interface FooterProps {
  socials?: { instagram?: string; telegram?: string } | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

const ICONS = {
  Instagram:
    "M12 7.3A4.7 4.7 0 1012 16.7 4.7 4.7 0 0012 7.3zm0 7.8a3.1 3.1 0 110-6.2 3.1 3.1 0 010 6.2zM17 6a1.1 1.1 0 100 2.2A1.1 1.1 0 0017 6zM16.1 2.1C14.5 2 9.5 2 7.9 2.1 4.6 2.3 2.3 4.6 2.1 7.9 2 9.5 2 14.5 2.1 16.1c.2 3.3 2.5 5.6 5.8 5.8 1.6.1 6.6.1 8.2 0 3.3-.2 5.6-2.5 5.8-5.8.1-1.6.1-6.6 0-8.2-.2-3.3-2.5-5.6-5.8-5.8zM20 16c-.1 2.4-1.6 3.9-4 4-1.5.1-6.5.1-8 0-2.4-.1-3.9-1.6-4-4-.1-1.5-.1-6.5 0-8 .1-2.4 1.6-3.9 4-4 1.5-.1 6.5-.1 8 0 2.4.1 3.9 1.6 4 4 .1 1.5.1 6.5 0 8z",
  Telegram:
    "M21.9 4.3l-3.2 15c-.2 1-.9 1.3-1.7.8l-4.9-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 12.9l-4.8-1.5c-1-.3-1-1 .2-1.5l18.8-7.2c.9-.3 1.6.2 1.4 1.6z",
} as const;

export async function Footer({ socials, contactPhone, contactEmail }: FooterProps) {
  const [t, tn, tf] = await Promise.all([getTranslations("footer"), getTranslations("newsletter"), getTranslations("nav")]);
  const year = new Date().getFullYear();
  const social = [
    socials?.instagram ? (["Instagram", socials.instagram] as const) : null,
    socials?.telegram ? (["Telegram", socials.telegram] as const) : null,
  ].filter((x): x is readonly ["Instagram" | "Telegram", string] => x !== null);

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
            <p className="mt-2.5 max-w-xs text-sm text-muted">{tn("text")}</p>
            {social.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {social.map(([name, href]) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="grid h-[42px] w-[42px] place-items-center rounded-full border border-line transition-all duration-300 hover:bg-gold hover:text-canvas">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={ICONS[name]} /></svg>
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
              {contactPhone && <li><a href={`tel:${contactPhone}`} className="price whitespace-nowrap transition-colors hover:text-champagne">{formatUzPhone(contactPhone)}</a></li>}
              {contactEmail && <li><a href={`mailto:${contactEmail}`} className="transition-colors hover:text-champagne">{contactEmail}</a></li>}
              {social.map(([name, href]) => (
                <li key={name}><a href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-champagne">{name}</a></li>
              ))}
              {!contactPhone && social.length === 0 && <li><Link href="/pages/contact" className="transition-colors hover:text-champagne">{t("contact")}</Link></li>}
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
