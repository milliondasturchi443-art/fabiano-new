"use client";

import { useActionState, useEffect, useMemo, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { saveProductEditorAction } from "@/features/admin/product-actions";
import type { EditorOptions, EditorProduct } from "@/features/admin/product-form-data";

type Img = { kind: "old"; id: string; url: string } | { kind: "new"; key: string; file: File; url: string };

const CLOTHES = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const MAX_IMAGES = 10;

function sizeCodesFor(slug: string | undefined) {
  if (slug === "shoes") return SHOES;
  if (slug === "accessories") return ["ONE"];
  return CLOTHES;
}

/** Уменьшает фото в браузере (до 1600px по длинной стороне), чтобы загрузка была быстрой даже по мобильному интернету. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // HEIC и т.п. — отправим как есть, сервер сконвертирует
  }
}

export function ProductEditor({ data, options }: { data: EditorProduct; options: EditorOptions }) {
  const [state, dispatch, pending] = useActionState(saveProductEditorAction, null);
  const [gender, setGender] = useState(data.gender);
  const [categoryId, setCategoryId] = useState(data.categoryId);
  const [colorIds, setColorIds] = useState<string[]>(data.colorIds);
  const [stock, setStock] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(data.stock).map(([k, v]) => [k, String(v)])));
  const [imgs, setImgs] = useState<Img[]>(() => data.images.map((i) => ({ kind: "old" as const, ...i })));
  const [preparing, setPreparing] = useState(false);
  const [langs, setLangs] = useState(Boolean(data.names.ru || data.names.en));
  const [price, setPrice] = useState(data.price);
  const [disc, setDisc] = useState(data.disc);
  const errRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => imgs.forEach((i) => i.kind === "new" && URL.revokeObjectURL(i.url)), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state?.error) errRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [state]);

  const cats = options.categories.filter((c) => gender === "UNISEX" || c.gender === gender);
  const cat = options.categories.find((c) => c.id === categoryId);
  const sizes = useMemo(() => {
    const codes = new Set(sizeCodesFor(cat?.slug));
    for (const k of Object.keys(data.stock)) {
      const s = options.sizes.find((x) => x.id === k.split(":")[1]);
      if (s) codes.add(s.code);
    }
    return options.sizes.filter((s) => codes.has(s.code));
  }, [cat?.slug, data.stock, options.sizes]);
  const selColors = options.colors.filter((c) => colorIds.includes(c.id));

  const finalPrice = (() => {
    const b = Number(price.replace(/\s/g, ""));
    const d = Number(disc || 0);
    return b > 0 && d > 0 && d <= 90 ? Math.max(100, Math.round((b * (100 - d)) / 100 / 100) * 100) : null;
  })();

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setPreparing(true);
    const room = MAX_IMAGES - imgs.length;
    const picked = [...list].slice(0, Math.max(0, room));
    const ready: Img[] = [];
    for (const f of picked) {
      const file = await shrink(f);
      ready.push({ kind: "new", key: `${Date.now()}-${Math.random()}`, file, url: URL.createObjectURL(file) });
    }
    setImgs((cur) => [...cur, ...ready]);
    setPreparing(false);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const order: string[] = [];
    let n = 0;
    for (const i of imgs) {
      if (i.kind === "old") order.push(`old:${i.id}`);
      else { fd.append("newImages", i.file, i.file.name); order.push(`new:${n++}`); }
    }
    fd.set("imageOrder", JSON.stringify(order));
    const rows = selColors.flatMap((c) => sizes.flatMap((s) => {
      const v = stock[`${c.id}:${s.id}`];
      return v === undefined || v === "" ? [] : [{ colorId: c.id, sizeId: s.id, stock: Math.max(0, Math.floor(Number(v) || 0)) }];
    }));
    fd.set("stock", JSON.stringify(rows));
    startTransition(() => dispatch(fd));
  }

  const busy = pending || preparing;

  return (
    <form onSubmit={submit} noValidate>
      {data.id && <input type="hidden" name="id" value={data.id} />}

      <div className="panel">
        <div className="panel-h"><h4>Rasmlar ({imgs.length}/{MAX_IMAGES})</h4></div>
        <div className="panel-b">
          <div className="imgs">
            {imgs.map((im, i) => (
              <div className="t" key={im.kind === "old" ? im.id : im.key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" />
                <button type="button" className="x" aria-label="Rasmni olib tashlash" onClick={() => setImgs((cur) => cur.filter((_, k) => k !== i))}>✕</button>
                {i === 0 ? <span className="main">ASOSIY</span> : (
                  <button type="button" className="main" onClick={() => setImgs((cur) => [cur[i]!, ...cur.filter((_, k) => k !== i)])}>ASOSIY QILISH</button>
                )}
              </div>
            ))}
            {imgs.length < MAX_IMAGES && (
              <label className="add">
                {preparing ? "Tayyorlanmoqda…" : "+ Rasm qoʻshish"}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <p className="hint" style={{ fontSize: 12, marginTop: 10, color: "var(--mut)" }}>
            Birinchi rasm asosiy boʻladi. Tik (portret) rasm eng chiroyli koʻrinadi. Oq fonda faqat kiyimning oʻzi tushgan rasm — jonli kiyib koʻrish uchun eng yaxshisi.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><h4>Asosiy maʼlumotlar</h4></div>
        <div className="panel-b fgrid">
          <div className="fld full"><label htmlFor="pe-name">Nomi *</label><input id="pe-name" className="inp" name="name_uz" defaultValue={data.names.uz} placeholder="Masalan: Kashmir palto" maxLength={120} /></div>
          <div className="fld">
            <label htmlFor="pe-g">Boʻlim *</label>
            <select id="pe-g" className="inp" name="gender" value={gender} onChange={(e) => { setGender(e.target.value as typeof gender); setCategoryId(""); }}>
              <option value="MEN">Erkaklar</option><option value="WOMEN">Ayollar</option><option value="UNISEX">Uniseks</option>
            </select>
          </div>
          <div className="fld">
            <label htmlFor="pe-cat">Kategoriya *</label>
            <select id="pe-cat" className="inp" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— tanlang —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{gender === "UNISEX" ? `${c.gender === "MEN" ? "Erkaklar" : "Ayollar"} · ` : ""}{c.label}</option>)}
            </select>
          </div>
          <div className="fld"><label htmlFor="pe-price">Narx (soʻm) *</label><input id="pe-price" className="inp" name="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d\s]/g, ""))} placeholder="450000" /></div>
          <div className="fld">
            <label htmlFor="pe-disc">Chegirma (%)</label>
            <input id="pe-disc" className="inp" name="disc" inputMode="numeric" value={disc} onChange={(e) => setDisc(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="0" />
            {finalPrice && <span className="hint">Saytdagi narx: <b style={{ color: "var(--g2)" }}>{finalPrice.toLocaleString("ru-RU").replace(/,/g, " ")} soʻm</b></span>}
          </div>
          <div className="fld">
            <label htmlFor="pe-col">Kolleksiya</label>
            <select id="pe-col" className="inp" name="collectionId" defaultValue={data.collectionId}>
              <option value="">Tanlanmagan</option>
              {options.collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="fld">
            <span className="lbl">Belgilar</span>
            <div style={{ display: "flex", gap: 18, alignItems: "center", height: 52 }}>
              <label className="chk"><input type="checkbox" name="isNew" defaultChecked={data.isNew} /><span className="bx" />Yangi</label>
              <label className="chk"><input type="checkbox" name="isFeatured" defaultChecked={data.isFeatured} /><span className="bx" />Mashhur</label>
            </div>
          </div>
          <div className="fld full"><label htmlFor="pe-desc">Tavsif</label><textarea id="pe-desc" className="inp" name="desc_uz" defaultValue={data.descs.uz} placeholder="Mahsulot haqida qisqacha" maxLength={4000} /></div>
          <div className="fld"><label htmlFor="pe-mat">Material</label><input id="pe-mat" className="inp" name="material" defaultValue={data.material} placeholder="Masalan: 100% paxta" maxLength={300} /></div>
          <div className="fld"><label htmlFor="pe-care">Parvarish qilish</label><input id="pe-care" className="inp" name="care" defaultValue={data.care} placeholder="Masalan: 30°C da yuvish" maxLength={300} /></div>
          <div className="full">
            <button type="button" className="mb" onClick={() => setLangs((v) => !v)} aria-expanded={langs}>{langs ? "− Boshqa tillarni yashirish" : "+ Ruscha va inglizcha nom (ixtiyoriy)"}</button>
            <div hidden={!langs} className="fgrid" style={{ marginTop: 14 }}>
              <div className="fld"><label htmlFor="pe-nru">Nomi (ruscha)</label><input id="pe-nru" className="inp" name="name_ru" defaultValue={data.names.ru} placeholder="Boʻsh qolsa — oʻzbekchasi" maxLength={120} /></div>
              <div className="fld"><label htmlFor="pe-nen">Nomi (inglizcha)</label><input id="pe-nen" className="inp" name="name_en" defaultValue={data.names.en} placeholder="Boʻsh qolsa — oʻzbekchasi" maxLength={120} /></div>
              <div className="fld"><label htmlFor="pe-dru">Tavsif (ruscha)</label><textarea id="pe-dru" className="inp" name="desc_ru" defaultValue={data.descs.ru} maxLength={4000} /></div>
              <div className="fld"><label htmlFor="pe-den">Tavsif (inglizcha)</label><textarea id="pe-den" className="inp" name="desc_en" defaultValue={data.descs.en} maxLength={4000} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><h4>Ranglar *</h4></div>
        <div className="panel-b">
          <div className="cl-grid">
            {options.colors.map((c) => (
              <label key={c.id} title={c.label}>
                <input type="checkbox" name="colorIds" value={c.id} checked={colorIds.includes(c.id)} onChange={() => setColorIds((cur) => (cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]))} />
                <span className="dot" style={{ background: c.hex }} />
                <em>{c.label}</em>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><h4>Oʻlchamlar va ombordagi soni</h4></div>
        <div className="panel-b">
          {selColors.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mut)" }}>Avval rangni tanlang.</p>
          ) : selColors.map((c) => (
            <div key={c.id}>
              {selColors.length > 1 && <p className="stock-c"><i style={{ background: c.hex }} />{c.label}</p>}
              <div className="stockg">
                {sizes.map((s) => {
                  const k = `${c.id}:${s.id}`;
                  const r = data.reserved[k] ?? 0;
                  return (
                    <div key={s.id}>
                      {s.code}
                      <input className="inp" inputMode="numeric" aria-label={`${c.label} ${s.code}`} value={stock[k] ?? ""} placeholder="0" onChange={(e) => setStock((cur) => ({ ...cur, [k]: e.target.value.replace(/\D/g, "").slice(0, 6) }))} />
                      {r > 0 && <span style={{ color: "#f0c27a", fontSize: 10 }}>band: {r}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, marginTop: 10, color: "var(--mut)" }}>Qaysi oʻlcham boʻlsa, sonini yozing. 0 yoki boʻsh — sotuvda yoʻq.</p>
        </div>
      </div>

      <div className="panel">
        <div className="srow">
          <div><b>Sotuvda</b><span className="d">Oʻchirilsa, mahsulot saytda koʻrinmaydi (qoralama)</span></div>
          <label style={{ position: "relative" }}><input type="checkbox" className="swc" name="active" defaultChecked={data.active} aria-label="Sotuvda" /><span className="sw" /></label>
        </div>
      </div>

      <div ref={errRef}>{state?.error && <div className="anote bad" role="alert">{state.error}</div>}</div>

      <div className="sticky-save">
        <Link href="/admin/products" className="btn btn-outline">Bekor qilish</Link>
        <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">{pending ? "Saqlanmoqda…" : preparing ? "Rasm tayyorlanmoqda…" : "Saqlash"}</button>
      </div>
    </form>
  );
}
