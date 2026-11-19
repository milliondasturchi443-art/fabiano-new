import { prisma } from "@/lib/prisma";
import { localized } from "@/services/catalog";
import { requireAdmin } from "@/features/admin/guard";
import { savePaymentDeliveryAction } from "@/features/admin/site-actions";
import { setTryOnProviderAction } from "@/features/admin/store-actions";
import { SaveForm } from "@/components/admin/ui";

export const metadata = { title: "Toʻlov va yetkazish" };

function Switch({ name, on, label }: { name: string; on: boolean; label: string }) {
  return (
    <label style={{ position: "relative", flex: "none" }}>
      <input type="checkbox" className="swc" name={name} defaultChecked={on} aria-label={label} />
      <span className="sw" />
    </label>
  );
}

export default async function AdminSettings() {
  await requireAdmin("*");
  const [s, deliveries, payments] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: "default" } }),
    prisma.deliveryMethod.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.paymentMethodConfig.findMany(),
  ]);
  const cod = payments.find((p) => p.provider === "CASH_ON_DELIVERY");
  const courier = deliveries.find((d) => d.type === "COURIER");
  const pickup = deliveries.find((d) => d.type === "PICKUP");
  const paymeReady = Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_SECRET_KEY);
  const clickReady = Boolean(process.env.CLICK_SERVICE_ID && process.env.CLICK_SECRET_KEY);
  const decartReady = Boolean(process.env.DECART_API_KEY);
  const anywearOk = process.env.ANYWEAR_ENABLED === "1";
  const canOrder = Boolean(cod?.isEnabled) && deliveries.some((d) => d.isEnabled);
  const n = (v: { toString(): string } | null | undefined) => (v && Number(v) > 0 ? String(Math.round(Number(v))) : "");

  return (
    <div>
      <h2 className="h">Toʻlov va yetkazish</h2>
      <p className="sub">Mijoz rasmiylashtirishda koʻradigan variantlar.</p>
      {!canOrder && (
        <div className="anote">Xaridorlar buyurtma bera olishi uchun «Yetkazib berishda toʻlash» va kamida bitta yetkazib berish usulini yoqib, saqlang.</div>
      )}
      <SaveForm action={savePaymentDeliveryAction}>
        <div className="panel">
          <div className="panel-h"><h4>Toʻlov usullari</h4></div>
          <div className="srow">
            <div><b>Yetkazib berishda toʻlash</b><span className="d">Naqd yoki karta orqali kuryerga. «Yetkazildi» holatida toʻlangan deb belgilanadi.</span></div>
            <Switch name="cod" on={Boolean(cod?.isEnabled)} label="Yetkazib berishda toʻlash" />
          </div>
          <div className="srow">
            <div><b>Payme</b><span className="d">{paymeReady ? "Kalitlar kiritilgan — ulanish keyingi bosqichda." : "Ulash uchun Payme’dan merchant kalitlari kerak."}</span></div>
            <span className="sw" aria-disabled style={{ opacity: 0.35, cursor: "not-allowed" }} title="Kalitlar kerak" />
          </div>
          <div className="srow">
            <div><b>Click</b><span className="d">{clickReady ? "Kalitlar kiritilgan — ulanish keyingi bosqichda." : "Ulash uchun Click merchant kalitlari kerak."}</span></div>
            <span className="sw" aria-disabled style={{ opacity: 0.35, cursor: "not-allowed" }} title="Kalitlar kerak" />
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><h4>Yetkazib berish</h4></div>
          <div className="srow">
            <div><b>Kuryer orqali</b><span className="d">Manzilgacha yetkazib berish</span></div>
            <Switch name="courier" on={courier ? courier.isEnabled : true} label="Kuryer orqali" />
          </div>
          <div className="panel-b fgrid" style={{ paddingTop: 4 }}>
            <div className="fld"><label htmlFor="d-price">Kuryer narxi (soʻm)</label><input id="d-price" className="inp" name="courierPrice" inputMode="numeric" defaultValue={n(courier?.price)} placeholder="Boʻsh qolsa — narxni operator aytadi" /></div>
            <div className="fld"><label htmlFor="d-free">Bepul yetkazish (summadan boshlab)</label><input id="d-free" className="inp" name="freeFrom" inputMode="numeric" defaultValue={n(courier?.freeFrom)} placeholder="Masalan: 1000000" /></div>
            <div className="fld"><label htmlFor="d-eta">Yetkazib berish muddati, kun</label><input id="d-eta" className="inp" name="etaDays" defaultValue={courier?.etaDays ?? ""} placeholder="15–25" /><span className="hint" style={{ fontSize: 12, color: "var(--mut)" }}>Mahsulot sahifasi va chekda koʻrinadi (Xitoydan kelish muddati)</span></div>
          </div>
          <div className="srow">
            <div><b>Olib ketish punkti</b><span className="d">Mijoz oʻzi olib ketishi mumkin</span></div>
            <Switch name="pickup" on={Boolean(pickup?.isEnabled)} label="Olib ketish punkti" />
          </div>
          <div className="panel-b" style={{ paddingTop: 4 }}>
            <div className="fld"><label htmlFor="d-addr">Olib ketish punkti manzili</label><input id="d-addr" className="inp" name="pickupAddr" defaultValue={pickup ? localized(pickup.pickupAddress, "uz") : ""} /></div>
          </div>
        </div>
      </SaveForm>

      <div className="panel" id="try-on" style={{ marginTop: 10 }}>
        <div className="panel-h"><h4>Jonli kiyib koʻrish</h4></div>
        {([
          { v: "decart", t: "Oʻz tugmamiz (tavsiya etiladi)", d: decartReady ? "«Hozir sotib olish» ostidagi «Jonli kiyib koʻrish» tugmasi. Toʻlov — Decart kalitingizdan, soniyasiga ~$0.02. Seans 90 soniyagacha." : "Ishlashi uchun Render → Environment’ga DECART_API_KEY qoʻshing." },
          { v: "anywear", t: "Anywear vidjeti", d: anywearOk ? "Anywear’ning suzuvchi oynasi (chap pastda)." : "Faqat doʻkon anywear.decart.ai/business’da roʻyxatdan oʻtgach ishlaydi. Hozircha tanlansa ham, saytda oʻz tugmamiz koʻrinadi." },
          { v: "off", t: "Oʻchirilgan", d: "Saytda kiyib koʻrish koʻrinmaydi." },
        ] as const).map((o) => {
          const active = (s?.tryOnProvider ?? "decart") === o.v;
          return (
            <form key={o.v} action={setTryOnProviderAction} className="srow">
              <input type="hidden" name="provider" value={o.v} />
              <div>
                <b>{o.t} {active && <span className="st s3" style={{ marginLeft: 6 }}>yoqilgan</span>}</b>
                <span className="d">{o.d}</span>
              </div>
              <button type="submit" className={`sw ${active ? "on" : ""}`} disabled={!active && o.v === "decart" && !decartReady} aria-label={`${o.t} — yoqish`} />
            </form>
          );
        })}
      </div>
    </div>
  );
}
