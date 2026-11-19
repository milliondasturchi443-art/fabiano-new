"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SORTS, type CatalogFilters } from "@/features/catalog/filters";
import type { Facets } from "@/services/catalog-list";
import { CloseIcon } from "@/components/ui/icons";

/**
 * Фильтры — обычная GET-форма: работает и без JavaScript, URL остаётся источником истины.
 * Desktop: боковая панель, применяется сразу при изменении. Mobile: нижняя шторка с кнопкой «Показать».
 */
export function FilterForm({
  filters,
  facets,
  action,
  total,
  activeCount,
  children,
}: {
  filters: CatalogFilters;
  facets: Facets;
  action: string;
  total: number;
  activeCount: number;
  /** Сетка результатов (server component) — встаёт справа от боковой панели. */
  children: React.ReactNode;
}) {
  const t = useTranslations("catalog");
  const tn = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Desktop: автоприменение. На мобильном ждём «Показать результаты».
  const autoSubmit = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) formRef.current?.requestSubmit();
  };

  const fields = (
    <>
      {filters.q && <input type="hidden" name="q" value={filters.q} />}

      {facets.sizes.length > 0 && (
        <Group title={t("size")}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <label key={s} className="relative cursor-pointer">
                <input type="checkbox" name="size" value={s} defaultChecked={filters.sizes.includes(s)} onChange={autoSubmit} className="peer sr-only" />
                <span className="flex h-10 min-w-12 items-center justify-center border border-line px-3 text-xs font-medium transition-colors hover:border-muted peer-checked:border-gold peer-checked:bg-gold peer-checked:text-canvas peer-focus-visible:outline peer-focus-visible:outline-1">
                  {s}
                </span>
              </label>
            ))}
          </div>
        </Group>
      )}

      {facets.colors.length > 0 && (
        <Group title={t("color")}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {facets.colors.map((c) => (
              <label key={c.code} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" name="color" value={c.code} defaultChecked={filters.colors.includes(c.code)} onChange={autoSubmit} className="peer sr-only" />
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-ink/15 ring-offset-2 ring-offset-canvas peer-checked:ring-1 peer-checked:ring-gold"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="peer-checked:font-medium">{c.name}</span>
              </label>
            ))}
          </div>
        </Group>
      )}

      {facets.price && (
        <Group title={t("price")}>
          <div className="flex items-center gap-3">
            <input
              type="number" name="min" inputMode="numeric" min={0} step={1000}
              placeholder={`${t("from")} ${facets.price.min.toLocaleString("ru-RU")}`}
              defaultValue={filters.minPrice}
              onBlur={autoSubmit}
              aria-label={`${t("price")} ${t("from")}`}
              className="field field-sm price"
            />
            <span className="text-muted">—</span>
            <input
              type="number" name="max" inputMode="numeric" min={0} step={1000}
              placeholder={`${t("to")} ${facets.price.max.toLocaleString("ru-RU")}`}
              defaultValue={filters.maxPrice}
              onBlur={autoSubmit}
              aria-label={`${t("price")} ${t("to")}`}
              className="field field-sm price"
            />
          </div>
        </Group>
      )}

      {facets.brands.length > 1 && (
        <Group title={t("brand")}>
          {facets.brands.map((b) => (
            <Check key={b} name="brand" value={b} label={b} checked={filters.brands.includes(b)} onChange={autoSubmit} />
          ))}
        </Group>
      )}

      <Group title={t("availability")}>
        <Check name="stock" value="1" label={t("inStock")} checked={filters.inStock} onChange={autoSubmit} />
        <Check name="sale" value="1" label={t("sale")} checked={filters.sale} onChange={autoSubmit} />
        <Check name="new" value="1" label={t("isNew")} checked={filters.isNew} onChange={autoSubmit} />
      </Group>
    </>
  );

  return (
    <form ref={formRef} method="get" action={action} id="catalog-filters">
      {/* Тулбар: кнопка фильтров (mobile) + сортировка */}
      <div className="flex items-center justify-between gap-4 border-y border-line py-3 lg:border-t-0">
        <button type="button" onClick={() => setOpen(true)} className="eyebrow flex min-h-11 items-center gap-2 lg:hidden" aria-controls="filters-sheet" aria-expanded={open}>
          {t("filters")}
          {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1 text-[0.625rem] text-cream">{activeCount}</span>}
        </button>
        <p className="hidden text-sm text-muted lg:block">{t("results", { count: total })}</p>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only md:not-sr-only md:text-muted">{t("sortBy")}</span>
          <select
            name="sort"
            defaultValue={filters.sort}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="min-h-11 cursor-pointer bg-transparent pr-1 text-sm font-medium focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>{t(`sort.${s}`)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
        <aside className="hidden pt-6 lg:block" aria-label={t("filters")}>
          {fields}
          {activeCount > 0 && (
            <a href={action + (filters.q ? `?q=${encodeURIComponent(filters.q)}` : "")} className="eyebrow link-underline mt-6 inline-block pb-1">{t("clear")}</a>
          )}
          <noscript>
            <button type="submit" className="btn btn-primary mt-6 w-full">{t("apply")}</button>
          </noscript>
        </aside>
        <div className="min-w-0 pt-6">{children}</div>
      </div>

      {/* Mobile sheet */}
      <div id="filters-sheet" hidden={!open} className="fixed inset-0 z-[60] lg:hidden">
        <div className="absolute inset-0 bg-wine-night/60" onClick={() => setOpen(false)} aria-hidden />
        <div role="dialog" aria-modal="true" aria-label={t("filters")} className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col bg-canvas">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="eyebrow">{t("filters")}</p>
            <button type="button" onClick={() => setOpen(false)} className="-mr-2 flex h-11 w-11 items-center justify-center" aria-label={tn("close")}>
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-6">{fields}</div>
          <div className="grid grid-cols-2 gap-3 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <a href={action} className="btn btn-outline">{t("clear")}</a>
            <button type="submit" className="btn btn-primary">{t("showResults")}</button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5">
      <legend className="eyebrow float-left mb-4 w-full">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function Check({ name, value, label, checked, onChange }: { name: string; value: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} onChange={onChange} className="h-4 w-4 accent-[var(--color-gold)]" />
      {label}
    </label>
  );
}
