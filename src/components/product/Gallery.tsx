"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryImage } from "@/features/product/variants";
import { CloseIcon } from "@/components/ui/icons";

/**
 * Desktop: вертикальная лента миниатюр + основное фото, клик — полноэкранный просмотр с zoom за курсором.
 * Mobile: горизонтальный свайп (scroll-snap) с индикатором, тап — полноэкранный просмотр.
 */
export function Gallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const t = useTranslations("product");
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Смена цвета → новая галерея → к первому кадру
  useEffect(() => {
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [images]);

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (images.length === 0) {
    return <div className="flex aspect-[3/4] items-center justify-center bg-surface font-serif text-2xl tracking-[0.3em] text-muted/60">FABIANO</div>;
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div className="lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-4">
      {/* Миниатюры (desktop) */}
      <ul className="hidden max-h-[calc(100svh-8rem)] flex-col gap-3 overflow-y-auto lg:flex">
        {images.map((img, i) => (
          <li key={img.url}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={t("image", { index: i + 1, total: images.length })}
              aria-current={i === active}
              className={`relative block aspect-[3/4] w-full overflow-hidden bg-surface transition-opacity ${i === active ? "opacity-100 ring-1 ring-ink" : "opacity-60 hover:opacity-100"}`}
            >
              <Image src={img.url} alt="" fill sizes="72px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {/* Основное фото (desktop) */}
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        aria-label={`${t("zoom")}: ${current.alt}`}
        className="relative hidden aspect-[3/4] w-full cursor-zoom-in overflow-hidden rounded-t-[260px] border border-line bg-surface lg:block"
      >
        <Image src={current.url} alt={current.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </button>

      {/* Свайп-лента (mobile/tablet) */}
      <div className="relative lg:hidden">
        <div ref={trackRef} onScroll={onScroll} className="-mx-[clamp(1.25rem,4vw,3.5rem)] flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setZoomOpen(true)} className="relative aspect-[3/4] w-full shrink-0 snap-center overflow-hidden rounded-t-[200px] bg-surface" aria-label={t("image", { index: i + 1, total: images.length })}>
              <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
            {images.map((img, i) => (
              <span key={img.url} className={`h-[3px] rounded-full bg-paper transition-all ${i === active ? "w-6 opacity-100" : "w-3 opacity-50"}`} />
            ))}
          </div>
        )}
      </div>

      {zoomOpen && <ZoomViewer images={images} start={active} name={name} onClose={() => setZoomOpen(false)} />}
    </div>
  );
}

function ZoomViewer({ images, start, name, onClose }: { images: GalleryImage[]; start: number; name: string; onClose: () => void }) {
  const t = useTranslations("product");
  const [i, setI] = useState(start);
  const [origin, setOrigin] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const img = images[i]!;

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % images.length);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [images.length, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-[70] flex flex-col bg-canvas">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="price text-xs text-muted">{i + 1} / {images.length}</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t("close")} className="-mr-2 flex h-11 w-11 items-center justify-center">
          <CloseIcon />
        </button>
      </div>
      <div
        className="relative flex-1 cursor-zoom-in overflow-hidden"
        onMouseMove={(e) => {
          if (!origin) return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin((o) => (o ? null : `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`));
        }}
      >
        <Image
          src={img.url}
          alt={img.alt}
          fill
          sizes="100vw"
          quality={90}
          className="object-contain transition-transform duration-300"
          style={{ transform: origin ? "scale(2.2)" : "scale(1)", transformOrigin: origin ?? "center" }}
        />
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-6 py-4">
          <button type="button" onClick={() => { setOrigin(null); setI((x) => (x - 1 + images.length) % images.length); }} aria-label={t("prevImage")} className="eyebrow h-11 px-4">←</button>
          <button type="button" onClick={() => { setOrigin(null); setI((x) => (x + 1) % images.length); }} aria-label={t("nextImage")} className="eyebrow h-11 px-4">→</button>
        </div>
      )}
    </div>
  );
}
