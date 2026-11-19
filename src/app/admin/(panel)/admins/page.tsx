import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/admin/guard";
import { changePasswordAction } from "@/features/admin/auth-actions";
import { createAdminAction, removeAdminAction, saveProfileNameAction } from "@/features/admin/site-actions";
import { ConfirmButton, SaveForm } from "@/components/admin/ui";

export const metadata = { title: "Adminlar" };

const ROLE: Record<string, string> = { admin: "Bosh admin", manager: "Menejer", content_editor: "Kontent" };

export default async function AdminAdmins() {
  const me = await requireAdmin("*");
  const users = await prisma.user.findMany({
    where: { roles: { some: { role: { name: { in: ["admin", "manager", "content_editor"] } } } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, firstName: true, createdAt: true, roles: { select: { role: { select: { name: true } } } } },
  });
  const self = users.find((u) => u.id === me.id);

  return (
    <div>
      <h2 className="h">Adminlar</h2>
      <p className="sub">Panelga kira oladigan adminlar. Yangi adminni pastdagi forma orqali qoʻshing.</p>

      <div className="panel">
        {users.map((u) => (
          <div key={u.id} className="srow">
            <div>
              <b>{u.firstName || u.email?.split("@")[0]} {u.id === me.id && <span className="st s5" style={{ marginLeft: 6 }}>siz</span>}</b>
              <span className="d">Login: {u.email} · {u.roles.map((r) => ROLE[r.role.name]).filter(Boolean).join(", ")} · {u.createdAt.toLocaleDateString("uz-Latn-UZ", { timeZone: "Asia/Tashkent" })}</span>
            </div>
            {u.id !== me.id && (
              <form action={removeAdminAction}>
                <input type="hidden" name="id" value={u.id} />
                <ConfirmButton label="Oʻchirish" confirm="Bu admin endi panelga kira olmaydi. Davom etasizmi?" />
              </form>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 26, margin: "34px 0 14px" }}>Yangi admin qoʻshish</h3>
      <SaveForm action={createAdminAction} submit="Qoʻshish" resetOnOk>
        <div className="panel">
          <div className="panel-b fgrid">
            <div className="fld"><label htmlFor="a-n">Ismi</label><input id="a-n" className="inp" name="name" placeholder="Masalan: Bekzod" /></div>
            <div className="fld"><label htmlFor="a-e">Login (email)</label><input id="a-e" className="inp" name="email" type="email" autoComplete="off" placeholder="bekzod@fabiano.uz" /></div>
            <div className="fld"><label htmlFor="a-p">Parol</label><input id="a-p" className="inp" name="password" type="password" autoComplete="new-password" placeholder="Kamida 10 ta belgi" /></div>
            <div className="fld"><label htmlFor="a-p2">Parolni takrorlang</label><input id="a-p2" className="inp" name="password2" type="password" autoComplete="new-password" /></div>
            <div className="fld">
              <label htmlFor="a-r">Huquqlar</label>
              <select id="a-r" className="inp" name="role" defaultValue="admin">
                <option value="admin">Bosh admin — hamma narsa</option>
                <option value="manager">Menejer — mahsulot va buyurtmalar</option>
              </select>
            </div>
          </div>
        </div>
      </SaveForm>

      <h3 style={{ fontSize: 26, margin: "34px 0 14px" }}>Mening profilim</h3>
      <SaveForm action={saveProfileNameAction}>
        <div className="panel">
          <div className="panel-b fgrid">
            <div className="fld"><label htmlFor="m-n">Ismim (panelda koʻrinadi)</label><input id="m-n" className="inp" name="name" defaultValue={self?.firstName ?? ""} placeholder="Masalan: Aziz" /></div>
          </div>
        </div>
      </SaveForm>
      <SaveForm action={changePasswordAction} submit="Parolni oʻzgartirish" resetOnOk>
        <div className="panel">
          <div className="panel-h"><h4>Parolni oʻzgartirish</h4></div>
          <div className="panel-b fgrid">
            <div className="fld full"><label htmlFor="pw-c">Joriy parol</label><input id="pw-c" className="inp" name="current" type="password" autoComplete="current-password" /></div>
            <div className="fld"><label htmlFor="pw-n">Yangi parol</label><input id="pw-n" className="inp" name="next" type="password" autoComplete="new-password" placeholder="Kamida 12 ta belgi" /></div>
            <div className="fld"><label htmlFor="pw-r">Yangi parolni takrorlang</label><input id="pw-r" className="inp" name="repeat" type="password" autoComplete="new-password" /></div>
          </div>
        </div>
      </SaveForm>
    </div>
  );
}
