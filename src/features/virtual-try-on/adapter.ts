/**
 * Живая виртуальная примерка — Decart Lucy V-TON (realtime, WebRTC).
 *
 * Поток: браузер просит наш /api/v1/try-on/token → сервер с постоянным DECART_API_KEY
 * выпускает короткоживущий клиентский токен → браузер по WebRTC отправляет поток камеры
 * в Decart и получает обратно видео с надетой вещью. Видео нигде не сохраняется.
 *
 * Включение: DECART_API_KEY в env + «Jonli kiyib koʻrish» в админке + у товара есть фото.
 */

export const TRY_ON_MODEL = "lucy-vton-latest";
/** Ограничение длительности одной сессии (оплата посекундная). */
export const TRY_ON_MAX_SECONDS = 90;

export function isTryOnSupported(): boolean {
  return typeof window !== "undefined"
    && typeof RTCPeerConnection !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function fetchTryOnToken(): Promise<string> {
  const res = await fetch("/api/v1/try-on/token", { method: "POST", cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { apiKey?: string; error?: string; code?: string };
  if (!res.ok || !data.apiKey) throw new Error(data.code ?? data.error ?? `HTTP_${res.status}`);
  return data.apiKey;
}
