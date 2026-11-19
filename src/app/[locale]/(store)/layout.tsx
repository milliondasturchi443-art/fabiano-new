import { getLocale } from "next-intl/server";
import { Footer } from "@/components/layout/Footer";
import { AnywearWidget } from "@/components/layout/AnywearWidget";
import { getStoreSettings } from "@/services/catalog";
import { anywearReady } from "@/services/product";
import { isLocale } from "@/i18n/routing";

// Без headers(): иначе все страницы витрины станут динамическими (Render сам задаёт RENDER_EXTERNAL_URL)
function siteDomain(): string {
  const env = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  try { return env ? new URL(env).hostname : "fabiano-store.onrender.com"; } catch { return "fabiano-store.onrender.com"; }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, l] = await Promise.all([getStoreSettings().catch(() => null), getLocale()]);
  // Плавающее окно Anywear — только когда магазин зарегистрирован у Anywear (ANYWEAR_ENABLED=1)
  const anywear = settings?.tryOnProvider === "anywear" && anywearReady();
  return (
    <>
      {children}
      <Footer settings={settings} locale={isLocale(l) ? l : "uz"} />
      {anywear && <AnywearWidget domain={siteDomain()} />}
    </>
  );
}
