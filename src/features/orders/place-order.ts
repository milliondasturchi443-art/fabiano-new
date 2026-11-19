import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fromMinor, toMinor } from "@/lib/money";
import { calculateTotals, type CouponRule } from "@/services/pricing";
import { localized } from "@/services/catalog";
import { formatOrderNumber } from "./order-number";
import type { AppLocale } from "@/i18n/routing";

export class CheckoutError extends Error {
  constructor(public code: "EMPTY_CART" | "STOCK" | "COUPON_INVALID" | "DELIVERY_INVALID" | "DELIVERY_REGION" | "PAYMENT_INVALID") {
    super(code);
  }
}

export interface PlaceOrderInput {
  cartId: string;
  userId: string | null;
  locale: AppLocale;
  firstName: string;
  lastName: string;
  phone: string; // E.164
  email: string | null;
  address: { region: string; district: string; street: string; house: string; apartment: string | null };
  comment: string | null;
  deliveryMethodId: string;
  paymentProvider: "CASH_ON_DELIVERY";
}

/**
 * Создание заказа одной транзакцией:
 * пересчёт цен на сервере → проверка доставки/оплаты → атомарный резерв остатков (UPDATE ... WHERE свободно >= n)
 * → снимок товаров → платёж → промокод → очистка корзины. Любая ошибка откатывает всё.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<{ number: string; guestToken: string | null }> {
  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { id: input.cartId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  size: true,
                  color: true,
                  inventory: true,
                  product: {
                    include: {
                      translations: { where: { locale: input.locale }, select: { name: true } },
                      images: { orderBy: { sortOrder: "asc" }, select: { storageKey: true, colorId: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const items = (cart?.items ?? []).filter((i) => i.variant.isActive && i.variant.product.status === "ACTIVE");
      if (!cart || items.length === 0) throw new CheckoutError("EMPTY_CART");

      // Доставка
      const delivery = await tx.deliveryMethod.findFirst({ where: { id: input.deliveryMethodId, isEnabled: true } });
      if (!delivery) throw new CheckoutError("DELIVERY_INVALID");
      if (delivery.regions.length > 0 && !delivery.regions.includes(input.address.region)) throw new CheckoutError("DELIVERY_REGION");

      // Оплата: сейчас доступна только оплата при получении (онлайн-провайдеры — после подключения credentials)
      const pm = await tx.paymentMethodConfig.findUnique({ where: { provider: input.paymentProvider } });
      if (!pm?.isEnabled) throw new CheckoutError("PAYMENT_INVALID");

      // Промокод
      let coupon: (CouponRule & { id: string }) | null = null;
      if (cart.couponCode) {
        const c = await tx.coupon.findUnique({ where: { code: cart.couponCode } });
        if (c) {
          const customerUsageCount = await tx.couponUsage.count({
            where: { couponId: c.id, OR: [...(input.userId ? [{ userId: input.userId }] : []), { phone: input.phone }] },
          });
          coupon = {
            id: c.id, code: c.code, type: c.type, value: c.value.toString(),
            minOrderAmount: c.minOrderAmount?.toString() ?? null, maxDiscount: c.maxDiscount?.toString() ?? null,
            startsAt: c.startsAt, expiresAt: c.expiresAt, isActive: c.isActive, usageLimit: c.usageLimit,
            usedCount: c.usedCount, perUserLimit: c.perUserLimit, customerUsageCount,
          };
        }
      }

      const lines = items.map((i) => ({
        variantId: i.variantId,
        unitPrice: (i.variant.priceOverride ?? i.variant.product.price).toString(),
        quantity: i.quantity,
        available: i.variant.inventory ? i.variant.inventory.quantity - i.variant.inventory.reserved : 0,
      }));
      const totals = calculateTotals({
        lines,
        coupon,
        delivery: { price: delivery.price.toString(), freeFrom: delivery.freeFrom?.toString() ?? null },
      });
      if (totals.stockErrors.length) throw new CheckoutError("STOCK");
      if (cart.couponCode && (!coupon || totals.couponError)) throw new CheckoutError("COUPON_INVALID");

      // Атомарный резерв: при гонке двух покупателей второй получит 0 обновлённых строк
      for (const l of lines) {
        const n = await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = "reserved" + ${l.quantity}, "updatedAt" = NOW()
          WHERE "variantId" = ${l.variantId} AND "quantity" - "reserved" >= ${l.quantity}`;
        if (n === 0) throw new CheckoutError("STOCK");
      }

      const seq = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq')`;
      const number = formatOrderNumber(new Date().getFullYear(), seq[0]!.nextval);
      const guestToken = input.userId ? null : randomBytes(24).toString("base64url");
      const deliveryName = localized(delivery.names, input.locale) || delivery.type;

      const order = await tx.order.create({
        data: {
          number,
          userId: input.userId,
          locale: input.locale,
          currency: "UZS",
          subtotal: totals.subtotal,
          discountTotal: totals.discount,
          shippingTotal: totals.shipping,
          grandTotal: totals.grandTotal,
          email: input.email,
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          shippingAddress: input.address,
          customerComment: input.comment,
          deliveryMethodId: delivery.id,
          deliverySnapshot: { type: delivery.type, name: deliveryName, price: totals.shipping, basePrice: delivery.price.toString() },
          couponCode: totals.appliedCoupon,
          guestAccessTokenHash: guestToken ? createHash("sha256").update(guestToken).digest("hex") : null,
          items: {
            create: items.map((i) => {
              const unit = (i.variant.priceOverride ?? i.variant.product.price).toString();
              const img = i.variant.product.images.find((im) => im.colorId === i.variant.colorId) ?? i.variant.product.images[0];
              return {
                variantId: i.variantId,
                productId: i.variant.productId,
                productName: i.variant.product.translations[0]?.name ?? i.variant.product.sku,
                sku: i.variant.sku,
                sizeCode: i.variant.size.code,
                colorName: localized(i.variant.color.names, input.locale) || i.variant.color.code,
                colorHex: i.variant.color.hex,
                imageKey: img?.storageKey ?? null,
                unitPrice: unit,
                quantity: i.quantity,
                lineTotal: fromMinor(toMinor(unit) * BigInt(i.quantity)),
              };
            }),
          },
          statusHistory: { create: { toStatus: "PENDING", note: "Order placed" } },
          payments: { create: { provider: input.paymentProvider, amount: totals.grandTotal, currency: "UZS", status: "PENDING" } },
        },
      });

      if (coupon && totals.appliedCoupon) {
        // Лимит использований проверяется атомарно
        const updated = await tx.coupon.updateMany({
          where: { id: coupon.id, ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (updated.count === 0) throw new CheckoutError("COUPON_INVALID");
        await tx.couponUsage.create({
          data: { couponId: coupon.id, orderId: order.id, userId: input.userId, phone: input.phone, discount: totals.discount },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

      return { number, guestToken };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
  );
}
