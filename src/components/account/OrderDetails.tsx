import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/money";
import type { OrderView } from "@/services/order-view";
import type { AppLocale } from "@/i18n/routing";

export async function OrderDetails({ order, locale }: { order: OrderView; locale: AppLocale }) {
  const [t, tc, tk] = await Promise.all([getTranslations("account"), getTranslations("cart"), getTranslations("checkout")]);
  const money = (v: { toString(): string }) => formatMoney(v.toString(), locale, order.currency);
  const a = order.address;
  const payment = order.payments[0];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
      <section aria-labelledby="items-title">
        <h2 id="items-title" className="eyebrow font-sans">{t("items")}</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 py-4">
              <div className="relative aspect-[3/4] overflow-hidden bg-surface">
                {i.image && <Image src={i.image} alt={i.productName} fill sizes="72px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm">{i.productName}</p>
                <p className="mt-1 text-xs text-muted">{tc("color")}: {i.colorName} · {tc("size")}: {i.sizeCode} · {i.sku}</p>
                <p className="price mt-1 text-xs text-muted">{i.quantity} × {money(i.unitPrice)}</p>
              </div>
              <p className="price text-sm">{money(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{tc("subtotal")}</dt><dd className="price">{money(order.subtotal)}</dd></div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between"><dt className="text-muted">{tc("discount")}{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="price text-accent">−{money(order.discountTotal)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted">{tc("shipping")}</dt><dd className="price">{Number(order.shippingTotal) === 0 ? tk("free") : money(order.shippingTotal)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt>{tc("total")}</dt><dd className="price">{money(order.grandTotal)}</dd></div>
        </dl>
      </section>

      <aside className="card h-fit space-y-6 p-6 text-sm md:p-8">
        <div>
          <p className="eyebrow text-muted">{t("status")}</p>
          <p className="mt-2 text-base">{t(`statuses.${order.status}`)}</p>
        </div>
        {order.deliveryDate && (
          <div>
            <p className="eyebrow text-muted">{(await getTranslations("receipt"))("deliveryDate")}</p>
            <p className="mt-2 text-base capitalize">{order.deliveryDate.toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "uz-Latn-UZ", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
          </div>
        )}
        <div>
          <p className="eyebrow text-muted">{t("payment")}</p>
          <p className="mt-2">{payment?.provider === "CASH_ON_DELIVERY" ? tk("cod") : payment?.provider ?? "—"}</p>
          <p className="mt-1 text-muted">{t(`paymentStatuses.${order.paymentStatus}`)}</p>
        </div>
        <div>
          <p className="eyebrow text-muted">{t("delivery")}</p>
          <p className="mt-2">{order.delivery.name}</p>
        </div>
        <div>
          <p className="eyebrow text-muted">{t("address")}</p>
          <p className="mt-2 leading-relaxed">
            {order.firstName} {order.lastName}<br />
            {order.phone}<br />
            {[a.region, a.district].filter(Boolean).join(", ")}<br />
            {[a.street, a.house, a.apartment].filter(Boolean).join(", ")}
          </p>
          {order.customerComment && <p className="mt-2 text-muted">«{order.customerComment}»</p>}
        </div>
      </aside>
    </div>
  );
}
