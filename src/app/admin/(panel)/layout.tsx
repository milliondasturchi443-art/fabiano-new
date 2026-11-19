import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/features/admin/guard";
import { adminLogoutAction } from "@/features/admin/auth-actions";
import { AdminNav } from "./AdminNav";
import logoCream from "../../../../public/brand/logo-cream.png";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-r border-line bg-paper text-ink lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
          <Link href="/admin" aria-label="Umumiy koʻrinish">
            <Image src={logoCream} alt="FABIANO" priority className="h-10 w-auto lg:h-14" />
          </Link>
          <p className="eyebrow hidden pt-2 text-[0.625rem] text-champagne lg:block">Admin</p>
        </div>
        <AdminNav />
        <div className="hidden border-t border-white/10 px-6 py-5 text-xs lg:block">
          <p className="truncate text-cream/60">{user.email}</p>
          <div className="mt-3 flex items-center justify-between">
            <a href="/uz" target="_blank" rel="noopener" className="link-underline">Saytni ochish ↗</a>
            <form action={adminLogoutAction}>
              <button type="submit" className="link-underline">Chiqish</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-end gap-5 border-b border-line bg-paper px-5 py-2 text-xs lg:hidden">
          <a href="/uz" target="_blank" rel="noopener" className="link-underline">Sayt ↗</a>
          <form action={adminLogoutAction}><button type="submit" className="link-underline">Chiqish</button></form>
        </div>
        <main className="px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
