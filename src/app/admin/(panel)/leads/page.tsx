import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatUzPhone } from "@/lib/phone";
import { requireAdmin } from "@/features/admin/guard";
import { deleteLeadAction, toggleLeadAction } from "@/features/admin/store-actions";
import { ConfirmButton } from "@/components/admin/ui";

export const metadata = { title: "Murojaatlar" };

export default async function AdminLeads({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("orders:read");
  const { status = "NEW" } = await searchParams;
  const filter = status === "DONE" ? "DONE" : status === "ALL" ? undefined : "NEW";
  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({ where: filter ? { status: filter } : {}, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: "NEW" | "DONE") => counts.find((c) => c.status === s)?._count ?? 0;
  const tabs = [
    { k: "NEW", label: `Yangi (${count("NEW")})` },
    { k: "DONE", label: `Bogʻlanildi (${count("DONE")})` },
    { k: "ALL", label: "Hammasi" },
  ];
  const productIds = [...new Set(leads.map((l) => l.productId).filter((x): x is string => Boolean(x)))];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sku: true, translations: { where: { locale: "uz" }, select: { name: true } } } })
    : [];
  const pName = new Map(products.map((p) => [p.id, p.translations[0]?.name ?? p.sku]));

  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Murojaatlar</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">Saytdagi «Raqamingizni qoldiring» formasidan kelgan soʻrovlar. Mijozga qoʻngʻiroq qilgach, «Bogʻlanildi» deb belgilang.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.k} href={`?status=${t.k}`} className={`h-[38px] content-center border px-4 font-caps text-[0.625rem] uppercase tracking-[0.2em] ${(status || "NEW") === t.k ? "border-gold bg-gold text-canvas" : "border-line text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-muted">Bu boʻlimda murojaatlar yoʻq.</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-[0.6875rem] uppercase tracking-wider text-muted">
              <tr><th className="p-3 font-medium">Sana</th><th className="p-3 font-medium">Mijoz</th><th className="p-3 font-medium">Telefon</th><th className="p-3 font-medium">Savol</th><th className="p-3 font-medium">Holat</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {leads.map((l) => (
                <tr key={l.id} className={l.status === "DONE" ? "opacity-60" : ""}>
                  <td className="whitespace-nowrap p-3 text-muted">{l.createdAt.toLocaleString("uz-Latn-UZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tashkent" })}</td>
                  <td className="p-3">{l.firstName} {l.lastName}<p className="text-xs uppercase text-muted">{l.locale}</p></td>
                  <td className="p-3"><a href={`tel:${l.phone}`} className="price link-underline whitespace-nowrap text-champagne">{formatUzPhone(l.phone)}</a></td>
                  <td className="max-w-xs p-3 text-muted">
                    {l.question || "—"}
                    {l.productId && <p className="mt-1 text-xs"><Link href={`/admin/products/${l.productId}`} className="link-underline text-gold">{pName.get(l.productId) ?? "Mahsulot"}</Link></p>}
                  </td>
                  <td className="p-3">
                    <form action={toggleLeadAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className={`pill ${l.status === "NEW" ? "bg-[rgb(234_180_90/0.15)] text-[#f0c27a]" : "bg-success/10 text-success"}`} title="Almashtirish uchun bosing">
                        {l.status === "NEW" ? "Yangi" : "Bogʻlanildi"}
                      </button>
                    </form>
                  </td>
                  <td className="p-3 text-right">
                    <form action={deleteLeadAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <ConfirmButton label="Oʻchirish" confirm="Murojaatni oʻchirasizmi?" />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
