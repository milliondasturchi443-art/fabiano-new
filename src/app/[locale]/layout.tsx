import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { fontVars } from "@/lib/fonts";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, locales, assertLocale } from "@/i18n/routing";
import { ErrorListener } from "@/components/ui/ErrorListener";
import "@/styles/globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0E0B0B",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL) ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: { default: t("title"), template: "%s — FABIANO" },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: { siteName: "FABIANO", locale, type: "website", images: [{ url: "/brand/og.jpg", width: 1200, height: 1200, alt: "FABIANO" }] },
    verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  assertLocale(locale);
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={fontVars}>
      <body className="min-h-svh bg-canvas pb-[calc(76px+env(safe-area-inset-bottom))] text-ink lg:pb-0">
        <ErrorListener />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
