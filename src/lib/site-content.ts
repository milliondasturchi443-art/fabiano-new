/**
 * Тексты и контакты, которые владелец меняет в админке («Sayt matnlari», «Aloqa va tarmoqlar»).
 * Хранятся в StoreSettings.homeContent / address / socials. Пустое поле = текст по умолчанию из переводов.
 */

export const TEXT_FIELDS = [
  { key: "announce", group: "home", label: "Yuqoridagi eʼlon satri (boʻsh qolsa koʻrinmaydi)", ph: "Masalan: Yangi kolleksiya keldi", max: 160 },
  { key: "heroEyebrow", group: "home", label: "Kichik sarlavha", ph: "FABIANO", max: 60 },
  { key: "heroTitle", group: "home", label: "Asosiy sarlavha", ph: "Sizni *ifodalovchi* uslub", max: 120, full: true },
  { key: "heroText", group: "home", label: "Sarlavha ostidagi matn", ph: "", max: 300, full: true },
  { key: "btnMen", group: "home", label: "1-tugma", ph: "Erkaklar kolleksiyasi", max: 40 },
  { key: "btnWomen", group: "home", label: "2-tugma", ph: "Ayollar kolleksiyasi", max: 40 },
  { key: "deliveryNote", group: "home", label: "Mahsulot sahifasidagi yetkazib berish izohi (boʻsh qolsa — «Xitoydan … kunda»)", ph: "Buyurtma asosida Xitoydan keltiriladi — 15–25 kunda yetkaziladi", max: 240, full: true },
  { key: "newTitle", group: "home", label: "Mahsulotlar boʻlimi sarlavhasi", ph: "Yangi kelganlar", max: 80 },
  { key: "aboutTitle", group: "about", label: "Sarlavha", ph: "FABIANO haqida", max: 120, full: true },
  { key: "aboutText", group: "about", label: "Matn", ph: "", max: 2000, full: true, area: true },
  { key: "leadTitle", group: "lead", label: "Sarlavha", ph: "Raqamingizni qoldiring", max: 120 },
  { key: "leadText", group: "lead", label: "Matn", ph: "", max: 400 },
  { key: "footerText", group: "footer", label: "Pastki qismdagi qisqa matn", ph: "", max: 300, full: true },
] as const;

export type TextKey = (typeof TEXT_FIELDS)[number]["key"];
export type SiteTexts = Partial<Record<TextKey, string>>;
type Loc = "uz" | "ru" | "en";

interface HomeContent {
  texts?: Partial<Record<Loc, SiteTexts>>;
  announce?: Partial<Record<Loc, string>>; // старый формат
  about?: Partial<Record<Loc, string>>; // старый формат
}

export function siteTexts(homeContent: unknown, locale: Loc): SiteTexts {
  const c = (homeContent ?? {}) as HomeContent;
  const t = { ...(c.texts?.[locale] ?? {}) };
  if (!t.announce && c.announce?.[locale]) t.announce = c.announce[locale];
  if (!t.aboutText && c.about?.[locale]) t.aboutText = c.about[locale];
  for (const k of Object.keys(t) as TextKey[]) if (!t[k]?.trim()) delete t[k];
  return t;
}

/** Информационные страницы, которые редактируются во вкладке «Sayt matnlari». */
export const INFO_PAGES = [
  { slug: "about", label: "«Biz haqimizda» sahifasi", title: { uz: "Biz haqimizda", ru: "О нас", en: "About us" } },
  { slug: "shipping-returns", label: "Yetkazib berish va qaytarish", title: { uz: "Yetkazib berish va qaytarish", ru: "Доставка и возврат", en: "Shipping & returns" } },
  { slug: "privacy", label: "Maxfiylik siyosati", title: { uz: "Maxfiylik siyosati", ru: "Политика конфиденциальности", en: "Privacy policy" } },
] as const;

// ── Контакты и соцсети ─────────────────────────────

export interface ContactInfo {
  phone?: string | null;
  phone2?: string;
  email?: string | null;
  hours?: string;
  address?: string;
}

export const SOCIALS = ["instagram", "telegram", "whatsapp", "facebook", "tiktok", "youtube"] as const;
export type SocialKey = (typeof SOCIALS)[number];
export const SOCIAL_LABEL: Record<SocialKey, string> = {
  instagram: "Instagram", telegram: "Telegram", whatsapp: "WhatsApp", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube",
};

/** «@fabiano», «fabiano», «t.me/fabiano» или полная ссылка → https-ссылка. */
export function socialUrl(key: SocialKey, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https:\/\/[^\s]+$/i.test(v)) return v;
  if (/^http:\/\//i.test(v)) return v.replace(/^http:/i, "https:");
  if (/^[\w.-]+\.[a-z]{2,}\//i.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, "").replace(/\s/g, "");
  if (key === "whatsapp") {
    const d = v.replace(/\D/g, "");
    const full = d.length === 9 ? `998${d}` : d;
    return full.length >= 11 ? `https://wa.me/${full}` : null;
  }
  if (!/^[\w.-]{2,60}$/.test(handle)) return null;
  return {
    instagram: `https://instagram.com/${handle}`,
    telegram: `https://t.me/${handle}`,
    facebook: `https://facebook.com/${handle}`,
    tiktok: `https://www.tiktok.com/@${handle}`,
    youtube: `https://www.youtube.com/@${handle}`,
  }[key];
}

export function socialList(socials: unknown): { key: SocialKey; label: string; url: string }[] {
  const s = (socials ?? {}) as Partial<Record<SocialKey, string>>;
  return SOCIALS.flatMap((k) => (s[k] ? [{ key: k, label: SOCIAL_LABEL[k], url: s[k]! }] : []));
}

export function contactInfo(settings: { contactPhone?: string | null; contactEmail?: string | null; address?: unknown } | null): ContactInfo {
  const a = (settings?.address ?? {}) as { text?: string; hours?: string; phone2?: string };
  return { phone: settings?.contactPhone, email: settings?.contactEmail, phone2: a.phone2, hours: a.hours, address: a.text };
}
