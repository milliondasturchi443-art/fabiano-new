import Link from "next/link";
import { requireAdmin } from "@/features/admin/guard";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { emptyEditorProduct, loadEditorOptions } from "@/features/admin/product-form-data";

export const metadata = { title: "Yangi mahsulot" };

export default async function NewProductPage() {
  await requireAdmin("products:write");
  const options = await loadEditorOptions();
  return (
    <div>
      <Link href="/admin/products" className="mb">← Mahsulotlarga qaytish</Link>
      <h2 className="h" style={{ marginTop: 16 }}>Yangi mahsulot</h2>
      <p className="sub">Yulduzcha (*) bilan belgilanganlar majburiy.</p>
      <ProductEditor data={emptyEditorProduct} options={options} />
    </div>
  );
}
