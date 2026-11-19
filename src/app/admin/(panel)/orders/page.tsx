import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatUzPhone } from "@/lib/phone";
import { requireAdmin } from "@/features/admin/guard";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/features/orders/order-number";
import { OrdersTable, type OrderRow } from "./OrdersTable";

export const metadata = { title: "Buyurtmalar" };

export default async function AdminOrders() {
  await requireAdmin("orders:read");
  const [orders, leads, revenue] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { items: true, payments: { select: { provider: true } } } }),
    prisma.lead.count(),
    prisma.order.aggregate({ where: { status: { notIn: ["CANCELLED", "REFUNDED"] } }, _sum: { grandTotal: true } }),
  ]);
  const money = (v: { toString(): string }) => formatMoney(v.toString(), "uz");

  const rows: OrderRow[] = orders.map((o) => {
    const a = o.shippingAddress as Record<string, string | null>;
    const delivery = o.deliverySnapshot as { name?: string; type?: string };
    return {
      id: o.id,
      number: o.number,
      date: o.createdAt.toLocaleString("uz-Latn-UZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tashkent" }),
      name: `${o.firstName} ${o.lastName}`.trim(),
      phone: formatUzPhone(o.phone),
      phoneRaw: o.phone,
      total: money(o.grandTotal),
      count: o.items.reduce((n, i) => n + i.quantity, 0),
      status: o.status,
      deliveryDate: o.deliveryDate ? o.deliveryDate.toISOString().slice(0, 10) : "",
      next: [...ORDER_STATUS_TRANSITIONS[o.status as OrderStatus]],
      address: [a.region, a.district, a.street, a.house && `${a.house}-uy`, a.apartment && `${a.apartment}-xonadon`].filter(Boolean).join(", "),
      comment: o.customerComment ?? "",
      delivery: delivery?.name ?? "",
      payment: o.payments[0]?.provider ?? "",
      items: o.items.map((i) => ({ name: i.productName, color: i.colorName, size: i.sizeCode, qty: i.quantity, total: money(i.lineTotal) })),
      search: `${o.number} ${o.firstName} ${o.lastName} ${o.phone}`.toLowerCase(),
    };
  });

  return (
    <div>
      <h2 className="h">Buyurtmalar</h2>
      <p className="sub">Mijozlar bergan buyurtmalar: ism, familiya, telefon va manzil.</p>
      <div className="anote ok">✓ Onlayn baza ulangan — oʻzgarishlar barcha mijozlarga koʻrinadi, buyurtmalar real vaqtda keladi.</div>
      <div className="kpis">
        <div className="kpi"><span>Jami</span><b>{orders.length}</b></div>
        <div className="kpi"><span>Yangi</span><b>{orders.filter((o) => o.status === "PENDING").length}</b></div>
        <div className="kpi"><span>Savdo hajmi</span><b style={{ fontSize: 24 }}>{money(revenue._sum.grandTotal ?? 0)}</b></div>
        <div className="kpi"><span>Raqam qoldirganlar</span><b>{leads}</b></div>
      </div>
      <OrdersTable rows={rows} />
    </div>
  );
}
