import { prisma } from "@/lib/prisma";
import { formatUzPhone } from "@/lib/phone";
import { operatorOf } from "@/lib/validate-contact";
import { requireAdmin } from "@/features/admin/guard";
import { deleteLeadAction, toggleLeadAction } from "@/features/admin/store-actions";
import { CopyButton } from "@/components/admin/CopyButton";

export const metadata = { title: "Raqam qoldirganlar" };

export default async function AdminLeads() {
  await requireAdmin("orders:read");
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const productIds = [...new Set(leads.map((l) => l.productId).filter((x): x is string => Boolean(x)))];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sku: true, translations: { where: { locale: "uz" }, select: { name: true } } } })
    : [];
  const pName = new Map(products.map((p) => [p.id, p.translations[0]?.name ?? p.sku]));

  return (
    <div>
      <h2 className="h">Raqam qoldirganlar</h2>
      <p className="sub">«Raqamingizni qoldiring» formasi orqali kelgan soʻrovlar.</p>
      <div className="anote ok">✓ Onlayn baza ulangan — yangi soʻrovlar shu yerda darhol paydo boʻladi.</div>
      <div className="panel">
        <div className="atw">
          <table className="atbl">
            <thead><tr><th>Sana</th><th>Ism familiya</th><th>Telefon</th><th>Operator</th><th>Savol</th><th>Holat</th><th></th></tr></thead>
            <tbody>
              {leads.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 46, color: "var(--mut)" }}>Hozircha raqam qoldirilmagan</td></tr>}
              {leads.map((l) => {
                const digits = l.phone.replace(/\D/g, "").slice(-9);
                const done = l.status === "DONE";
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{l.createdAt.toLocaleString("uz-Latn-UZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tashkent" })}</td>
                    <td><b>{l.firstName} {l.lastName}</b></td>
                    <td className="pn"><a href={`tel:${l.phone}`}>{formatUzPhone(l.phone)}</a></td>
                    <td>{operatorOf(digits) ?? ""}</td>
                    <td style={{ fontSize: 13 }}>
                      {l.question || "—"}
                      {l.productId && pName.get(l.productId) && <div style={{ color: "var(--mut)" }}>{pName.get(l.productId)}</div>}
                    </td>
                    <td><span className={`st ${done ? "s3" : "s0"}`}>{done ? "Bogʻlanildi" : "Kutmoqda"}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <CopyButton value={l.phone} />
                        <form action={toggleLeadAction}><input type="hidden" name="id" value={l.id} /><button className={`mb ${done ? "" : "on"}`}>{done ? "Qaytarish" : "Bogʻlanildi"}</button></form>
                        <form action={deleteLeadAction}><input type="hidden" name="id" value={l.id} /><button className="mb red" aria-label="Oʻchirish">✕</button></form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
