"use client";

import { useState } from "react";
import { formatUzPhoneInput, operatorOf, uzPhoneDigits } from "@/lib/validate-contact";

/** Поле номера как в прототипе: флаг Узбекистана, +998, маска «90 123 45 67», название оператора справа. */
export function PhoneInput({ name, defaultValue, invalid, describedBy }: { name: string; defaultValue?: string | null; invalid?: boolean; describedBy?: string }) {
  const [digits, setDigits] = useState(() => uzPhoneDigits(defaultValue ?? ""));
  const op = digits.length >= 2 ? operatorOf(digits) : null;
  return (
    <div className={`flex h-[3.25rem] items-center border bg-canvas transition-colors focus-within:border-gold ${invalid ? "border-danger" : "border-line"}`}>
      <span className="flex h-full items-center gap-2 border-r border-line pl-4 pr-3.5 font-semibold">
        <span className="flex h-[13px] w-5 flex-col overflow-hidden rounded-[2px]" aria-hidden>
          <i className="flex-1 bg-[#1eb5e8]" />
          <i className="flex-1 border-y border-[#d22] bg-white" />
          <i className="flex-1 bg-[#1eb53a]" />
        </span>
        +998
      </span>
      <input
        type="tel"
        inputMode="numeric"
        name={name}
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        value={formatUzPhoneInput(digits)}
        onChange={(e) => setDigits(uzPhoneDigits(e.target.value))}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-full min-w-0 flex-1 bg-transparent px-3.5 font-medium tracking-[0.06em] outline-none"
      />
      {op && <span className="pr-3.5 font-caps text-[0.56rem] uppercase tracking-[0.14em] text-gold">{op}</span>}
    </div>
  );
}
