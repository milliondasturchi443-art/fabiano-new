import { NextResponse } from "next/server";
import * as decart from "@decartai/sdk";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, clientIp, jsonError } from "@/lib/request-guard";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Короткоживущий токен Decart для браузера (живёт ~60 с, активная сессия продолжается).
 * Постоянный DECART_API_KEY остаётся на сервере. Лимиты защищают от расхода кредитов.
 */
export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const apiKey = process.env.DECART_API_KEY;
  if (!apiKey) return jsonError("NOT_CONFIGURED", 503);
  const settings = await prisma.storeSettings.findUnique({ where: { id: "default" }, select: { tryOnEnabled: true } });
  if (!settings?.tryOnEnabled) return jsonError("DISABLED", 503);

  const ip = clientIp(req);
  if (!rateLimit(`tryon:${ip}`, 8, 3600).ok || !rateLimit("tryon:global", 300, 3600).ok) return jsonError("RATE_LIMITED", 429);

  try {
    const sdk = decart as unknown as {
      createDecartClient(o: { apiKey: string }): { tokens: { create(): Promise<{ apiKey: string; expiresAt?: string | number }> } };
    };
    const token = await sdk.createDecartClient({ apiKey }).tokens.create();
    return NextResponse.json({ apiKey: token.apiKey }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[try-on] token failed", e instanceof Error ? e.message : e);
    return jsonError("UPSTREAM_ERROR", 502);
  }
}
