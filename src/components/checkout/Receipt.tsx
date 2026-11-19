import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/money";
import { formatUzPhone } from "@/lib/phone";
import type { OrderView } from "@/services/order-view";
import type { AppLocale } from "@/i18n/routing";

const STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;
const RANK: Record<string, number> = { PENDING: 0, CONFIRMED: 1, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3 };
const DATE_LOCALE: Record<AppLocale, string> = { uz: "uz-Latn-UZ", ru: "ru-RU", en: "en-GB" };

/** Чек заказа: светлая «бумажная» карточка, которую можно распечатать или сохранить в PDF. */
export async function Receipt({ order, locale, eta }: { order: OrderView; locale: AppLocale; eta?: string | null }) {
  const [t, ta, tk] = await Promise.all([getTranslations("receipt"), getTranslations("account"), getTranslations("checkout")]);
  const money = (v: { toString(): string }) => formatMoney(v.toString(), locale, order.currency);
  const a = order.address;
  const dl = DATE_LOCALE[locale];
  const created = order.createdAt.toLocaleString(dl, { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tashkent" });
  const deliveryDay = order.deliveryDate
    ? order.deliveryDate.toLocaleDateString(dl, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    : null;
  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const rank = RANK[order.status] ?? 0;
  const payment = order.payments[0];
  const row = "flex justify-between gap-4 py-1.5";
  // 0 при цене курьера 0 = «по договорённости» (оператор скажет); 0 при платном курьере = бесплатно по сумме заказа
  const shippingLabel = Number(order.shippingTotal) > 0 ? money(order.shippingTotal)
    : Number(order.delivery.basePrice ?? order.delivery.price ?? 0) > 0 || order.delivery.type === "PICKUP" ? t("free") : t("shippingTbd");

  return (
    <article id="receipt" className="mx-auto w-full max-w-[34rem] bg-[#fbf7f0] px-6 py-8 text-[#1d1715] shadow-[0_30px_80px_rgb(0_0_0/0.45)] sm:px-10 sm:py-10">
      <header className="text-center">
        <p className="logo-script text-[3.25rem] leading-none" style={{ WebkitTextFillColor: "#7a5a2c", background: "none" }}>Fabiano</p>
        <p className="mt-1 font-caps text-[0.62rem] uppercase tracking-[0.32em] text-[#7a5a2c]">{t("title")}</p>
      </header>

      <div className="mt-6 border-y border-dashed border-[#c9b89c] py-4 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#6f6259]">{t("number")}</p>
        <p className="price mt-1 font-serif text-3xl">{order.number}</p>
        <p className="mt-1 text-xs text-[#6f6259]">{created}</p>
      </div>

      {/* Статус и день доставки */}
      <section className="mt-6" aria-label={t("status")}>
        {cancelled ? (
          <p className="rounded-sm bg-[#f3dede] px-4 py-3 text-center text-sm font-semibold text-[#9b2c2c]">{t("cancelled")}</p>
        ) : (
          <ol className="grid grid-cols-4 gap-1 text-center text-[0.66rem] leading-tight">
            {STEPS.map((s, i) => {
              const done = i <= rank;
              return (
                <li key={s} className="flex flex-col items-center gap-1.5">
                  <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${done ? "border-[#7a5a2c] bg-[#7a5a2c] text-[#fbf7f0]" : "border-[#c9b89c] text-[#a99a86]"}`}>{done ? "✓" : i + 1}</span>
                  <span className={done ? "font-semibold" : "text-[#8a7d70]"}>{t(`steps.${s}`)}</span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 bg-[#f1e8d8] px-4 py-3 text-sm">
          <span className="text-[#6f6259]">{t("deliveryDate")}</span>
          <b className={deliveryDay ? "text-right capitalize" : "text-right font-normal italic text-[#8a7d70]"}>{deliveryDay ?? t("deliveryDateTbd")}</b>
        </div>
        {!deliveryDay && !cancelled && eta && (
          <div className="mt-1 flex items-center justify-between gap-3 px-4 py-2 text-xs text-[#6f6259]">
            <span>{t("eta")}</span><span>{tk("eta", { days: eta })}</span>
          </div>
        )}
      </section>

      {/* Покупатель */}
      <dl className="mt-6 text-sm">
        <div className={row}><dt className="text-[#6f6259]">{t("customer")}</dt><dd className="text-right font-medium">{order.firstName} {order.lastName}</dd></div>
        <div className={row}><dt className="text-[#6f6259]">{t("phone")}</dt><dd className="price text-right">{formatUzPhone(order.phone)}</dd></div>
        <div className={row}>
          <dt className="shrink-0 text-[#6f6259]">{t("address")}</dt>
          <dd className="text-right">{[a.region, a.district, a.street, a.house && `${a.house}`, a.apartment && `kv. ${a.apartment}`].filter(Boolean).join(", ")}</dd>
        </div>
        <div className={row}><dt className="text-[#6f6259]">{t("delivery")}</dt><dd className="text-right">{order.delivery.name}</dd></div>
        <div className={row}><dt className="text-[#6f6259]">{t("payment")}</dt><dd className="text-right">{payment?.provider ? tk(`pay.${payment.provider as "PAYME"}.name`) : "—"} · {ta(`paymentStatuses.${order.paymentStatus}`)}</dd></div>
        {order.paymentStatus === "PENDING" && !cancelled && <p className="pb-1 text-right text-xs italic text-[#8a7d70]">{t("payWait")}</p>}
        {order.customerComment && <div className={row}><dt className="text-[#6f6259]">{tk("comment")}</dt><dd className="text-right italic">{order.customerComment}</dd></div>}
      </dl>

      {/* Товары */}
      <table className="mt-6 w-full border-t border-dashed border-[#c9b89c] text-sm">
        <thead>
          <tr className="text-left text-[0.66rem] uppercase tracking-[0.16em] text-[#6f6259]">
            <th className="py-3 font-medium">{t("item")}</th>
            <th className="py-3 text-center font-medium">{t("qty")}</th>
            <th className="py-3 text-right font-medium">{t("sum")}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="align-top">
              <td className="py-2 pr-2">
                {i.productName}
                <span className="block text-xs text-[#6f6259]">{i.colorName} · {i.sizeCode} · {money(i.unitPrice)}</span>
              </td>
              <td className="price py-2 text-center">{i.quantity}</td>
              <td className="price py-2 text-right">{money(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 border-t border-dashed border-[#c9b89c] pt-3 text-sm">
        <div className={row}><dt className="text-[#6f6259]">{t("subtotal")}</dt><dd className="price">{money(order.subtotal)}</dd></div>
        {Number(order.discountTotal) > 0 && <div className={row}><dt className="text-[#6f6259]">{t("discount")}{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="price">−{money(order.discountTotal)}</dd></div>}
        <div className={row}><dt className="text-[#6f6259]">{t("shipping")}</dt><dd className="price">{shippingLabel}</dd></div>
        <div className="mt-2 flex items-baseline justify-between border-t-2 border-[#1d1715] pt-3">
          <dt className="font-caps text-xs uppercase tracking-[0.2em]">{t("total")}</dt>
          <dd className="price font-serif text-2xl">{money(order.grandTotal)}</dd>
        </div>
      </dl>

      <p className="mt-8 text-center font-caps text-[0.6rem] uppercase tracking-[0.3em] text-[#7a5a2c]">fabiano-store.onrender.com</p>
    </article>
  );
}
