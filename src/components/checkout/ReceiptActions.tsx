"use client";

import { useState } from "react";

export function ReceiptActions({ printLabel, copyLabel, copiedLabel }: { printLabel: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="print-hide flex flex-col gap-3 sm:flex-row sm:justify-center">
      <button type="button" onClick={() => window.print()} className="btn btn-primary">{printLabel}</button>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => {
          navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
