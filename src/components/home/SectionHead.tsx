/** Заголовок секции из прототипа: капитель, крупный Italiana, орнамент ✦ */
export function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-11 text-center">
      <p className="eyebrow text-gold">{eyebrow}</p>
      <h2 className="mt-2.5 text-[clamp(2.25rem,4.6vw,3.625rem)] leading-[1.05]">{title}</h2>
      <div className="orn mt-3.5" aria-hidden>✦</div>
    </div>
  );
}
