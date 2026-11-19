"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { loginAction, registerAction, type AuthState } from "@/features/auth/actions";

export function AuthForms({ next, initialTab = "login" }: { next?: string; initialTab?: "login" | "register" }) {
  const t = useTranslations("account");
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="mx-auto w-full max-w-md">
      <div role="tablist" className="grid grid-cols-2 border-b border-line">
        {(["login", "register"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`eyebrow -mb-px h-14 border-b-2 transition-colors ${tab === k ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <div className="pt-8">{tab === "login" ? <LoginForm next={next} /> : <RegisterForm next={next} />}</div>
    </div>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  const t = useTranslations("account");
  if (!state?.error) return null;
  const key = `errors.${state.error}`;
  return <p role="alert" className="text-sm text-danger">{t.has(key) ? t(key as "errors.GENERIC") : t("errors.GENERIC")}</p>;
}

export function Field({
  label, name, type = "text", autoComplete, required = true, hint, defaultValue, inputMode, placeholder,
}: {
  label: string; name: string; type?: string; autoComplete?: string; required?: boolean; hint?: string;
  defaultValue?: string | null; inputMode?: "text" | "email" | "tel" | "numeric"; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        className="field mt-1.5"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.values?.email} />
      <Field label={t("password")} name="password" type="password" autoComplete="current-password" />
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-50">{t("submitLogin")}</button>
    </form>
  );
}

function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [state, action, pending] = useActionState(registerAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("firstName")} name="firstName" autoComplete="given-name" defaultValue={state?.values?.firstName} />
        <Field label={t("lastName")} name="lastName" autoComplete="family-name" defaultValue={state?.values?.lastName} />
      </div>
      <Field label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.values?.email} />
      <Field label={`${t("phone")} (${t("optional")})`} name="phone" type="tel" autoComplete="tel" inputMode="tel" required={false} placeholder="+998 90 123 45 67" defaultValue={state?.values?.phone} />
      <Field label={t("password")} name="password" type="password" autoComplete="new-password" hint={t("passwordHint")} />
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-50">{t("submitRegister")}</button>
    </form>
  );
}
