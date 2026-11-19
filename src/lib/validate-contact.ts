/**
 * Проверка имени и мобильного номера Узбекистана (логика из прототипа FABIANO).
 * Возвращает код ошибки или null. Используется и в браузере (подсказки), и на сервере (решение).
 */

export const UZ_MOBILE_OPERATORS: Record<string, string> = {
  "20": "Humans", "33": "Humans", "50": "Ucell", "55": "Uzmobile", "77": "Uzmobile", "88": "Mobiuz",
  "90": "Beeline", "91": "Beeline", "93": "Ucell", "94": "Ucell", "95": "Uzmobile", "97": "Mobiuz",
  "98": "Perfectum", "99": "Uzmobile",
};

/** 9 национальных цифр из любого ввода ("+998 (90) 123-45-67" → "901234567"). */
export function uzPhoneDigits(v: string): string {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("998") && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
}

/** "901234567" → "90 123 45 67" (для поля ввода по мере набора). */
export function formatUzPhoneInput(d: string): string {
  d = String(d ?? "").slice(0, 9);
  let o = "";
  if (d.length > 0) o += d.slice(0, 2);
  if (d.length > 2) o += " " + d.slice(2, 5);
  if (d.length > 5) o += " " + d.slice(5, 7);
  if (d.length > 7) o += " " + d.slice(7, 9);
  return o;
}

export type PhoneError = "PHONE_EMPTY" | "PHONE_SHORT" | "PHONE_OPERATOR" | "PHONE_FAKE";

export function validateUzMobile(digits: string): PhoneError | null {
  if (!digits) return "PHONE_EMPTY";
  if (digits.length < 9) return "PHONE_SHORT";
  const op = digits.slice(0, 2);
  const sub = digits.slice(2);
  if (!UZ_MOBILE_OPERATORS[op]) return "PHONE_OPERATOR";
  if (/^(\d)\1{6}$/.test(sub) || new Set(sub).size < 3 || /(\d)\1{4,}/.test(sub)) return "PHONE_FAKE";
  if ("0123456789".includes(sub) || "9876543210".includes(sub)) return "PHONE_FAKE";
  return null;
}

export function operatorOf(digits: string): string | null {
  return digits.length >= 2 ? UZ_MOBILE_OPERATORS[digits.slice(0, 2)] ?? null : null;
}

const NAME_BLACKLIST = ["test", "asd", "asdf", "qwe", "qwerty", "admin", "ism", "familiya", "name", "user", "fake", "sohta", "abc", "xxx", "yyy", "zzz", "nomalum", "anonim", "aaa", "qqq", "www", "lol"];

export type NameError = "NAME_EMPTY" | "NAME_SHORT" | "NAME_LONG" | "NAME_CHARS" | "NAME_FAKE";

export function validatePersonName(v: string): NameError | null {
  v = String(v ?? "").trim();
  if (!v) return "NAME_EMPTY";
  if (v.length < 2) return "NAME_SHORT";
  if (v.length > 30) return "NAME_LONG";
  if (!/^[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ'ʻʼ‘’` -]+$/.test(v)) return "NAME_CHARS";
  const low = v.toLowerCase().replace(/[^a-zа-яёўқғҳ]/g, "");
  if (low.length < 2 || !/[aeiouаеёиоуэюяў]/.test(low) || /(.)\1{2,}/.test(low) || /^[bcdfghjklmnpqrstvwxyz]{4,}/.test(low)) return "NAME_FAKE";
  if (NAME_BLACKLIST.some((b) => low === b || (low.startsWith(b) && low.length <= b.length + 2))) return "NAME_FAKE";
  return null;
}

/** "aZIZ  ali-bek" → "Aziz Ali-Bek" */
export function capitalizeName(s: string): string {
  return String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
}
