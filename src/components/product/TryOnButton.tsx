"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchTryOnToken, isTryOnSupported, TRY_ON_MAX_SECONDS, TRY_ON_MODEL } from "@/features/virtual-try-on/adapter";
import { tryOnPrompt } from "@/features/virtual-try-on/prompt";
import { openFittedCamera, type FittedCamera } from "@/features/virtual-try-on/camera";
import { reportClientError } from "@/lib/client-error";

/** Минимальный контракт @decartai/sdk, который мы используем (см. docs.platform.decart.ai). */
interface RealtimeModel { fps?: number; width?: number; height?: number }
interface RealtimeSession {
  set(state: { prompt?: string; image?: Blob; enhance?: boolean }): Promise<unknown> | unknown;
  disconnect(): Promise<unknown> | unknown;
  on?(event: string, cb: (arg: unknown) => void): void;
}
interface DecartSdk {
  models: { realtime(id: string): RealtimeModel };
  createDecartClient(opts: { apiKey: string }): {
    realtime: {
      connect(stream: MediaStream, opts: { model: RealtimeModel; onRemoteStream: (s: MediaStream) => void }): Promise<RealtimeSession>;
    };
  };
}

type Phase = "closed" | "intro" | "connecting" | "live" | "error";
type ErrKey = "camera" | "limit" | "unavailable" | "unsupported" | "generic";

interface Props {
  productName: string;
  imageUrl: string;
  categorySlug: string;
  colorCode: string | null;
  customPrompt?: string | null;
}

