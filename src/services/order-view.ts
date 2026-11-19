import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

export type OrderView = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

async function loadOrder(number: string) {
  if (!/^FB-\d{4}-\d{6,}$/.test(number)) return null;
  const o = await prisma.order.findUnique({
    where: { number },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true, status: true } },
      statusHistory: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true } },
    },
  });
  if (!o) return null;
  return {
    ...o,
    items: o.items.map((i) => ({ ...i, image: mediaUrl(i.imageKey) })),
    address: o.shippingAddress as { region?: string; district?: string; street?: string; house?: string; apartment?: string | null },
    delivery: o.deliverySnapshot as { name?: string; type?: string; price?: string; basePrice?: string },
  };
}

function tokenMatches(hash: string | null, token: string | undefined): boolean {
  if (!hash || !token || token.length < 20) return false;
  const a = Buffer.from(createHash("sha256").update(token).digest("hex"));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Заказ виден владельцу-пользователю или гостю по секретной ссылке. Чужой заказ → null (как «не найден»). */
export async function getOrderForViewer(number: string, viewer: { userId?: string | null; guestToken?: string }) {
  const o = await loadOrder(number);
  if (!o) return null;
  if (o.userId && viewer.userId === o.userId) return o;
  if (tokenMatches(o.guestAccessTokenHash, viewer.guestToken)) return o;
  return null;
}
