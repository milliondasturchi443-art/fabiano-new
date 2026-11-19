import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/features/admin/guard";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/features/orders/order-number";
import { changeOrderStatusAction } from "@/features/admin/store-actions";
import { ActionForm, inputCls, labelCls } from "@/components/admin/ui";
import { ORDER_STATUS, PAYMENT_STATUS, PROVIDER } from "@/components/admin/labels";

export const metadata = { title: "Buyurtma" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders:read");
  const { id } = await params;
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      user: { select: { id: true, email: true } },
      statusHistory: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { email: true } } } },
    },
  });
  if (!o) notFound();
  const money = (v: { toString(): string }) => formatMoney(v.toString(), "uz", o.currency);
  const a = o.shippingAddress as Record<string, string | null>;
  const delivery = o.deliverySnapshot as { name?: string };
  const next = ORDER_STATUS_TRANSITIONS[o.status as OrderStatus];
  const dt = (d: Date) => d.toLocaleString("uz-Latn-UZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/orders" className="text-xs text-muted link-underline">← Barcha buyurtmalar</Link>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="price font-serif text-4xl md:text-5xl">{o.number}</h1>
          <span className={`pill ${ORDER_STATUS[o.status]?.cls}`}>{ORDER_STATUS[o.status]?.label}</span>
        </div>
        <p className="mt-2 text-sm text-muted">{dt(o.createdAt)}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-2xl">Buyurtma tarkibi</h2>
            <ul className="mt-4 divide-y divide-line">
              {o.items.map((i) => {
                const img = mediaUrl(i.imageKey);
                return (
                  <li key={i.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 py-3 text-sm">
                    <div className="relative aspect-[3/4] bg-surface">{img && <Image src={img} alt="" fill sizes="56px" className="object-cover" />}</div>
                    <div>
                      {i.productId ? <Link href={`/admin/products/${i.productId}`} className="link-underline">{i.productName}</Link> : i.productName}
                      <p className="text-xs text-muted">{i.sku} · {i.colorName} · {i.sizeCode}</p>
                      <p className="price text-xs text-muted">{i.quantity} × {money(i.unitPrice)}</p>
                    </div>
                    <p className="price">{money(i.lineTotal)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Mahsulotlar</dt><dd className="price">{money(o.subtotal)}</dd></div>
              {Number(o.discountTotal) > 0 && <div className="flex justify-between"><dt className="text-muted">Chegirma {o.couponCode}</dt><dd className="price text-accent">−{money(o.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Yetkazib berish</dt><dd className="price">{money(o.shippingTotal)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base"><dt>Jami</dt><dd className="price">{money(o.grandTotal)}</dd></div>
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl">Tarix</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {o.statusHistory.map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-3">
                  <span className="text-muted">{dt(h.createdAt)}</span>
                  <span>{h.fromStatus ? `${ORDER_STATUS[h.fromStatus]?.label} → ` : ""}<b className="font-medium">{ORDER_STATUS[h.toStatus]?.label}</b></span>
                  {h.changedBy?.email && <span className="text-muted">({h.changedBy.email})</span>}
                  {h.note && <span className="w-full text-muted">«{h.note}»</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          {next.length > 0 && (
            <section className="card border-wine/40 p-6">
              <h2 className="text-xl">Holatni oʻzgartirish</h2>
              <ActionForm action={changeOrderStatusAction} submit="Qoʻllash" className="mt-4 space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <label><span className={labelCls}>Yangi holat</span>
                  <select name="to" className={inputCls} required>
                    {next.map((s) => <option key={s} value={s}>{ORDER_STATUS[s]?.label}</option>)}
                  </select>
                </label>
                <label><span className={labelCls}>Izoh (tarixda koʻrinadi)</span><input name="note" maxLength={500} className={inputCls} /></label>
                <p className="text-xs text-muted">«Yuborildi» mahsulotni ombordan hisobdan chiqaradi. Yuborilgunga qadar «Bekor qilindi» bandni qaytaradi. «Yetkazildi» qabul qilganda toʻlovni toʻlangan deb belgilaydi.</p>
              </ActionForm>
            </section>
          )}
          <section className="card space-y-4 p-6 text-sm">
            <div><p className="text-xs text-muted">Xaridor</p><p className="mt-1">{o.firstName} {o.lastName}</p><p className="price"><a className="link-underline" href={`tel:${o.phone}`}>{o.phone}</a></p>{o.email && <p>{o.email}</p>}{o.user ? <Link href={`/admin/customers?q=${encodeURIComponent(o.user.email ?? "")}`} className="text-xs text-accent link-underline">Mijoz profili</Link> : <p className="text-xs text-muted">Mehmon buyurtmasi</p>}</div>
            <div><p className="text-xs text-muted">Yetkazib berish manzili</p><p className="mt-1 leading-relaxed">{[a.region, a.district].filter(Boolean).join(", ")}<br />{[a.street, a.house && `${a.house}-uy`, a.apartment && `${a.apartment}-xonadon`].filter(Boolean).join(", ")}</p>{o.customerComment && <p className="mt-1 text-muted">«{o.customerComment}»</p>}</div>
            <div><p className="text-xs text-muted">Yetkazib berish</p><p className="mt-1">{delivery.name}</p></div>
            <div><p className="text-xs text-muted">Toʻlov</p>{o.payments.map((p) => <p key={p.id} className="mt-1">{PROVIDER[p.provider]} — {PAYMENT_STATUS[p.status]}</p>)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
