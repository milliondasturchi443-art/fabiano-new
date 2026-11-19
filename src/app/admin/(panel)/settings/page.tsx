import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatUzPhone } from "@/lib/phone";
import { localized } from "@/services/catalog";
import { requireAdmin } from "@/features/admin/guard";
import { changePasswordAction } from "@/features/admin/auth-actions";
import { createDeliveryAction, deleteDeliveryAction, saveSettingsAction, saveTextsAction, toggleDeliveryAction, togglePaymentAction, toggleTryOnAction } from "@/features/admin/store-actions";
import { ActionForm, ConfirmButton, inputCls, labelCls } from "@/components/admin/ui";

export const metadata = { title: "Sozlamalar" };

export default async function AdminSettings() {
  await requireAdmin("*");
  const [s, deliveries, payments] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: "default" } }),
    prisma.deliveryMethod.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.paymentMethodConfig.findMany(),
  ]);
  const socials = (s?.socials ?? {}) as { instagram?: string; telegram?: string };
  const cod = payments.find((p) => p.provider === "CASH_ON_DELIVERY");
  const paymeReady = Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_SECRET_KEY);
  const decartReady = Boolean(process.env.DECART_API_KEY);
  const clickReady = Boolean(process.env.CLICK_SERVICE_ID && process.env.CLICK_SECRET_KEY);
  const locales = s?.enabledLocales ?? ["uz", "ru"];
  const texts = (s?.homeContent ?? {}) as { announce?: Record<string, string | undefined>; about?: Record<string, string | undefined> };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl md:text-5xl">Sozlamalar</h1>

      {(deliveries.filter((d) => d.isEnabled).length === 0 || !cod?.isEnabled) && (
        <p className="border border-accent/40 bg-accent/5 p-4 text-sm">
          Xaridorlar buyurtma bera olishi uchun kamida bitta yetkazib berish usulini qoʻshing va quyida toʻlov usulini yoqing. Shunga qadar rasmiylashtirish sahifasida «vaqtincha mavjud emas» xabari koʻrsatiladi.
        </p>
      )}

      <section id="payments" className="card p-6">
        <h2 className="text-2xl">Toʻlov usullari</h2>
        <ul className="mt-4 divide-y divide-line text-sm">
          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-medium">Qabul qilganda toʻlash</p><p className="text-xs text-muted">Kuryerga naqd yoki karta orqali. «Yetkazildi» holatida toʻlangan deb belgilanadi.</p></div>
            <form action={togglePaymentAction}>
              <input type="hidden" name="provider" value="CASH_ON_DELIVERY" />
              <button className={`btn btn-sm ${cod?.isEnabled ? "btn-outline" : "btn-primary"}`}>{cod?.isEnabled ? "Oʻchirish" : "Yoqish"}</button>
            </form>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-medium">Payme</p><p className="text-xs text-muted">{paymeReady ? "Kalitlar kiritilgan. Ulanish keyingi bosqichda." : "Sozlanmagan: Payme’dan PAYME_MERCHANT_ID va PAYME_SECRET_KEY kerak."}</p></div>
            <span className="text-xs text-muted">mavjud emas</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-medium">Click</p><p className="text-xs text-muted">{clickReady ? "Kalitlar kiritilgan. Ulanish keyingi bosqichda." : "Sozlanmagan: Click merchant kalitlari kerak."}</p></div>
            <span className="text-xs text-muted">mavjud emas</span>
          </li>
        </ul>
      </section>

      <section id="try-on" className="card p-6">
        <h2 className="text-2xl">Jonli kiyib koʻrish</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="max-w-xl">
            <p className="font-medium">
              Decart Lucy V-TON{" "}
              <span className={`pill ml-2 ${decartReady && s?.tryOnEnabled ? "text-success" : "text-muted"}`}>
                {!decartReady ? "kalit yoʻq" : s?.tryOnEnabled ? "yoqilgan" : "oʻchirilgan"}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {decartReady
                ? "Xaridor mahsulot sahifasida kamerani yoqadi va kiyimni real vaqtda ustida koʻradi. Rasmi bor barcha mahsulotlarda ishlaydi. Har bir seans 90 soniyagacha, bir IP uchun soatiga 8 ta."
                : "Ishlashi uchun platform.decart.ai’dan API kalit oling va Render → Environment’ga DECART_API_KEY sifatida qoʻshing."}
            </p>
          </div>
          {decartReady && (
            <form action={toggleTryOnAction}>
              <button className={`btn btn-sm ${s?.tryOnEnabled ? "btn-outline" : "btn-primary"}`}>{s?.tryOnEnabled ? "Oʻchirish" : "Yoqish"}</button>
            </form>
          )}
        </div>
      </section>

      <section id="delivery" className="card p-6">
        <h2 className="text-2xl">Yetkazib berish usullari</h2>
        {deliveries.length > 0 && (
          <ul className="mt-4 divide-y divide-line text-sm">
            {deliveries.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className={`font-medium ${d.isEnabled ? "" : "text-muted line-through"}`}>{localized(d.names, "uz")}</p>
                  <p className="price text-xs text-muted">
                    {Number(d.price) === 0 ? "Bepul" : formatMoney(d.price.toString(), "uz")}
                    {d.freeFrom ? ` · summadan bepul: ${formatMoney(d.freeFrom.toString(), "uz")}` : ""}
                    {d.etaDays ? ` · ${d.etaDays} kun` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <form action={toggleDeliveryAction}><input type="hidden" name="id" value={d.id} /><button className="text-xs underline underline-offset-4">{d.isEnabled ? "Oʻchirish" : "Yoqish"}</button></form>
                  <form action={deleteDeliveryAction}><input type="hidden" name="id" value={d.id} /><ConfirmButton label="Oʻchirish" confirm="Yetkazib berish usulini oʻchirasizmi? Agar u buyurtmalarda ishlatilgan boʻlsa, oʻchirib qoʻyiladi." /></form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={createDeliveryAction} submit="Usul qoʻshish" resetOnOk className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className={labelCls}>Turi</span><select name="type" className={inputCls}><option value="COURIER">Kuryer</option><option value="PICKUP">Olib ketish</option><option value="OTHER">Boshqa</option></select></label>
          <label><span className={labelCls}>Nomi UZ *</span><input name="name_uz" required placeholder="Kuryer orqali" className={inputCls} /></label>
          <label><span className={labelCls}>Nomi RU *</span><input name="name_ru" required placeholder="Kuryer orqali" className={inputCls} /></label>
          <label><span className={labelCls}>Nomi EN</span><input name="name_en" placeholder="Courier" className={inputCls} /></label>
          <label><span className={labelCls}>Narx, soʻm * (0 — bepul)</span><input name="price" required inputMode="numeric" className={`${inputCls} price`} /></label>
          <label><span className={labelCls}>Summadan boshlab bepul</span><input name="freeFrom" inputMode="numeric" className={`${inputCls} price`} /></label>
          <label><span className={labelCls}>Muddat, kun</span><input name="etaDays" placeholder="1–2" className={inputCls} /></label>
        </ActionForm>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl">Doʻkon</h2>
        <ActionForm action={saveSettingsAction} submit="Saqlash" className="mt-5 grid gap-4 sm:grid-cols-2">
          <label><span className={labelCls}>Doʻkon telefoni</span><input name="contactPhone" type="tel" defaultValue={s?.contactPhone ? formatUzPhone(s.contactPhone) : ""} placeholder="+998 90 123 45 67" className={`${inputCls} price`} /></label>
          <label><span className={labelCls}>Doʻkon emaili</span><input name="contactEmail" type="email" defaultValue={s?.contactEmail ?? ""} className={inputCls} /></label>
          <label><span className={labelCls}>Instagram (havola)</span><input name="instagram" defaultValue={socials.instagram ?? ""} placeholder="https://instagram.com/fabiano" className={inputCls} /></label>
          <label><span className={labelCls}>Telegram (havola)</span><input name="telegram" defaultValue={socials.telegram ?? ""} placeholder="https://t.me/fabiano" className={inputCls} /></label>
          <fieldset className="sm:col-span-2">
            <legend className={labelCls}>Sayt tillari</legend>
            <div className="mt-2 flex gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked disabled className="h-4 w-4" /> Oʻzbekcha (asosiy)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="enabledLocales" value="ru" defaultChecked={locales.includes("ru")} className="h-4 w-4 accent-[var(--color-gold)]" /> Ruscha</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="enabledLocales" value="en" defaultChecked={locales.includes("en")} className="h-4 w-4 accent-[var(--color-gold)]" /> Inglizcha</label>
            </div>
          </fieldset>
        </ActionForm>
      </section>

      <section id="texts" className="card p-6">
        <h2 className="text-2xl">Matnlar</h2>
        <p className="mt-2 text-xs text-muted">Eʼlon — sayt tepasidagi bordo qatorda chiqadi (boʻsh qoldirsangiz, koʻrinmaydi). «Biz haqimizda» — bosh sahifadagi blok matni.</p>
        <ActionForm action={saveTextsAction} submit="Saqlash" className="mt-5 grid gap-4 md:grid-cols-3">
          {(["uz", "ru", "en"] as const).map((l) => (
            <label key={`a-${l}`}><span className={labelCls}>Eʼlon {l.toUpperCase()}</span><input name={`announce_${l}`} maxLength={160} defaultValue={texts.announce?.[l] ?? ""} placeholder={l === "uz" ? "Masalan: Toshkent boʻylab yetkazib berish" : ""} className={inputCls} /></label>
          ))}
          {(["uz", "ru", "en"] as const).map((l) => (
            <label key={`b-${l}`}><span className={labelCls}>Biz haqimizda {l.toUpperCase()}</span><textarea name={`about_${l}`} rows={5} maxLength={2000} defaultValue={texts.about?.[l] ?? ""} className="field field-sm mt-1.5" /></label>
          ))}
        </ActionForm>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl">Parolni oʻzgartirish</h2>
        <ActionForm action={changePasswordAction} submit="Parolni oʻzgartirish" resetOnOk className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-3">
          <label><span className={labelCls}>Joriy parol</span><input name="current" type="password" required autoComplete="current-password" className={inputCls} /></label>
          <label><span className={labelCls}>Yangi (kamida 12 belgi)</span><input name="next" type="password" required minLength={12} autoComplete="new-password" className={inputCls} /></label>
          <label><span className={labelCls}>Yangisini takrorlang</span><input name="repeat" type="password" required minLength={12} autoComplete="new-password" className={inputCls} /></label>
        </ActionForm>
      </section>
    </div>
  );
}
