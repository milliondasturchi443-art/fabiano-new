import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Receipt } from "@/components/checkout/Receipt";
import { ReceiptActions } from "@/components/checkout/ReceiptActions";
import { getSessionUser } from "@/features/auth/session";
import { getOrderForViewer } from "@/services/order-view";
import { Link, assertLocale, type AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ n?: string; t?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  assertLocale(locale);
  const t = await getTranslations({ locale, namespace: "receipt" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Чек после оформления. Ссылка с токеном остаётся рабочей — по ней покупатель видит статус и день доставки. */
export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  setRequestLocale(locale);
  const [{ n, t: token }, user, t, tk] = await Promise.all([searchParams, getSessionUser(), getTranslations("receipt"), getTranslations("checkout")]);
  const order = n ? await getOrderForViewer(n, { userId: user?.id, guestToken: token }) : null;
  if (!order) notFound();
  const fresh = Date.now() - order.createdAt.getTime() < 30 * 60_000 && order.status === "PENDING";

  return (
    <>
      <SiteHeader />
      <main id="main" className="page-x mx-auto max-w-[var(--container-page)] py-10 md:py-14">
        <div className="print-hide mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-gold text-2xl text-champagne">✓</div>
          <h1 className="text-4xl md:text-5xl">{fresh ? t("thanks") : t("title")}</h1>
          {fresh && <p className="mx-auto mt-3 max-w-md text-muted">{t("sub")}</p>}
        </div>

        <Receipt order={order} locale={locale} />

        <div className="mx-auto mt-8 max-w-[34rem] space-y-5 text-center">
          <ReceiptActions printLabel={t("print")} copyLabel={t("copy")} copiedLabel={t("copied")} />
          <p className="print-hide text-sm text-muted">{t("track")}</p>
          <div className="print-hide flex flex-wrap justify-center gap-5">
            <Link href="/catalog" className="lnk">{tk("continue")}</Link>
            {order.userId && <Link href={`/account/orders/${order.number}`} className="lnk">{tk("viewInAccount")}</Link>}
          </div>
        </div>
      </main>
    </>
  );
}
