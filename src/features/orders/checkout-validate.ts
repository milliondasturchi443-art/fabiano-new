/** Проверка формы оформления заказа — одна и та же в браузере (мгновенно) и на сервере (решение). */
import { uzPhoneDigits, validatePersonName, validateUzMobile } from "@/lib/validate-contact";

export type CheckoutField = "firstName" | "lastName" | "phone" | "region" | "district" | "street" | "house";
export type FieldErrors = Partial<Record<CheckoutField, string>>;

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** «sdada», «dsadas», «qweqwe» — набор соседних клавиш одного ряда, а не слово. */
export function looksLikeKeyboardMash(text: string): boolean {
  const words = text.toLowerCase().replace(/[ʻʼ'`‘’]/g, "").split(/[^a-z]+/).filter((w) => w.length >= 4);
  return words.some((w) => ROWS.some((row) => {
    if (![...w].every((ch) => row.includes(ch))) return false;
    const idx = [...w].map((ch) => row.indexOf(ch));
    return Math.max(...idx) - Math.min(...idx) <= 3;
  }));
}

export function validateCheckout(v: Record<string, string | undefined>): FieldErrors {
  const e: FieldErrors = {};
  const fn = validatePersonName(v.firstName ?? "");
  if (fn) e.firstName = fn;
  const ln = validatePersonName(v.lastName ?? "");
  if (ln) e.lastName = ln;
  const ph = validateUzMobile(uzPhoneDigits(v.phone ?? ""));
  if (ph) e.phone = ph;
  if (!(v.region ?? "").trim()) e.region = "REGION_EMPTY";
  const district = (v.district ?? "").trim();
  if (district.length < 2 || !/\p{L}{2,}/u.test(district)) e.district = "ADDR_DISTRICT";
  else if (looksLikeKeyboardMash(district)) e.district = "ADDR_FAKE";
  const street = (v.street ?? "").trim();
  if (street.length < 3 || !/\p{L}{2,}/u.test(street)) e.street = "ADDR_STREET";
  else if (looksLikeKeyboardMash(street)) e.street = "ADDR_FAKE";
  const house = (v.house ?? "").trim();
  if (!house || house.length > 30 || !/\d/.test(house)) e.house = "ADDR_HOUSE";
  return e;
}
