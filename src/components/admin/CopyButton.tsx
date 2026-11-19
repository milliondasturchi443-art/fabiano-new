"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Nusxa" }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="mb"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => {});
      }}
    >
      {ok ? "✓" : label}
    </button>
  );
}
