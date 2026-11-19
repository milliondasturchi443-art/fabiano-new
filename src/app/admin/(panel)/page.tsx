import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/features/admin/guard";

export const metadata = { title: "Umumiy koʻrinish" };

const sum = (v: { toString(): string } | null | undefined) => formatMoney(v ? v.toString() : "0", "uz");

export default async function AdminOverview() {
  await requireAdmin();
  const since = new Date(Date.now() - 29 * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const [revenue, totalOrders, pending, completed, customers, products, lowStock, bestSellers, daily, monthly, recent, newLeads] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { grandTotal: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.user.count({ where: { roles: { none: { role: { name: { in: ["admin", "manager", "content_editor"] } } } } } }),
    prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.$queryRaw<{ sku: string; name: string | null; productId: string; free: number }[]>`
      SELECT v."sku", t."name", v."productId", (i."quantity" - i."reserved")::int AS free
      FROM "Inventory" i
      JOIN "ProductVariant" v ON v."id" = i."variantId" AND v."isActive"
      JOIN "Product" p ON p."id" = v."productId" AND p."status" = 'ACTIVE'
      LEFT JOIN "ProductTranslation" t ON t."productId" = p."id" AND t."locale" = 'uz'
      WHERE i."quantity" - i."reserved" <= i."lowStockThreshold"
      ORDER BY free ASC LIMIT 10`,
    prisma.product.findMany({
      where: { salesCount: { gt: 0 } },
      orderBy: { salesCount: "desc" },
      take: 5,
      select: { id: true, sku: true, salesCount: true, translations: { where: { locale: "uz" }, select: { name: true } } },
    }),
    prisma.$queryRaw<{ day: Date; total: string; orders: number }[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Tashkent') AS day,
             COALESCE(SUM("grandTotal"), 0)::text AS total, COUNT(*)::int AS orders
      FROM "Order" WHERE "createdAt" >= ${since} AND "status" <> 'CANCELLED'
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ month: Date; total: string; orders: number }[]>`
      SELECT date_trunc('month', "createdAt" AT TIME ZONE 'Asia/Tashkent') AS month,
             COALESCE(SUM("grandTotal"), 0)::text AS total, COUNT(*)::int AS orders
      FROM "Order" WHERE "createdAt" >= NOW() - INTERVAL '12 months' AND "status" <> 'CANCELLED'
      GROUP BY 1 ORDER BY 1`,
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, number: true, firstName: true, lastName: true, grandTotal: true, status: true, createdAt: true } }),
    prisma.lead.count({ where: { status: "NEW" } }),
  ]);

  // Ряд из 30 дней, включая дни без заказов
  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), Number(d.total)]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const dt = new Date(since.getTime() + i * 86_400_000);
    const key = dt.toISOString().slice(0, 10);
    return { key, label: dt.toLocaleDateString("uz-Latn-UZ", { day: "numeric", month: "short", timeZone: "Asia/Tashkent" }), total: byDay.get(key) ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.total));

  const stats = [
    { label: "Tushum (toʻlangan)", value: sum(revenue._sum.grandTotal) },
    { label: "Jami buyurtmalar", value: totalOrders.toLocaleString("uz-Latn-UZ") },
    { label: "Ishlov kutmoqda", value: pending.toLocaleString("uz-Latn-UZ"), href: "/admin/orders?status=PENDING" },
    { label: "Yetkazilgan", value: completed.toLocaleString("uz-Latn-UZ") },
    { label: "Xaridorlar", value: customers.toLocaleString("uz-Latn-UZ"), href: "/admin/customers" },
    { label: "Mahsulotlar", value: products.toLocaleString("uz-Latn-UZ"), href: "/admin/products" },
    { label: "Yangi murojaatlar", value: newLeads.toLocaleString("uz-Latn-UZ"), href: "/admin/leads" },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-4xl md:text-5xl">Umumiy koʻrinish</h1>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => (
          <li key={s.label} className="card p-5">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="price mt-3 text-xl">{s.href ? <Link href={s.href} className="link-underline">{s.value}</Link> : s.value}</p>
          </li>
        ))}
      </ul>

      <section className="card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl">30 kunlik savdo</h2>
          <p className="text-xs text-muted">Bekor qilinganlarsiz buyurtmalar summasi, kunlar boʻyicha (Toshkent)</p>
        </div>
        {daily.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Bu davrda buyurtmalar yoʻq.</p>
        ) : (
          <div className="mt-6 flex h-48 items-end gap-[3px]" role="img" aria-label="Kunlik savdo grafigi">
            {days.map((d) => (
              <div key={d.key} className="group relative flex-1">
                <div className="w-full bg-wine transition-colors group-hover:bg-accent" style={{ height: `${Math.max(d.total ? 4 : 1, (d.total / max) * 176)}px`, opacity: d.total ? 1 : 0.15 }} />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-[0.6875rem] text-cream group-hover:block">
                  {d.label}: {sum(d.total.toFixed(2))}
                </span>
              </div>
            ))}
          </div>
        )}
        {monthly.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-xs text-muted">
            {monthly.map((m) => (
              <span key={m.month.toISOString()}>
                {m.month.toLocaleDateString("uz-Latn-UZ", { month: "long", year: "numeric" })}: <span className="price text-ink">{sum(m.total)}</span> · {m.orders} ta buyurtma
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-6">
          <h2 className="text-2xl">Tugayapti</h2>
          {lowStock.length === 0 ? <p className="mt-4 text-sm text-muted">Barcha qoldiqlar meʼyorida.</p> : (
            <ul className="mt-4 divide-y divide-line text-sm">
              {lowStock.map((l) => (
                <li key={l.sku} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/products/${l.productId}`} className="link-underline min-w-0 truncate">{l.name ?? l.sku} <span className="text-xs text-muted">{l.sku}</span></Link>
                  <span className={`price shrink-0 ${l.free <= 0 ? "text-danger" : "text-accent"}`}>{l.free} dona</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-6">
          <h2 className="text-2xl">Eng koʻp sotilganlar</h2>
          {bestSellers.length === 0 ? <p className="mt-4 text-sm text-muted">Birinchi yuborilgan buyurtmalardan keyin paydo boʻladi.</p> : (
            <ol className="mt-4 divide-y divide-line text-sm">
              {bestSellers.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2.5">
                  <Link href={`/admin/products/${p.id}`} className="link-underline truncate">{p.translations[0]?.name ?? p.sku}</Link>
                  <span className="price shrink-0 text-muted">{p.salesCount} dona</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="card p-6">
          <h2 className="text-2xl">Soʻnggi buyurtmalar</h2>
          {recent.length === 0 ? <p className="mt-4 text-sm text-muted">Buyurtmalar hozircha yoʻq.</p> : (
            <ul className="mt-4 divide-y divide-line text-sm">
              {recent.map((o) => (
                <li key={o.id} className="flex justify-between gap-3 py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="link-underline price">{o.number}</Link>
                  <span className="truncate text-muted">{o.firstName} {o.lastName}</span>
                  <span className="price shrink-0">{sum(o.grandTotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