export function TryOnButton({ productName, imageUrl, categorySlug, colorCode, customPrompt }: Props) {
  const t = useTranslations("product");
  const [phase, setPhase] = useState<Phase>("closed");
  const [err, setErr] = useState<ErrKey>("generic");
  const [detail, setDetail] = useState("");
  const [left, setLeft] = useState(TRY_ON_MAX_SECONDS);

  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<FittedCamera | null>(null);
  const [frame, setFrame] = useState({ w: 3, h: 4 });
  const sessionRef = useRef<RealtimeSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runRef = useRef(0); // отменяет устаревший запуск, если окно закрыли во время подключения

  const garment = useCallback(async () => {
    const src = await fetch(imageUrl).then((r) => {
      if (!r.ok) throw new Error(`IMAGE_${r.status}`);
      return r.blob();
    });
    // Как в примере Decart: JPEG на белом фоне, не больше 1024px (WebP модель может не принять)
    const bmp = await createImageBitmap(src);
    const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k) || 512;
    c.height = Math.round(bmp.height * k) || 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const image = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("IMAGE_ENCODE"))), "image/jpeg", 0.9));
    // Своё описание от админа отправляем как есть; автоматическое — Decart дополнительно уточняет (enhance)
    return { prompt: tryOnPrompt(categorySlug, colorCode, customPrompt), image, enhance: !customPrompt };
  }, [imageUrl, categorySlug, colorCode, customPrompt]);

  const stop = useCallback(async () => {
    runRef.current++;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const s = sessionRef.current;
    sessionRef.current = null;
    try { await s?.disconnect(); } catch { /* сессия уже закрыта */ }
    camRef.current?.stop();
    camRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const close = useCallback(() => {
    void stop();
    setPhase("closed");
  }, [stop]);

  const start = useCallback(async () => {
    if (!isTryOnSupported()) { setErr("unsupported"); setPhase("error"); return; }
    const run = ++runRef.current;
    setPhase("connecting");
    setLeft(TRY_ON_MAX_SECONDS);
    try {
      const sdk = (await import("@decartai/sdk")) as unknown as DecartSdk;
      const model = sdk.models.realtime(TRY_ON_MODEL);
      const cam = await openFittedCamera();
      if (run !== runRef.current) { cam.stop(); return; }
      camRef.current = cam;
      setFrame({ w: cam.width, h: cam.height });
      const stream = cam.stream;

      const apiKey = await fetchTryOnToken();
      if (run !== runRef.current) return;
      const client = sdk.createDecartClient({ apiKey });
      const session = await client.realtime.connect(stream, {
        model,
        onRemoteStream: (remote) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remote;
            void videoRef.current.play().catch(() => {});
          }
          setPhase("live");
        },
      });
      if (run !== runRef.current) { try { await session.disconnect(); } catch {} return; }
      sessionRef.current = session;
      session.on?.("error", (err) => {
        if (run !== runRef.current) return;
        const m = err instanceof Error ? err.message : String(err);
        reportClientError(Object.assign(new Error(`try-on session: ${m}`.slice(0, 500)), { digest: "try-on" }));
        void stop();
        setDetail(m.slice(0, 160));
        setErr("generic");
        setPhase("error");
      });
      session.on?.("connectionChange", (state) => {
        if (run !== runRef.current) return;
        if (state === "disconnected" && sessionRef.current) { void stop(); setPhase("intro"); }
      });
      await session.set(await garment());

      timerRef.current = setInterval(() => {
        setLeft((n) => {
          if (n <= 1) { void stop(); setPhase("intro"); return 0; }
          return n - 1;
        });
      }, 1000);
    } catch (e) {
      if (run !== runRef.current) return;
      await stop();
      const name = e instanceof Error ? `${e.name}:${e.message}` : String(e);
      setDetail(name.slice(0, 160));
      setErr(
        /NotAllowed|Permission|NotFound|NotReadable|Overconstrained/i.test(name) ? "camera"
          : /RATE_LIMITED|429/.test(name) ? "limit"
          : /NOT_CONFIGURED|DISABLED|503/.test(name) ? "unavailable"
          : "generic",
      );
      setPhase("error");
      reportClientError(Object.assign(new Error(`try-on: ${name}`.slice(0, 500)), { digest: "try-on" }));
    }
  }, [garment, stop]);

  // Смена цвета во время примерки — без переподключения
  useEffect(() => {
    if (phase !== "live" || !sessionRef.current) return;
    garment().then((g) => sessionRef.current?.set(g)).catch(() => {});
  }, [garment, phase]);

  // Esc, блокировка прокрутки, очистка при уходе со страницы
  useEffect(() => {
    if (phase === "closed") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [phase, close]);
  useEffect(() => () => { void stop(); }, [stop]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("intro")}
        className="relative flex h-[58px] w-full items-center justify-center gap-3 overflow-hidden border border-gold/60 bg-[radial-gradient(ellipse_at_center,rgb(122_26_45/0.85),rgb(40_6_12/0.9))] font-caps text-[0.72rem] uppercase tracking-[0.3em] text-champagne transition hover:border-gold"
      >
        <span className="absolute inset-0 -translate-x-full animate-[shine_3.4s_infinite] bg-[linear-gradient(110deg,transparent_30%,rgb(234_210_164/0.18)_50%,transparent_70%)]" aria-hidden />
        <span className="h-2 w-2 animate-[live-pulse_1.6s_infinite] rounded-full bg-[#ff5a6e] shadow-[0_0_10px_#ff5a6e]" aria-hidden />
        {t("tryOn")}
      </button>

      {phase !== "closed" && (
        <div role="dialog" aria-modal="true" aria-label={t("tryOn")} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-0 backdrop-blur-sm sm:p-6">
          <div className={`relative flex h-full w-full flex-col ${phase === "live" && frame.w > frame.h ? "max-w-[880px]" : "max-w-[520px]"} overflow-hidden border-gold/30 bg-canvas sm:h-auto sm:max-h-[92vh] sm:border`}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="min-w-0">
                <p className="caps text-[0.62rem] text-gold">{t("tryOn")}</p>
                <p className="truncate font-serif text-lg">{productName}</p>
              </div>
              <button type="button" onClick={close} aria-label={t("tryOnUi.close")} className="grid h-10 w-10 place-items-center text-muted transition hover:text-gold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div className="relative min-h-0 flex-1 bg-black sm:flex-none sm:[aspect-ratio:var(--ar)]" style={{ "--ar": phase === "live" ? `${frame.w} / ${frame.h}` : "3 / 4" } as React.CSSProperties}>
              {/* object-contain: кадр модели показываем целиком, без растягивания; зеркально — как в зеркале */}
              <video ref={videoRef} playsInline muted autoPlay className={`h-full w-full -scale-x-100 object-contain ${phase === "live" ? "opacity-100" : "opacity-0"}`} />

              {phase === "live" && (
                <div className="absolute left-3 top-3 flex items-center gap-2 bg-black/60 px-3 py-1.5 text-xs text-champagne">
                  <span className="h-2 w-2 animate-[live-pulse_1.6s_infinite] rounded-full bg-[#ff5a6e]" aria-hidden />
                  LIVE · {t("tryOnUi.secondsLeft", { n: left })}
                </div>
              )}

              {phase !== "live" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="h-36 w-28 rounded-t-full border border-gold/30 object-cover" />
                  {phase === "intro" && (
                    <>
                      <p className="max-w-xs text-sm leading-relaxed text-ink/85">{t("tryOnUi.intro")}</p>
                      <ul className="space-y-1 text-xs text-muted">
                        <li>{t("tryOnUi.tip1")}</li>
                        <li>{t("tryOnUi.tip2")}</li>
                      </ul>
                    </>
                  )}
                  {phase === "connecting" && (
                    <>
                      <span className="h-9 w-9 animate-spin rounded-full border-2 border-gold/25 border-t-gold" aria-hidden />
                      <p className="text-sm text-champagne" aria-live="polite">{t("tryOnUi.connecting")}</p>
                    </>
                  )}
                  {phase === "error" && (
                    <div role="alert" className="max-w-xs">
                      <p className="text-sm text-danger">{t(`tryOnUi.err.${err}`)}</p>
                      {detail && <p className="mt-2 break-words text-[0.65rem] text-muted">{detail}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-line p-5">
              {phase === "live" ? (
                <button type="button" onClick={() => { void stop(); setPhase("intro"); }} className="btn btn-outline w-full">{t("tryOnUi.stop")}</button>
              ) : (
                <button type="button" onClick={start} disabled={phase === "connecting"} className="btn btn-primary w-full disabled:opacity-50">
                  {phase === "error" ? t("tryOnUi.retry") : t("tryOnUi.start")}
                </button>
              )}
              <p className="text-center text-[0.7rem] leading-relaxed text-muted">{t("tryOnUi.privacy")}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
