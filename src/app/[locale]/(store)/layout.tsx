import { getLocale } from "next-intl/server";
import { Footer } from "@/components/layout/Footer";
import { getStoreSettings } from "@/services/catalog";
import { isLocale } from "@/i18n/routing";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, l] = await Promise.all([getStoreSettings().catch(() => null), getLocale()]);
  return (
    <>
      {children}
      <Footer settings={settings} locale={isLocale(l) ? l : "uz"} />
    </>
  );
}
