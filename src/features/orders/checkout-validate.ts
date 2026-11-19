/** Проверка формы оформления заказа — одна и та же в браузере (мгновенно) и на сервере (решение). */
import { uzPhoneDigits, validatePersonName, validateUzMobile } from "@/lib/validate-contact";

export type CheckoutField = "firstName" | "lastName" | "phone" | "region" | "district" | "street" | "house";
export type FieldErrors = Partial<Record<CheckoutField, string>>;

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
  const street = (v.street ?? "").trim();
  if (street.length < 3 || !/\p{L}{2,}/u.test(street)) e.street = "ADDR_STREET";
  const house = (v.house ?? "").trim();
  if (!house || house.length > 30 || !/\d/.test(house)) e.house = "ADDR_HOUSE";
  return e;
}
