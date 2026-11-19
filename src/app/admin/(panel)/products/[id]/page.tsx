import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/features/admin/guard";
import { ProductForm } from "@/components/admin/ProductForm";
import { ActionForm, ConfirmButton, labelCls } from "@/components/admin/ui";
import { loadFormOptions, loadProductForm } from "@/features/admin/product-form-data";
import { deleteImageAction, deleteProductAction, updateImageAction, uploadImagesAction } from "@/features/admin/product-actions";

export const metadata = { title: "Mahsulotni tahrirlash" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin("products:write");
  const { id } = await params;
  const { saved } = await searchParams;
  const [data, options, images, orderCount] = await Promise.all([
    loadProductForm(id),
    loadFormOptions(),
    prisma.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" }, include: { color: true } }),
    prisma.orderItem.count({ where: { productId: id } }),
  ]);
  if (!data) notFound();
  const usedColors = options.colors.filter((c) => data.variants.some((v) => v.colorId === c.id));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/products" className="text-xs text-muted link-underline">← Barcha mahsulotlar</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl md:text-5xl">{data.translations.uz.name || data.sku}</h1>
          {data.status === "ACTIVE" && (
            <a href={`/uz/product/${data.slug}`} target="_blank" rel="noopener" className="btn btn-outline">Saytda ochish ↗</a>
          )}
        </div>
        {saved && <p role="status" className="mt-4 inline-block bg-success/10 px-3 py-2 text-sm text-success">Saqlandi.</p>}
      </div>

      <section id="images" className="card p-6">
        <h2 className="text-2xl">Rasmlar</h2>
        <p className="mt-2 text-xs text-muted">JPG, PNG, WebP, HEIC 12 MB gacha. Rasm rangga biriktiriladi — saytda rang tanlanganda oʻsha rangning rasmlari chiqadi. Tartibda birinchisi — asosiy rasm.</p>

        {images.length > 0 && (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {images.map((img) => {
              const url = mediaUrl(img.storageKey);
              return (
                <li key={img.id} className="border border-line bg-canvas">
                  <div className="relative aspect-[3/4] bg-surface">{url && <Image src={url} alt="" fill sizes="200px" className="object-cover" />}</div>
                  <form action={updateImageAction} className="space-y-2 p-2">
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="productId" value={id} />
                    <select name="colorId" defaultValue={img.colorId ?? ""} aria-label="Rang" className="h-8 w-full border border-line bg-paper px-1 text-xs">
                      <option value="">Barcha ranglar</option>
                      {options.colors.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <input name="sortOrder" type="number" min={0} max={999} defaultValue={img.sortOrder} aria-label="Tartib" className="h-8 w-16 border border-line bg-paper px-1 text-center text-xs" />
                      <button type="submit" className="h-8 flex-1 border border-line text-xs hover:border-gold">Saqlash</button>
                    </div>
                  </form>
                  <form action={deleteImageAction} className="px-2 pb-2 text-right">
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="productId" value={id} />
                    <ConfirmButton label="Oʻchirish" confirm="Bu rasmni oʻchirasizmi?" />
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <ActionForm action={uploadImagesAction} submit="Yuklash" resetOnOk encType="multipart/form-data" className="mt-6 grid gap-4 border-t border-line pt-6 md:grid-cols-[1fr_14rem]">
          <input type="hidden" name="productId" value={id} />
          <label>
            <span className={labelCls}>Fayllar (bir martada 12 tagacha)</span>
            <input name="files" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="mt-1.5 block w-full text-sm file:mr-4 file:h-11 file:border-0 file:bg-wine file:px-4 file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-cream" />
          </label>
          <label>
            <span className={labelCls}>Rang uchun</span>
            <select name="colorId" className="field field-sm mt-1.5">
              <option value="">Barcha ranglar</option>
              {(usedColors.length ? usedColors : options.colors).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </ActionForm>
      </section>

      <ProductForm data={data} {...options} />

      <section className="card border-danger/30 p-6">
        <h2 className="text-xl">Oʻchirish</h2>
        <p className="mt-2 text-sm text-muted">
          {orderCount > 0 ? `Mahsulot ${orderCount} ta buyurtma pozitsiyasida bor — u arxivga oʻtkaziladi, buyurtmalar tarixi saqlanadi.` : "Mahsulot va uning rasmlari butunlay oʻchiriladi."}
        </p>
        <form action={deleteProductAction} className="mt-4">
          <input type="hidden" name="id" value={id} />
          <ConfirmButton label={orderCount > 0 ? "Arxivga" : "Mahsulotni oʻchirish"} confirm={orderCount > 0 ? "Mahsulotni arxivga oʻtkazasizmi?" : "Mahsulotni butunlay oʻchirasizmi?"} />
        </form>
      </section>
    </div>
  );
}
