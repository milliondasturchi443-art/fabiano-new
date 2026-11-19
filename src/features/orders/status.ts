import "server-only";
import { prisma } from "@/lib/prisma";
import { canTransition, type OrderStatus } from "./order-number";

export class StatusError extends Error {
  constructor(public code: "NOT_FOUND" | "INVALID_TRANSITION") {
    super(code);
  }
}

/**
 * Смена статуса с учётом склада:
 *  - SHIPPED: товар покинул склад → quantity −n, reserved −n, salesCount +n
 *  - CANCELLED до отправки: резерв освобождается (reserved −n)
 *  - DELIVERED при оплате при получении → платёж PAID
 *  - REFUNDED → платёж REFUNDED (возврат товара на склад — отдельной правкой остатков)
 * Каждое изменение пишется в историю заказа.
 */
export async function changeOrderStatus(orderId: string, to: OrderStatus, actorId: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
    if (!order) throw new StatusError("NOT_FOUND");
    const from = order.status as OrderStatus;
    if (!canTransition(from, to)) throw new StatusError("INVALID_TRANSITION");

    const shippedBefore = ["SHIPPED", "DELIVERED"].includes(from);

    // Списание со склада — при отправке (или сразу при «Yetkazildi», если «Yoʻlda» пропустили)
    if (to === "SHIPPED" || (to === "DELIVERED" && !shippedBefore)) {
      for (const i of order.items) {
        if (!i.variantId) continue;
        await tx.$executeRaw`UPDATE "Inventory" SET "quantity" = "quantity" - ${i.quantity}, "reserved" = GREATEST("reserved" - ${i.quantity}, 0), "updatedAt" = NOW()
          WHERE "variantId" = ${i.variantId}`;
        if (i.productId) await tx.product.updateMany({ where: { id: i.productId }, data: { salesCount: { increment: i.quantity } } });
      }
    }

    if (to === "CANCELLED" && !shippedBefore) {
      for (const i of order.items) {
        if (!i.variantId) continue;
        await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = GREATEST("reserved" - ${i.quantity}, 0), "updatedAt" = NOW() WHERE "variantId" = ${i.variantId}`;
      }
    }
    // Отмена уже отправленного заказа (вернули) — товар снова на складе
    if (to === "CANCELLED" && shippedBefore) {
      for (const i of order.items) {
        if (!i.variantId) continue;
        await tx.$executeRaw`UPDATE "Inventory" SET "quantity" = "quantity" + ${i.quantity}, "updatedAt" = NOW() WHERE "variantId" = ${i.variantId}`;
        if (i.productId) await tx.product.updateMany({ where: { id: i.productId, salesCount: { gte: i.quantity } }, data: { salesCount: { decrement: i.quantity } } });
      }
    }

    let paymentStatus = order.paymentStatus;
    // Оплата вперёд: если админ не отметил «Toʻlandi» раньше — при «Yetkazildi» считаем оплаченным
    const pending = order.payments.find((p) => p.status === "PENDING");
    if (to === "DELIVERED" && pending) {
      await tx.payment.update({ where: { id: pending.id }, data: { status: "PAID", paidAt: new Date() } });
      paymentStatus = "PAID";
    }
    if (to === "CANCELLED" && paymentStatus === "PENDING") {
      await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
      paymentStatus = "CANCELLED";
    }
    if (to === "REFUNDED") {
      await tx.payment.updateMany({ where: { orderId, status: "PAID" }, data: { status: "REFUNDED" } });
      paymentStatus = paymentStatus === "PAID" ? "REFUNDED" : paymentStatus;
    }

    await tx.order.update({ where: { id: orderId }, data: { status: to, paymentStatus } });
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: from, toStatus: to, note: note || null, changedById: actorId } });
    await tx.auditLog.create({ data: { actorId, action: "order.status_change", entity: "Order", entityId: orderId, diff: { from, to } } });
  });
}
