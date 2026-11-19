"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ProductCard } from "@/components/product/ProductCard";
import type { ProductCardData } from "@/services/catalog";

/** Новинки с вкладками Hammasi / Erkaklar / Ayollar (как в прототипе). */
export function NewArrivals({ products }: { products: ProductCardData[] }) {
  const t = useTranslations("home");
  const tn = useTranslations("nav");
  const [tab, setTab] = useState<"all" | "MEN" | "WOMEN">("all");
  const list = products.filter((p) => tab === "all" || p.gender === tab || p.gender === "UNISEX").slice(0, 8);
  const tabs = [
    { k: "all" as const, label: t("allTab") },
    { k: "MEN" as const, label: tn("men") },
    { k: "WOMEN" as const, label: tn("women") },
  ];

  return (
    <>
      <div role="tablist" className="-mt-4 mb-9 flex flex-wrap justify-center gap-2">
        {tabs.map((x) => (
          <button
            key={x.k}
            role="tab"
            type="button"
            aria-selected={tab === x.k}
            onClick={() => setTab(x.k)}
            className={`h-[38px] border px-[18px] font-caps text-[0.625rem] uppercase tracking-[0.24em] transition-all duration-200 ${tab === x.k ? "border-gold bg-gold text-canvas" : "border-line text-muted hover:text-champagne"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-[22px] xl:grid-cols-4">
        {list.map((p, i) => (
          <li key={p.id}><ProductCard product={p} priority={i < 2} /></li>
        ))}
      </ul>
      {products.length > 8 && (
        <div className="mt-11 text-center">
          <Link href="/catalog" className="btn btn-outline">{t("allProducts")}</Link>
        </div>
      )}
    </>
  );
}
