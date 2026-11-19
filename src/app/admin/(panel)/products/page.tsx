import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/features/admin/guard";
import { deleteProductAction, toggleProductVisibilityAction } from "@/features/admin/product-actions";
import { ConfirmButton } from "@/components/admin/ui";

export const metadata = { title: "Mahsulotlar" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  await requireAdmin("products:read");
  const { q = "", saved } = await searchParams;
  const rows = await prisma.product.findMany({
    where: {
      status: { not: "ARCHIVED" },
      ...(q.trim() ? { OR: [{ sku: { contains: q.trim(), mode: "insensitive" } }, { translations: { some: { name: { contains: q.trim(), mode: "insensitive" } } } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
    include: {
      translations: { where: { locale: "uz" }, select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { storageKey: true } },
      category: { include: { translations: { where: { locale: "uz" }, select: { name: true } } } },
      variants: { where: { isActive: true }, select: { inventory: { select: { quantity: true } } } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h2 className="h">Mahsulotlar</h2>
          <p className="sub">Saytdagi barcha mahsulotlarni shu yerdan qoʻshasiz va tahrirlaysiz.</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">+ Yangi mahsulot</Link>
      </div>
      {saved ? <div className="anote ok" role="status">✓ Saqlandi — oʻzgarishlar saytda darhol koʻrinadi.</div> : <div className="anote ok">✓ Onlayn baza ulangan — oʻzgarishlar barcha mijozlarga koʻrinadi.</div>}

      <div className="panel">
        <div className="panel-h">
          <h4>Jami: {rows.length}</h4>
          <form method="get" style={{ display: "flex", gap: 8 }}>
            <input name="q" defaultValue={q} className="inp inp-sm" style={{ width: 220 }} placeholder="Nomi yoki artikul" />
            <button className="mb">Qidirish</button>
          </form>
        </div>
        {rows.length === 0 ? (
          <div className="panel-b" style={{ textAlign: "center", padding: 50 }}>
            <p style={{ color: "var(--mut)" }}>{q ? "Hech narsa topilmadi." : "Hali mahsulot yoʻq."}</p>
            {!q && <Link href="/admin/products/new" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>Birinchi mahsulotni qoʻshish</Link>}
          </div>
        ) : rows.map((p) => {
          const img = mediaUrl(p.images[0]?.storageKey);
          const qty = p.variants.reduce((n, v) => n + (v.inventory?.quantity ?? 0), 0);
          const on = p.status === "ACTIVE";
          const off = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.compareAtPrice)) * 100) : 0;
          return (
            <div key={p.id} className={`prow ${on ? "" : "hid"}`}>
              <Link href={`/admin/products/${p.id}`} className="im">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img ? <img src={img} alt="" loading="lazy" /> : null}
              </Link>
              <div>
                <Link href={`/admin/products/${p.id}`}><b>{p.translations[0]?.name ?? p.sku}</b></Link>
                <div style={{ fontSize: 12, color: "var(--mut)" }}>
                  {p.gender === "MEN" ? "Erkaklar" : p.gender === "WOMEN" ? "Ayollar" : "Uniseks"} · {p.category.translations[0]?.name ?? p.category.slug} · {qty} dona
                </div>
              </div>
              <div>
                <b style={{ color: "var(--g2)" }} className="price">{formatMoney(p.price.toString(), "uz")}</b>
                {off > 0 && <div style={{ fontSize: 12, color: "var(--mut)" }}>−{off}%</div>}
              </div>
              <form action={toggleProductVisibilityAction} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className={`sw ${on ? "on" : ""}`} aria-label={on ? "Yashirish" : "Sotuvga chiqarish"} />
                {on ? "Sotuvda" : "Yashirin"}
              </form>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Link href={`/admin/products/${p.id}`} className="mb">Tahrirlash</Link>
                <form action={deleteProductAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton label="Oʻchirish" confirm="Mahsulotni oʻchirasizmi? Buyurtmalarda boʻlsa, arxivga oʻtadi." />
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
