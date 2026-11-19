/** Вешалка — заглушка вместо фото (из прототипа). */
export function Hanger({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      <path d="M32 6a4 4 0 114 4c-2 0-4 1.4-4 4v2L4 34h56L32 16" />
    </svg>
  );
}
