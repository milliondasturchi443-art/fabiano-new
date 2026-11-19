import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/admin/guard";
import { saveContactsAction } from "@/features/admin/site-actions";
import { SaveForm } from "@/components/admin/ui";
import { contactInfo, SOCIALS, SOCIAL_LABEL } from "@/lib/site-content";

export const metadata = { title: "Aloqa va tarmoqlar" };

const PH: Record<(typeof SOCIALS)[number], string> = {
  instagram: "@fabiano yoki toʻliq havola", telegram: "@fabiano yoki toʻliq havola", whatsapp: "90 123 45 67",
  facebook: "fabiano yoki toʻliq havola", tiktok: "@fabiano", youtube: "@fabiano",
};

const local = (e164?: string | null) => {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164 ?? "");
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164 ?? "";
};

export default async function AdminContacts() {
  await requireAdmin("*");
  const s = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  const c = contactInfo(s);
  const socials = (s?.socials ?? {}) as Partial<Record<(typeof SOCIALS)[number], string>>;
  const shown = (k: (typeof SOCIALS)[number]) => {
    const v = socials[k] ?? "";
    if (k === "whatsapp") return v.replace(/^https:\/\/wa\.me\/998/, "").replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
    return v;
  };

  return (
    <div>
      <h2 className="h">Aloqa va tarmoqlar</h2>
      <p className="sub">Toʻldirilgan maydonlar saytning pastki qismida va «Aloqa» sahifasida koʻrinadi. Boʻsh qolganlari koʻrinmaydi.</p>
      <SaveForm action={saveContactsAction}>
        <div className="panel">
          <div className="panel-h"><h4>Aloqa</h4></div>
          <div className="panel-b fgrid">
            <div className="fld"><label htmlFor="c-p1">Asosiy telefon</label><input id="c-p1" className="inp" name="phone" inputMode="tel" defaultValue={local(c.phone)} placeholder="90 123 45 67" /></div>
            <div className="fld"><label htmlFor="c-p2">Qoʻshimcha telefon</label><input id="c-p2" className="inp" name="phone2" inputMode="tel" defaultValue={local(c.phone2)} /></div>
            <div className="fld"><label htmlFor="c-em">Email</label><input id="c-em" className="inp" name="email" type="email" defaultValue={c.email ?? ""} /></div>
            <div className="fld"><label htmlFor="c-h">Ish vaqti</label><input id="c-h" className="inp" name="hours" defaultValue={c.hours ?? ""} placeholder="Masalan: Har kuni 10:00 – 20:00" /></div>
            <div className="fld full"><label htmlFor="c-a">Manzil</label><input id="c-a" className="inp" name="address" defaultValue={c.address ?? ""} /></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-h"><h4>Ijtimoiy tarmoqlar</h4></div>
          <div className="panel-b fgrid">
            {SOCIALS.map((k) => (
              <div key={k} className="fld"><label htmlFor={`s-${k}`}>{SOCIAL_LABEL[k]}</label><input id={`s-${k}`} className="inp" name={k} defaultValue={shown(k)} placeholder={PH[k]} /></div>
            ))}
          </div>
        </div>
      </SaveForm>
    </div>
  );
}
