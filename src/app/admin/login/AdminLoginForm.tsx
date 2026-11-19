"use client";

import { startTransition, useActionState } from "react";
import { adminLoginAction } from "@/features/admin/auth-actions";

export function AdminLoginForm() {
  const [state, dispatch, pending] = useActionState(adminLoginAction, null);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <div className="fld"><label htmlFor="l-e">Login</label><input id="l-e" className="inp" name="email" type="email" autoComplete="username" placeholder="admin@fabiano.uz" /></div>
      <div className="fld"><label htmlFor="l-p">Parol</label><input id="l-p" className="inp" name="password" type="password" autoComplete="current-password" placeholder="Parol" /></div>
      {state?.error && <p role="alert" style={{ color: "#ff8a8a", fontSize: 13 }}>{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-50">{pending ? "Tekshirilmoqda…" : "Kirish"}</button>
    </form>
  );
}
