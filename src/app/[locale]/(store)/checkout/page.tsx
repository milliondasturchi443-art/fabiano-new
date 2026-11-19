import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CheckoutForm, type DeliveryOption } from "@/components/checkout/CheckoutForm";
import { getCartView } from "@/services/cart";
import { localized } from "@/services/catalog";
import { getSessionUser } from "@/features/auth/session";
import { formatUzPhone } from "@/lib/phone";
import { Link, assertLocale, type AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const [t, cart, user, methods, cod] = await Promise.all([
    getTranslations("checkout"),
    getCartView(locale),
    getSessionUser(),
    prisma.deliveryMethod.findMany({ where: { isEnabled: true }, orderBy: { sortOrder: "asc" } }),
    prisma.paymentMethodConfig.findMany({ where: { isEnabled: true }, select: { provider: true } }),
  ]);
  // Порядок: по договорённости с администратором, затем Payme, Click
  const ORDER = ["CASH_ON_DELIVERY", "PAYME", "CLICK"] as const;
  const payments = ORDER.filter((p) => cod.some((c) => c.provider === p));

  // Пустая корзина: показываем сообщение без redirect (redirect во время экшена оформления обрывал ответ)
  if (cart.lines.length === 0) {
    const tc = await getTranslations("cart");
    return (
      <>
        <SiteHeader />
        <main id="main" className="page-x mx-auto flex max-w-[var(--container-page)] flex-col items-center py-24 text-center">
          <h1 className="text-4xl md:text-5xl">{tc("empty")}</h1>
          <Link href="/catalog" className="btn btn-primary mt-8">{tc("continue")}</Link>
        </main>
      </>
    );
  }

  const deliveries: DeliveryOption[] = methods.map((m) => ({
    id: m.id,
    type: m.type,
    name: localized(m.names, locale) || m.type,
    price: m.price.toString(),
    freeFrom: m.freeFrom?.toString() ?? null,
    etaDays: m.etaDays,
    regions: m.regions,
  }));
  const ready = deliveries.length > 0 && payments.length > 0;

  return (
    <>
      <SiteHeader />
      <main id="main" className="page-x mx-auto max-w-[var(--container-page)] py-10 md:py-14">
        <h1 className="text-5xl md:text-6xl">{t("title")}</h1>
        <div className="mt-10">
          {ready ? (
            <CheckoutForm
              cart={cart}
              deliveries={deliveries}
              payments={[...payments]}
              prefill={{ firstName: user?.firstName, lastName: user?.lastName, phone: user?.phone ? formatUzPhone(user.phone) : null, email: user?.email }}
            />
          ) : (
            <div className="card max-w-xl p-8">
              <p className="text-ink/85">{t("unavailable")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pages/contact" className="btn btn-primary">{(await getTranslations("footer"))("contact")}</Link>
                <Link href="/cart" className="btn btn-outline">{(await getTranslations("cart"))("title")}</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
