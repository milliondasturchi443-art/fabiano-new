import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCheckout } from "../../src/features/orders/checkout-validate";

const ok = { firstName: "Aziz", lastName: "Karimov", phone: "90 315 72 48", region: "Toshkent shahri", district: "Chilonzor", street: "Bunyodkor koʻchasi", house: "12A" };

test("valid checkout passes", () => {
  assert.deepEqual(validateCheckout(ok), {});
});

test("fake names, bad phone and address are rejected", () => {
  const e = validateCheckout({ ...ok, firstName: "asd", lastName: "1234", phone: "12 345 67 89", region: "", district: "1", street: "x", house: "uy" });
  assert.equal(e.firstName, "NAME_FAKE");
  assert.equal(e.lastName, "NAME_CHARS");
  assert.equal(e.phone, "PHONE_OPERATOR");
  assert.equal(e.region, "REGION_EMPTY");
  assert.equal(e.district, "ADDR_DISTRICT");
  assert.equal(e.street, "ADDR_STREET");
  assert.equal(e.house, "ADDR_HOUSE");
});

test("phone with +998 prefix and repeated digits", () => {
  assert.equal(validateCheckout({ ...ok, phone: "+998 90 315 72 48" }).phone, undefined);
  assert.equal(validateCheckout({ ...ok, phone: "90 111 11 11" }).phone, "PHONE_FAKE");
  assert.equal(validateCheckout({ ...ok, phone: "90 123" }).phone, "PHONE_SHORT");
});
