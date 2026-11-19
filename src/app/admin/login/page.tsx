import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/session";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kirish" };

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user?.can("admin:access")) redirect("/admin/orders");
  return (
    <main className="adm-login">
      <div className="adm-card">
        <p className="caps" style={{ color: "var(--color-gold)", fontSize: 10.5 }}>Boshqaruv paneli</p>
        <p className="logo-script" style={{ display: "inline-block", marginTop: 6 }}>Fabiano</p>
        <AdminLoginForm />
        <p style={{ fontSize: 11.5, marginTop: 16, color: "rgb(239 230 214 / .58)" }}>Faqat doʻkon egasi va adminlar uchun</p>
      </div>
    </main>
  );
}
