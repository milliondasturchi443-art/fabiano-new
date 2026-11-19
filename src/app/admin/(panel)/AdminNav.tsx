"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Umumiy koʻrinish" },
  { href: "/admin/products", label: "Mahsulotlar" },
  { href: "/admin/orders", label: "Buyurtmalar" },
  { href: "/admin/leads", label: "Murojaatlar" },
  { href: "/admin/customers", label: "Mijozlar" },
  { href: "/admin/coupons", label: "Promokodlar" },
  { href: "/admin/settings", label: "Sozlamalar" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin menyusi" className="overflow-x-auto [scrollbar-width:none] lg:flex-1 lg:overflow-visible">
      <ul className="flex gap-1 px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
        {ITEMS.map((i) => {
          const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap px-3 py-2.5 text-sm transition-colors lg:px-4 ${active ? "bg-gold/15 text-champagne shadow-[inset_2px_0_0_var(--color-gold)]" : "text-muted hover:bg-gold/5 hover:text-ink"}`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
