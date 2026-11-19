"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/features/admin/auth-actions";

export const inputCls = "field field-sm mt-1.5";
export const labelCls = "block text-xs font-medium text-muted";

/** Форма админки с сообщением об успехе/ошибке. resetOnOk — очистить поля после успеха. */
export function ActionForm({
  action, children, className = "", submit, resetOnOk = false, encType,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  submit: string;
  resetOnOk?: boolean;
  encType?: "multipart/form-data";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className} encType={encType}>
      {children}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-50">{pending ? "Saqlanmoqda…" : submit}</button>
        {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-success">{state.ok}</p>}
      </div>
    </form>
  );
}

/** Кнопка с подтверждением без системного диалога: первый клик раскрывает «Точно?». */
export function ConfirmButton({ label, confirm, className = "" }: { label: string; confirm: string; className?: string }) {
  return (
    <details className={`group relative inline-block ${className}`}>
      <summary className="mb red cursor-pointer list-none [&::-webkit-details-marker]:hidden">{label}</summary>
      <div className="absolute right-0 z-10 mt-2 w-56 border border-line bg-paper p-3 text-left shadow-lg">
        <p className="text-xs text-muted">{confirm}</p>
        <button type="submit" className="btn btn-danger btn-sm mt-3 w-full">{label}</button>
      </div>
    </details>
  );
}

/**
 * Форма вкладки в стиле прототипа: кнопка «Saqlash» внизу (липкая), сообщение рядом.
 * Отправка через dispatch — React не очищает поля, если сервер вернул ошибку.
 */
export function SaveForm({
  action, children, submit = "Saqlash", resetOnOk = false,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit?: string;
  resetOnOk?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form
      ref={ref}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {children}
      <div className="sticky-save">
        {state?.error && <p role="alert" style={{ color: "var(--err)", fontSize: 13, marginRight: "auto" }}>{state.error}</p>}
        {state?.ok && <p role="status" style={{ color: "var(--ok)", fontSize: 13, marginRight: "auto" }}>✓ {state.ok}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-50">{pending ? "Saqlanmoqda…" : submit}</button>
      </div>
    </form>
  );
}
