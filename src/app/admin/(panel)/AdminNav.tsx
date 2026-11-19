"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN = [
  { href: "/admin/orders", label: "Buyurtmalar", count: "orders" },
  { href: "/admin/leads", label: "Raqam qoldirganlar", count: "leads" },
  { href: "/admin/products", label: "Mahsulotlar" },
  { href: "/admin/texts", label: "Sayt matnlari" },
  { href: "/admin/contacts", label: "Aloqa va tarmoqlar" },
  { href: "/admin/settings", label: "Toʻlov va yetkazish" },
  { href: "/admin/admins", label: "Adminlar" },
] as const;

const EXTRA = [
  { href: "/admin/customers", label: "Mijozlar" },
  { href: "/admin/coupons", label: "Promokodlar" },
];

export function AdminNav({ counts }: { counts: { orders: number; leads: number } }) {
  const path = usePathname();
  const link = (href: string, label: string, n?: number) => (
    <Link key={href} href={href} className={path.startsWith(href) ? "on" : ""} aria-current={path.startsWith(href) ? "page" : undefined}>
      {label}
      {n ? <span className="c">{n}</span> : null}
    </Link>
  );
  return (
    <nav aria-label="Admin menyusi">
      {MAIN.map((i) => link(i.href, i.label, "count" in i ? counts[i.count] : undefined))}
      <p className="sep">QOʻSHIMCHA</p>
      {EXTRA.map((i) => link(i.href, i.label))}
    </nav>
  );
}
