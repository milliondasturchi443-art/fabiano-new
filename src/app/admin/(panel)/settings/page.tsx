import { prisma } from "@/lib/prisma";
import { localized } from "@/services/catalog";
import { requireAdmin } from "@/features/admin/guard";
import { savePaymentDeliveryAction } from "@/features/admin/site-actions";
import { toggleTryOnAction } from "@/features/admin/store-actions";
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
            <div className="fld"><label htmlFor="d-price">Kuryer narxi (soʻm)</label><input id="d-price" className="inp" name="courierPrice" inputMode="numeric" defaultValue={n(courier?.price)} placeholder="Boʻsh qolsa — bepul" /></div>
            <div className="fld"><label htmlFor="d-free">Bepul yetkazish (summadan boshlab)</label><input id="d-free" className="inp" name="freeFrom" inputMode="numeric" defaultValue={n(courier?.freeFrom)} placeholder="Masalan: 1000000" /></div>
            <div className="fld"><label htmlFor="d-eta">Muddat, kun</label><input id="d-eta" className="inp" name="etaDays" defaultValue={courier?.etaDays ?? ""} placeholder="1–2" /></div>
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
        <div className="srow">
          <div>
            <b>Decart Lucy V-TON <span className={`st ${decartReady && s?.tryOnEnabled ? "s3" : "s0"}`} style={{ marginLeft: 6 }}>{!decartReady ? "kalit yoʻq" : s?.tryOnEnabled ? "yoqilgan" : "oʻchirilgan"}</span></b>
            <span className="d">
              {decartReady
                ? "Xaridor mahsulot sahifasida kamerani yoqadi va kiyimni real vaqtda ustida koʻradi. Rasmi bor barcha mahsulotlarda ishlaydi. Har bir seans 90 soniyagacha, bir IP uchun soatiga 8 ta."
                : "Ishlashi uchun platform.decart.ai’dan API kalit oling va Render → Environment’ga DECART_API_KEY sifatida qoʻshing."}
            </span>
          </div>
          {decartReady && (
            <form action={toggleTryOnAction}>
              <button type="submit" className={`sw ${s?.tryOnEnabled ? "on" : ""}`} aria-label={s?.tryOnEnabled ? "Oʻchirish" : "Yoqish"} />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
