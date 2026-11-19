export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Kutilmoqda", cls: "bg-[rgb(234_180_90/0.15)] text-[#f0c27a]" },
  CONFIRMED: { label: "Tasdiqlandi", cls: "bg-[rgb(110_160_255/0.15)] text-[#9dbcff]" },
  PROCESSING: { label: "Yigʻilmoqda", cls: "bg-[rgb(190_130_255/0.15)] text-[#d1aaff]" },
  SHIPPED: { label: "Yuborildi", cls: "bg-gold/15 text-champagne" },
  DELIVERED: { label: "Yetkazildi", cls: "bg-success/10 text-success" },
  CANCELLED: { label: "Bekor qilindi", cls: "bg-line text-muted" },
  REFUNDED: { label: "Qaytarish", cls: "bg-danger/10 text-danger" },
};

export const PAYMENT_STATUS: Record<string, string> = {
  PENDING: "Toʻlov kutilmoqda",
  AUTHORIZED: "Avtorizatsiya qilingan",
  PAID: "Toʻlangan",
  FAILED: "Toʻlov xatosi",
  CANCELLED: "Bekor qilindi",
  REFUNDED: "Qaytarildi",
};

export const PROVIDER: Record<string, string> = { CASH_ON_DELIVERY: "Qabul qilganda", PAYME: "Payme", CLICK: "Click" };
