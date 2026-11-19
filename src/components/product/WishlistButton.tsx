"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { HeartIcon } from "@/components/ui/icons";

/** Сердечко: гостя отправляет на вход (с возвратом на эту страницу), пользователю сохраняет в БД. */
export function WishlistButton({ productId, variant = "text", initial }: { productId: string; variant?: "text" | "icon"; initial?: boolean }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initial ?? false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (initial !== undefined) return;
    let alive = true;
    fetch("/api/v1/wishlist", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { productIds: string[] } | null) => alive && d && setSaved(d.productIds.includes(productId)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [productId, initial]);

  const toggle = () =>
    start(async () => {
      const res = await fetch("/api/v1/wishlist", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        router.push(`/account?next=${encodeURIComponent(`/${locale}${pathname}`)}`);
        return;
      }
      if (res.ok) {
        setSaved(!saved);
        router.refresh();
      }
    });

  const label = saved ? t("removeFromWishlist") : t("addToWishlist");
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={variant === "icon" ? label : undefined}
      className={variant === "icon" ? "flex h-11 w-11 items-center justify-center" : "eyebrow link-underline inline-flex items-center gap-2 pb-1"}
    >
      <HeartIcon width={18} height={18} fill={saved ? "currentColor" : "none"} className={saved ? "text-gold" : ""} />
      {variant === "text" && label}
    </button>
  );
}
