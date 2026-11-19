/**
 * Камера для живой примерки.
 *
 * Модель Decart работает в фиксированном кадре 1280×720 (или 720×1280). Обычная камера отдаёт
 * 4:3 / 3:4 — модель растягивает такой кадр, и человек выглядит «сплющенным/вытянутым».
 * Поэтому, как в примере Decart (digital-mirror), вырезаем центр камеры ровно в нужной пропорции
 * через canvas и отправляем уже его. Портрет — на телефоне в вертикальном положении, иначе альбом.
 */

export interface FittedCamera {
  stream: MediaStream; // готовый поток нужной пропорции — его и отправляем в модель
  width: number;
  height: number;
  stop: () => void;
}

const FPS = 24;

export async function openFittedCamera(): Promise<FittedCamera> {
  const cam = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: FPS } },
  });

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = cam;
  await video.play().catch(() => {});
  if (!video.videoWidth) await new Promise<void>((r) => video.addEventListener("loadedmetadata", () => r(), { once: true }));

  // Портрет — если сама камера отдаёт вертикальный кадр или экран вертикальный (телефон)
  const portrait = video.videoHeight > video.videoWidth || (window.innerHeight > window.innerWidth && window.innerWidth < 900);
  const width = portrait ? 720 : 1280;
  const height = portrait ? 1280 : 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const out = width / height;

  let raf = 0;
  let last = 0;
  const draw = (now: number) => {
    raf = requestAnimationFrame(draw);
    if (now - last < 1000 / FPS || video.readyState < 2) return;
    last = now;
    // Обрезка «по центру» под пропорцию модели — пересчитываем каждый кадр (телефон могут повернуть)
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    let cw = sw, ch = sh, cx = 0, cy = 0;
    if (sw / sh > out) { cw = Math.round(sh * out); cx = Math.round((sw - cw) / 2); }
    else { ch = Math.round(sw / out); cy = Math.round((sh - ch) / 2); }
    ctx.drawImage(video, cx, cy, cw, ch, 0, 0, width, height);
  };
  raf = requestAnimationFrame(draw);

  const stream = canvas.captureStream(FPS);
  return {
    stream,
    width,
    height,
    stop: () => {
      cancelAnimationFrame(raf);
      video.pause();
      video.srcObject = null;
      cam.getTracks().forEach((t) => t.stop());
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
