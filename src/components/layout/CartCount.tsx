"use client";

import { useEffect, useState } from "react";
import { CART_EVENT } from "@/features/cart/client";

/** Счётчик товаров: загружается после гидрации и обновляется событием корзины. */
export function CartCount({ variant = "header" }: { variant?: "header" | "tab" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/cart/count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d: { count: number }) => alive && setCount(d.count))
      .catch(() => undefined);
    const onUpdate = (e: Event) => setCount((e as CustomEvent<{ count: number }>).detail.count);
    window.addEventListener(CART_EVENT, onUpdate);
    return () => {
      alive = false;
      window.removeEventListener(CART_EVENT, onUpdate);
    };
  }, []);

  if (count === 0) return null;
  const cls =
    variant === "tab"
      ? "absolute -right-1 -top-1 bg-wine text-cream"
      : "absolute right-0.5 top-1 bg-gold text-canvas";
  return (
    <span className={`price ${cls} grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[0.625rem] font-bold`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
