import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/admin/guard";
import { adminLogoutAction } from "@/features/admin/auth-actions";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [me, newOrders, newLeads] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true, email: true } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.lead.count({ where: { status: "NEW" } }),
  ]);
  const name = me?.firstName || me?.email?.split("@")[0] || "Admin";
  return (
    <div className="adm">
      <aside className="adm-side">
        <a href="/admin/orders" className="brand" aria-label="Boshqaruv paneli">
          <span className="logo-script">Fabiano</span>
          <small>BOSHQARUV PANELI</small>
        </a>
        <div className="who">
          <div className="av">{name.slice(0, 1).toUpperCase()}</div>
          <div><b>{name}</b><span>ADMIN</span></div>
        </div>
        <AdminNav counts={{ orders: newOrders, leads: newLeads }} />
        <div className="foot">
          <form action={adminLogoutAction}><button type="submit" className="lnk-btn">Chiqish</button></form>
          <a href="/uz" target="_blank" rel="noopener" className="lnk-btn">← Saytga qaytish</a>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
