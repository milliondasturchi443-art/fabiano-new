"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, type AppLocale } from "@/i18n/routing";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { CartCount } from "./CartCount";
import { BagIcon, CloseIcon, HeartIcon, SearchIcon, UserIcon } from "@/components/ui/icons";

export interface NavCategory {
  slug: string;
  name: string;
}

interface HeaderProps {
  enabledLocales?: readonly AppLocale[];
  categories: { men: NavCategory[]; women: NavCategory[] };
  announcement?: string | null;
}

/** Шапка из прототипа: объявление, меню с выпадающими категориями, золотой рукописный логотип, нижняя мобильная панель. */
export function Header({ enabledLocales, categories, announcement }: HeaderProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = [
    { key: "men" as const, href: "/men", items: categories.men },
    { key: "women" as const, href: "/women", items: categories.women },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const navLink = "relative whitespace-nowrap py-1.5 font-caps text-[0.6875rem] uppercase tracking-[0.24em] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 hover:after:scale-x-100";
  const iconBtn = "grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-gold/10";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-gold focus:px-4 focus:py-2 focus:text-canvas">
        {t("skipToContent")}
      </a>

      {announcement && (
        <div className="bg-wine px-4 py-2.5 text-center font-caps text-[0.66rem] uppercase tracking-[0.28em] text-champagne">{announcement}</div>
      )}

      <header className="sticky top-0 z-[60] border-b border-hair bg-canvas/90 backdrop-blur-xl">
        <div className="page-x mx-auto grid h-[66px] max-w-[var(--container-page)] grid-cols-[44px_1fr_44px] items-center lg:h-[84px] lg:grid-cols-[1fr_auto_1fr]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("menu")}
            aria-expanded={open}
            aria-controls="site-drawer"
            className={`${iconBtn} lg:hidden`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden><path d="M3 7h18M3 12h18M3 17h12" /></svg>
          </button>

          <nav aria-label={t("mainNav")} className="hidden lg:block">
            <ul className="flex items-center gap-7 xl:gap-8">
              {groups.map((g) => (
                <li key={g.key} className="group relative flex h-[84px] items-center">
                  <Link href={g.href} className={`${navLink} ${isActive(g.href) ? "after:scale-x-100" : ""}`}>{t(g.key)}</Link>
                  {g.items.length > 0 && (
                    <div className="invisible absolute left-[-24px] top-[84px] grid min-w-60 translate-y-2 gap-0.5 border border-line bg-paper px-6 py-[18px] opacity-0 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)] transition-all duration-300 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      {g.items.map((c) => (
                        <Link key={c.slug} href={`${g.href}/${c.slug}`} className="py-1 font-serif text-xl transition-[color,padding] duration-300 hover:pl-1.5 hover:text-champagne">
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              <li className="flex h-[84px] items-center"><Link href="/catalog?new=1" className={navLink}>{t("newShort")}</Link></li>
              <li className="flex h-[84px] items-center"><Link href="/catalog?sale=1" className={`${navLink} text-gold`}>{t("sale")}</Link></li>
            </ul>
          </nav>

          <Link href="/" aria-label="FABIANO" className="logo-script justify-self-center text-[2.5rem] lg:text-5xl">
            Fabiano
          </Link>

          <div className="flex items-center justify-end gap-1">
            <LocaleSwitcher enabled={enabledLocales} className="mr-3 hidden xl:flex" />
            <Link href="/search" aria-label={t("search")} className={iconBtn}><SearchIcon width={20} height={20} /></Link>
            <Link href="/wishlist" aria-label={t("wishlist")} className={`${iconBtn} hidden lg:grid`}><HeartIcon width={20} height={20} /></Link>
            <Link href="/account" aria-label={t("account")} className={`${iconBtn} hidden lg:grid`}><UserIcon width={20} height={20} /></Link>
            <Link href="/cart" aria-label={t("cart")} className={`${iconBtn} relative hidden lg:grid`}><BagIcon width={20} height={20} /><CartCount /></Link>
          </div>
        </div>
      </header>

      {/* Выезжающее меню (mobile) */}
      <div className={`fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm transition-all duration-300 lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`} onClick={() => setOpen(false)} aria-hidden />
      <aside
        id="site-drawer"
        aria-label={t("menu")}
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[95] w-[min(360px,86vw)] overflow-y-auto border-r border-line bg-paper px-6 pb-[calc(30px+env(safe-area-inset-bottom))] pt-5 transition-transform duration-[450ms] ease-[var(--ease-fabiano)] lg:hidden ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="logo-script text-[2.5rem]">Fabiano</span>
          <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className={iconBtn}><CloseIcon width={20} height={20} /></button>
        </div>
        {groups.map((g) => (
          <div key={g.key}>
            <Link href={g.href} className="block border-b border-hair py-2.5 font-serif text-[1.75rem]">{t(g.key)}</Link>
            {g.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2.5 pl-3 pt-1.5">
                {g.items.map((c) => (
                  <Link key={c.slug} href={`${g.href}/${c.slug}`} className="border border-line px-2.5 py-1 text-[0.8125rem] text-muted transition-colors hover:text-champagne">{c.name}</Link>
                ))}
              </div>
            )}
          </div>
        ))}
        <Link href="/catalog?new=1" className="block border-b border-hair py-2.5 font-serif text-[1.75rem]">{t("newArrivals")}</Link>
        <Link href="/catalog?sale=1" className="block border-b border-hair py-2.5 font-serif text-[1.75rem] text-gold">{t("sale")}</Link>
        <Link href="/collections" className="block border-b border-hair py-2.5 font-serif text-[1.75rem]">{t("collections")}</Link>
        <Link href="/pages/contact" className="block border-b border-hair py-2.5 font-serif text-[1.75rem]">{t("contact")}</Link>
        <LocaleSwitcher enabled={enabledLocales} className="mt-8" />
      </aside>

      {/* Нижняя панель (mobile) */}
      <nav aria-label={t("tabbar")} className="fixed inset-x-0 bottom-0 z-[70] flex h-[calc(70px+env(safe-area-inset-bottom))] items-center justify-around border-t border-line bg-[rgb(10_8_8/0.96)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <TabLink href="/" label={t("home")} active={isActive("/")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden><path d="M4 11l8-7 8 7v9H4z" /></svg></TabLink>
        <TabLink href="/catalog" label={t("catalog")} active={isActive("/catalog") || isActive("/men") || isActive("/women")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden><path d="M4 6h16M4 12h16M4 18h10" /></svg></TabLink>
        <Link href="/cart" aria-label={t("cart")} className="relative -mt-[30px] flex h-[60px] w-[60px] items-center justify-center rounded-full border-4 border-canvas bg-[linear-gradient(135deg,#efd8a9_0%,#c8a46a_45%,#a37d45_100%)] text-canvas shadow-[0_10px_24px_-8px_rgb(200_164_106/0.6)]">
          <BagIcon width={21} height={21} strokeWidth={1.7} />
          <CartCount variant="tab" />
        </Link>
        <TabLink href="/wishlist" label={t("favShort")} active={isActive("/wishlist")}><HeartIcon width={20} height={20} /></TabLink>
        <TabLink href="/account" label={t("profile")} active={isActive("/account")}><UserIcon width={20} height={20} /></TabLink>
      </nav>
    </>
  );
}

function TabLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex w-16 flex-col items-center gap-1 font-caps text-[0.5rem] uppercase tracking-[0.12em] ${active ? "text-champagne" : "text-muted"}`}>
      {children}
      {label}
    </Link>
  );
}
