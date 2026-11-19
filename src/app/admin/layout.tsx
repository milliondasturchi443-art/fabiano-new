import type { Metadata, Viewport } from "next";
import { fontVars } from "@/lib/fonts";
import { ErrorListener } from "@/components/ui/ErrorListener";
import "@/styles/globals.css";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: { default: "FABIANO Admin", template: "%s — FABIANO Admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0E0B0B" };

/** Отдельный корневой layout админки: свой язык (русский), без витринной навигации и без индексации. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={fontVars}>
      <body className="min-h-svh bg-canvas text-ink">
        <ErrorListener />
        {children}
      </body>
    </html>
  );
}
