import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/admin/guard";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { loadEditorOptions, loadEditorProduct } from "@/features/admin/product-form-data";

export const metadata = { title: "Mahsulotni tahrirlash" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ need?: string }> }) {
  await requireAdmin("products:write");
  const { id } = await params;
  const { need } = await searchParams;
  const [data, options] = await Promise.all([loadEditorProduct(id), loadEditorOptions()]);
  if (!data) notFound();
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Link href="/admin/products" className="mb">← Mahsulotlarga qaytish</Link>
        {data.active && data.slug && <a href={`/uz/product/${data.slug}`} target="_blank" rel="noopener" className="mb">Saytda ochish ↗</a>}
      </div>
      <h2 className="h" style={{ marginTop: 16 }}>Mahsulotni tahrirlash</h2>
      <p className="sub">Yulduzcha (*) bilan belgilanganlar majburiy.{data.sku ? ` Artikul: ${data.sku}` : ""}</p>
      {need && <div className="anote">Sotuvga chiqarish uchun rasm va kamida bitta oʻlcham sonini qoʻshing.</div>}
      <ProductEditor data={data} options={options} />
    </div>
  );
}
