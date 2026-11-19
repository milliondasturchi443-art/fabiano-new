"use client";

import { useMemo, useState } from "react";
import { ActionForm, inputCls, labelCls } from "./ui";
import { saveProductAction } from "@/features/admin/product-actions";

export interface ProductFormData {
  id?: string;
  sku: string;
  slug: string;
  brand: string;
  gender: "MEN" | "WOMEN" | "UNISEX";
  categoryId: string;
  price: string;
  compareAtPrice: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isNew: boolean;
  isFeatured: boolean;
  collectionIds: string[];
  translations: Record<"uz" | "ru" | "en", { name: string; description: string; material: string; care: string }>;
  variants: { colorId: string; sizeId: string; stock: number; reserved: number }[];
}

interface Option { id: string; label: string }

const LOC = [
  { k: "uz", label: "Oʻzbekcha", req: true },
  { k: "ru", label: "Ruscha", req: true },
  { k: "en", label: "Inglizcha", req: false },
] as const;

export function ProductForm({
  data, categories, collections, colors, sizes,
}: {
  data: ProductFormData;
  categories: { id: string; label: string; gender: string }[];
  collections: Option[];
  colors: { id: string; label: string; hex: string }[];
  sizes: Option[];
}) {
  const [tab, setTab] = useState<"uz" | "ru" | "en">("uz");
  const [gender, setGender] = useState(data.gender);
  const initialColors = [...new Set(data.variants.map((v) => v.colorId))];
  const initialSizes = [...new Set(data.variants.map((v) => v.sizeId))];
  const [selColors, setSelColors] = useState<string[]>(initialColors);
  const [selSizes, setSelSizes] = useState<string[]>(initialSizes);
  const [stock, setStock] = useState<Record<string, number>>(() => Object.fromEntries(data.variants.map((v) => [`${v.colorId}:${v.sizeId}`, v.stock])));
  const reserved = useMemo(() => Object.fromEntries(data.variants.map((v) => [`${v.colorId}:${v.sizeId}`, v.reserved])), [data.variants]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const orderedSizes = sizes.filter((s) => selSizes.includes(s.id));
  const orderedColors = colors.filter((c) => selColors.includes(c.id));
  const variantsJson = JSON.stringify(
    orderedColors.flatMap((c) => orderedSizes.map((s) => ({ colorId: c.id, sizeId: s.id, stock: Math.max(0, Math.floor(stock[`${c.id}:${s.id}`] ?? 0)) }))),
  );
  const cats = categories.filter((c) => gender === "UNISEX" || c.gender === gender);

  return (
    <ActionForm action={saveProductAction} submit={data.id ? "Oʻzgarishlarni saqlash" : "Mahsulot yaratish"} className="space-y-8">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="variants" value={variantsJson} />

      {/* Тексты на трёх языках */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Nomi va tavsifi</h2>
          <div role="tablist" className="flex border border-line">
            {LOC.map((l) => (
              <button key={l.k} type="button" role="tab" aria-selected={tab === l.k} onClick={() => setTab(l.k)} className={`h-9 px-4 text-xs font-semibold ${tab === l.k ? "bg-gold text-canvas" : "text-muted"}`}>
                {l.label}{l.req ? " *" : ""}
              </button>
            ))}
          </div>
        </div>
        {LOC.map((l) => (
          <div key={l.k} hidden={tab !== l.k} className="mt-5 grid gap-4">
            <label><span className={labelCls}>Nomi {l.req ? "*" : "(ixtiyoriy)"}</span><input name={`name_${l.k}`} defaultValue={data.translations[l.k].name} maxLength={120} className={inputCls} /></label>
            <label><span className={labelCls}>Tavsif {l.req ? "*" : ""}</span><textarea name={`description_${l.k}`} defaultValue={data.translations[l.k].description} rows={5} maxLength={4000} className="field field-sm mt-1.5" /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label><span className={labelCls}>Tarkibi / material</span><textarea name={`material_${l.k}`} defaultValue={data.translations[l.k].material} rows={2} className="field field-sm mt-1.5" /></label>
              <label><span className={labelCls}>Parvarish</span><textarea name={`care_${l.k}`} defaultValue={data.translations[l.k].care} rows={2} className="field field-sm mt-1.5" /></label>
            </div>
          </div>
        ))}
        <p className="mt-4 text-xs text-muted">Oʻzbekcha va ruscha majburiy. Inglizcha boʻlmasa, mahsulot saytning inglizcha versiyasida koʻrsatilmaydi.</p>
      </section>

      {/* Основное */}
      <section className="grid gap-4 card p-6 md:grid-cols-2 xl:grid-cols-4">
        <h2 className="text-2xl md:col-span-2 xl:col-span-4">Asosiy</h2>
        <label><span className={labelCls}>Artikul *</span><input name="sku" required defaultValue={data.sku} placeholder="FB-TS-001" className={`${inputCls} uppercase`} /></label>
        <label><span className={labelCls}>Narx, soʻm *</span><input name="price" required inputMode="numeric" defaultValue={data.price} placeholder="289000" className={`${inputCls} price`} /></label>
        <label><span className={labelCls}>Eski narx (chegirma uchun)</span><input name="compareAtPrice" inputMode="numeric" defaultValue={data.compareAtPrice} placeholder="349000" className={`${inputCls} price`} /></label>
        <label><span className={labelCls}>Brend</span><input name="brand" defaultValue={data.brand} className={inputCls} /></label>
        <label><span className={labelCls}>Kim uchun *</span>
          <select name="gender" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className={inputCls}>
            <option value="MEN">Erkaklar</option><option value="WOMEN">Ayollar</option><option value="UNISEX">Uniseks</option>
          </select>
        </label>
        <label><span className={labelCls}>Toifa *</span>
          <select name="categoryId" required defaultValue={data.categoryId} className={inputCls}>
            <option value="">— tanlang —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label><span className={labelCls}>Holat</span>
          <select name="status" defaultValue={data.status} className={inputCls}>
            <option value="DRAFT">Qoralama (xaridorlarga koʻrinmaydi)</option><option value="ACTIVE">Chop etilgan</option><option value="ARCHIVED">Arxivda</option>
          </select>
        </label>
        <label><span className={labelCls}>Sahifa manzili (slug)</span><input name="slug" defaultValue={data.slug} placeholder="avtomatik yaratiladi" className={inputCls} /></label>
        <div className="flex flex-wrap gap-6 md:col-span-2 xl:col-span-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isNew" defaultChecked={data.isNew} className="h-4 w-4 accent-[var(--color-gold)]" /> Yangi (New belgisi, «Yangi kelganlar» bloki)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={data.isFeatured} className="h-4 w-4 accent-[var(--color-gold)]" /> Tavsiya etilgan (katalogda yuqorida)</label>
        </div>
        {collections.length > 0 && (
          <fieldset className="md:col-span-2 xl:col-span-4">
            <legend className={labelCls}>Kolleksiyalar</legend>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="collectionIds" value={c.id} defaultChecked={data.collectionIds.includes(c.id)} className="h-4 w-4 accent-[var(--color-gold)]" />{c.label}</label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      {/* Варианты и остатки */}
      <section className="card p-6">
        <h2 className="text-2xl">Ranglar, oʻlchamlar va qoldiqlar</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <fieldset>
            <legend className={labelCls}>Ranglar</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((c) => (
                <button key={c.id} type="button" onClick={() => toggle(selColors, setSelColors, c.id)} aria-pressed={selColors.includes(c.id)} className={`flex h-9 items-center gap-2 border px-3 text-xs ${selColors.includes(c.id) ? "border-gold bg-gold text-canvas" : "border-line"}`}>
                  <span className="h-3.5 w-3.5 rounded-full border border-ink/20" style={{ backgroundColor: c.hex }} />{c.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Oʻlchamlar</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button key={s.id} type="button" onClick={() => toggle(selSizes, setSelSizes, s.id)} aria-pressed={selSizes.includes(s.id)} className={`h-9 min-w-11 border px-3 text-xs font-medium ${selSizes.includes(s.id) ? "border-gold bg-gold text-canvas" : "border-line"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {orderedColors.length > 0 && orderedSizes.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr><th className="p-2 text-left text-xs font-medium text-muted">Qoldiq, dona</th>{orderedSizes.map((s) => <th key={s.id} className="p-2 text-xs font-medium">{s.label}</th>)}</tr>
              </thead>
              <tbody>
                {orderedColors.map((c) => (
                  <tr key={c.id}>
                    <th className="whitespace-nowrap p-2 text-left font-normal"><span className="mr-2 inline-block h-3 w-3 rounded-full border border-ink/20 align-middle" style={{ backgroundColor: c.hex }} />{c.label}</th>
                    {orderedSizes.map((s) => {
                      const key = `${c.id}:${s.id}`;
                      return (
                        <td key={s.id} className="p-1.5">
                          <input type="number" min={reserved[key] ?? 0} max={100000} value={stock[key] ?? 0} onChange={(e) => setStock({ ...stock, [key]: Number(e.target.value) })} aria-label={`${c.label} ${s.label}`} className="field field-sm price w-20 px-2 text-center" />
                          {(reserved[key] ?? 0) > 0 && <p className="mt-0.5 text-center text-[0.625rem] text-accent">band {reserved[key]}</p>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">Qoldiq — omborda nechta dona borligi. Yuborilmagan buyurtmalardagi band qilingan miqdor joʻnatilganda hisobdan chiqariladi.</p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Kamida bitta rang va oʻlchamni tanlang — qoldiqlar jadvali paydo boʻladi.</p>
        )}
      </section>
    </ActionForm>
  );
}
