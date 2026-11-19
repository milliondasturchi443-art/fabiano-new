import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/features/admin/guard";

export const metadata = { title: "Mahsulotlar" };

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Chop etilgan", cls: "bg-success/10 text-success" },
  DRAFT: { label: "Qoralama", cls: "bg-line text-muted" },
  ARCHIVED: { label: "Arxivda", cls: "bg-danger/10 text-danger" },
};

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireAdmin("products:read");
  const { q = "", status = "", page = "1" } = await searchParams;
  const take = 30;
  const current = Math.max(1, Number(page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(["ACTIVE", "DRAFT", "ARCHIVED"].includes(status) ? { status: status as "ACTIVE" } : {}),
    ...(q.trim()
      ? { OR: [{ sku: { contains: q.trim(), mode: "insensitive" } }, { translations: { some: { name: { contains: q.trim(), mode: "insensitive" } } } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (current - 1) * take,
      take,
      include: {
        translations: { where: { locale: "uz" }, select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { storageKey: true } },
        category: { include: { translations: { where: { locale: "uz" }, select: { name: true } } } },
        variants: { where: { isActive: true }, select: { inventory: { select: { quantity: true, reserved: true } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl md:text-5xl">Mahsulotlar <span className="price align-top font-sans text-base text-muted">{total}</span></h1>
        <Link href="/admin/products/new" className="btn btn-primary">Mahsulot qoʻshish</Link>
      </div>

      <form className="mt-8 flex flex-wrap gap-3" method="get">
        <input name="q" defaultValue={q} placeholder="Nomi yoki artikul" className="field field-sm min-w-0 flex-1" />
        <select name="status" defaultValue={status} className="field field-sm w-auto">
          <option value="">Barcha holatlar</option>
          <option value="ACTIVE">Chop etilganlar</option>
          <option value="DRAFT">Qoralamalar</option>
          <option value="ARCHIVED">Arxiv</option>
        </select>
        <button className="btn btn-outline btn-sm h-11">Qidirish</button>
      </form>

      {rows.length === 0 ? (
        <div className="mt-8 card p-10 text-center">
          <p className="text-muted">{q || status ? "Hech narsa topilmadi." : "Hozircha mahsulotlar yoʻq. Birinchi mahsulotni qoʻshing — chop etilgach, u darhol katalogda paydo boʻladi."}</p>
          {!q && !status && <Link href="/admin/products/new" className="btn btn-primary mt-6">Mahsulot qoʻshish</Link>}
        </div>
      ) : (
        <div className="mt-6 card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-[0.6875rem] uppercase tracking-wider text-muted">
              <tr>
                <th className="w-16 p-3" />
                <th className="p-3 font-medium">Mahsulot</th>
                <th className="p-3 font-medium">Toifa</th>
                <th className="p-3 font-medium">Narx</th>
                <th className="p-3 font-medium">Qoldiq</th>
                <th className="p-3 font-medium">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => {
                const img = mediaUrl(p.images[0]?.storageKey);
                const stock = p.variants.reduce((s, v) => s + Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0)), 0);
                return (
                  <tr key={p.id} className="hover:bg-canvas">
                    <td className="p-3">
                      <div className="relative h-14 w-11 overflow-hidden bg-surface">{img && <Image src={img} alt="" fill sizes="44px" className="object-cover" />}</div>
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/products/${p.id}`} className="link-underline font-medium">{p.translations[0]?.name ?? "(nomsiz)"}</Link>
                      <p className="text-xs text-muted">{p.sku}</p>
                    </td>
                    <td className="p-3 text-muted">{p.category.translations[0]?.name} · {p.gender === "MEN" ? "E" : p.gender === "WOMEN" ? "A" : "U"}</td>
                    <td className="price p-3">{formatMoney(p.price.toString(), "uz")}</td>
                    <td className={`price p-3 ${stock === 0 ? "text-danger" : ""}`}>{stock}</td>
                    <td className="p-3"><span className={`pill ${STATUS[p.status]?.cls}`}>{STATUS[p.status]?.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {current > 1 ? <Link className="link-underline" href={`?q=${encodeURIComponent(q)}&status=${status}&page=${current - 1}`}>← Orqaga</Link> : <span />}
          <span className="text-muted">{current} / {pages}</span>
          {current < pages ? <Link className="link-underline" href={`?q=${encodeURIComponent(q)}&status=${status}&page=${current + 1}`}>Oldinga →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
