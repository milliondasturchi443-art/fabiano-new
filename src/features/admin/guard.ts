import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/features/auth/session";

/** Доступ к админке: вошедший пользователь с правом admin:access (и, если указано, конкретным правом). */
export async function requireAdmin(permission?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !user.can("admin:access")) redirect("/admin/login");
  if (permission && !user.can(permission)) redirect("/admin/denied");
  return user;
}
