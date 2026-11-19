import Script from "next/script";

/**
 * Виджет живой примерки Anywear (Decart, модель Lucy V-TON) — одна строка из их инструкции.
 * Сам находит товар на странице и добавляет кнопку примерки. Бесплатно на время беты.
 */
export function AnywearWidget({ domain }: { domain: string }) {
  return <Script id="anywear" src={`https://anywear.decart.ai/widget/latest/anywear.js?domain=${encodeURIComponent(domain)}`} strategy="afterInteractive" />;
}
