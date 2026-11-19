"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getTryOnEngine } from "@/features/virtual-try-on/adapter";

/**
 * Показывается только когда сервер подтвердил флаги (env + магазин + товар).
 * Активна только если зарегистрирован движок Fabiano SDK и устройство его поддерживает.
 * Без SDK — никакой имитации примерки.
 *
 * Интерфейс примерки (камера, рендер) монтирует модуль-обёртка SDK вместе с registerTryOnEngine():
 * он слушает событие TRY_ON_OPEN_EVENT. Поэтому кнопка активна ровно тогда, когда есть кому её обработать.
 */
export const TRY_ON_OPEN_EVENT = "fabiano:try-on-open";

export interface TryOnOpenDetail {
  productId: string;
  colorCode: string | null;
  variantId: string | null;
}

export function TryOnButton(detail: TryOnOpenDetail) {
  const t = useTranslations("product");
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const engine = getTryOnEngine();
    if (!engine) return setSupported(false);
    engine.isSupported().then(setSupported).catch(() => setSupported(false));
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent<TryOnOpenDetail>(TRY_ON_OPEN_EVENT, { detail }))}
        disabled={!supported}
        className="relative flex h-[58px] w-full items-center justify-center gap-3 overflow-hidden border border-gold/60 bg-[radial-gradient(ellipse_at_center,rgb(122_26_45/0.85),rgb(40_6_12/0.9))] font-caps text-[0.72rem] uppercase tracking-[0.3em] text-champagne disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="absolute inset-0 -translate-x-full animate-[shine_3.4s_infinite] bg-[linear-gradient(110deg,transparent_30%,rgb(234_210_164/0.18)_50%,transparent_70%)]" aria-hidden />
        <span className="h-2 w-2 animate-[live-pulse_1.6s_infinite] rounded-full bg-[#ff5a6e] shadow-[0_0_10px_#ff5a6e]" aria-hidden />
        {t("tryOn")}
      </button>
      {supported === false && <p className="mt-2 text-xs text-muted">{t("tryOnNotReady")}</p>}
    </div>
  );
}
