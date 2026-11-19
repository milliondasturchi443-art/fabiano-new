"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Наша кнопка под «Hozir sotib olish», которая открывает окно Anywear (их виджет добавляет свою кнопку слева внизу). */
export function AnywearTryOnButton() {
  const t = useTranslations("product");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const find = () => document.querySelector<HTMLButtonElement>("#__decart-tryon-widget > button");
    if (find()) { setReady(true); return; }
    const obs = new MutationObserver(() => { if (find()) { setReady(true); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
    const stop = setTimeout(() => obs.disconnect(), 20000);
    return () => { obs.disconnect(); clearTimeout(stop); };
  }, []);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => {
        document.querySelector<HTMLButtonElement>("#__decart-tryon-widget > button")?.click();
      }}
      className="relative flex h-[58px] w-full items-center justify-center gap-3 overflow-hidden border border-gold/60 bg-[radial-gradient(ellipse_at_center,rgb(122_26_45/0.85),rgb(40_6_12/0.9))] font-caps text-[0.72rem] uppercase tracking-[0.3em] text-champagne transition hover:border-gold disabled:cursor-wait disabled:opacity-60"
    >
      <span className="absolute inset-0 -translate-x-full animate-[shine_3.4s_infinite] bg-[linear-gradient(110deg,transparent_30%,rgb(234_210_164/0.18)_50%,transparent_70%)]" aria-hidden />
      <span className="h-2 w-2 animate-[live-pulse_1.6s_infinite] rounded-full bg-[#ff5a6e] shadow-[0_0_10px_#ff5a6e]" aria-hidden />
      {t("tryOn")}
    </button>
  );
}
