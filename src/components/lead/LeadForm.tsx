"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitLeadAction, type LeadState } from "@/features/leads/actions";
import { formatUzPhoneInput } from "@/lib/validate-contact";
import { PhoneInput } from "./PhoneInput";

/** Блок «Raqamingizni qoldiring»: заявка сохраняется в базе и видна в админке (Murojaatlar). */
export function LeadForm({ productId, page, title, text }: { productId?: string; page?: string; title?: string; text?: string }) {
  const t = useTranslations("lead");
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLeadAction, { status: "idle" });
  const err = state.status === "error" ? state : null;
  const msg = (code: string) => (t.has(`errors.${code}`) ? t(`errors.${code}` as "errors.GENERIC") : t("errors.GENERIC"));

  return (
    <div className="grid border border-line bg-paper lg:grid-cols-[1fr_1.15fr]">
      <div className="border-b border-line bg-[radial-gradient(ellipse_at_20%_0%,rgb(122_26_45/0.65),transparent_70%),var(--color-surface)] px-6 py-8 lg:border-b-0 lg:border-r lg:p-[52px]">
        <p className="eyebrow text-champagne">{t("eyebrow")}</p>
        <h2 className="mb-4 mt-3.5 text-[2.125rem] leading-[1.05] lg:text-[2.75rem]">{title || t("title")}</h2>
        <p className="font-light text-muted">{text || t("text")}</p>
      </div>

      {state.status === "ok" ? (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center lg:p-[52px]" role="status">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-gold text-2xl text-champagne">✓</div>
          <h3 className="text-[2rem]">{t("thanks", { name: state.name })}</h3>
          <p className="mt-2 text-muted">{t("thanksText", { phone: `+998 ${formatUzPhoneInput(state.phone)}` })}</p>
        </div>
      ) : (
        <form action={action} noValidate className="grid gap-4 px-6 py-7 sm:grid-cols-2 lg:p-[52px]">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          {productId && <input type="hidden" name="productId" value={productId} />}
          {page && <input type="hidden" name="page" value={page} />}

          <label className="flex flex-col gap-2">
            <span className="label">{t("firstName")} <i className="not-italic text-gold">*</i></span>
            <input name="firstName" defaultValue={err?.values.firstName} autoComplete="given-name" placeholder={t("firstNamePh")} aria-invalid={err?.field === "firstName" || undefined} className="field" />
            {err?.field === "firstName" && <span className="text-[0.78rem] text-danger">{msg(err.code)}</span>}
          </label>
          <label className="flex flex-col gap-2">
            <span className="label">{t("lastName")} <i className="not-italic text-gold">*</i></span>
            <input name="lastName" defaultValue={err?.values.lastName} autoComplete="family-name" placeholder={t("lastNamePh")} aria-invalid={err?.field === "lastName" || undefined} className="field" />
            {err?.field === "lastName" && <span className="text-[0.78rem] text-danger">{msg(err.code)}</span>}
          </label>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="label" id="lead-phone-label">{t("phone")} <i className="not-italic text-gold">*</i></span>
            <PhoneInput key={err?.values.phone ?? "p"} name="phone" defaultValue={err?.values.phone} invalid={err?.field === "phone"} describedBy={err?.field === "phone" ? "lead-phone-err" : "lead-phone-label"} />
            {err?.field === "phone" && <span id="lead-phone-err" className="text-[0.78rem] text-danger">{msg(err.code)}</span>}
          </div>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="label">{t("question")}</span>
            <input name="question" defaultValue={err?.values.question} maxLength={500} placeholder={t("questionPh")} className="field" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? t("sending") : t("submit")}</button>
            {err && !err.field && <p role="alert" className="mt-3 text-sm text-danger">{msg(err.code)}</p>}
            <p className="mt-3.5 flex items-center gap-2.5 text-[0.78rem] text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
              {t("privacy")}
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
