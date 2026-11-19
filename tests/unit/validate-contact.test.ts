import { test } from "node:test";
import assert from "node:assert/strict";
import { uzPhoneDigits, formatUzPhoneInput, validateUzMobile, operatorOf, validatePersonName, capitalizeName } from "../../src/lib/validate-contact";

test("phone: цифры и формат ввода", () => {
  assert.equal(uzPhoneDigits("+998 (90) 123-45-67"), "901234567");
  assert.equal(uzPhoneDigits("90 123 45 67 89"), "901234567");
  assert.equal(formatUzPhoneInput("90123"), "90 123");
  assert.equal(formatUzPhoneInput("901234567"), "90 123 45 67");
});

test("phone: операторы и поддельные номера", () => {
  assert.equal(validateUzMobile("934741824"), null);
  assert.equal(operatorOf("934741824"), "Ucell");
  assert.equal(validateUzMobile(""), "PHONE_EMPTY");
  assert.equal(validateUzMobile("90123"), "PHONE_SHORT");
  assert.equal(validateUzMobile("711234567"), "PHONE_OPERATOR"); // городской Ташкент — не мобильный
  assert.equal(validateUzMobile("901111111"), "PHONE_FAKE");
  assert.equal(validateUzMobile("900000001"), "PHONE_FAKE");
  assert.equal(validateUzMobile("901234567"), "PHONE_FAKE"); // 1234567 — ряд подряд
  assert.equal(validateUzMobile("909876543"), "PHONE_FAKE");
});

test("name: настоящие имена проходят, мусор — нет", () => {
  for (const n of ["Aziz", "Gulnora", "Oʻktam", "Мария", "Ali-Bek"]) assert.equal(validatePersonName(n), null, n);
  assert.equal(validatePersonName(""), "NAME_EMPTY");
  assert.equal(validatePersonName("A"), "NAME_SHORT");
  assert.equal(validatePersonName("Aziz1"), "NAME_CHARS");
  assert.equal(validatePersonName("test"), "NAME_FAKE");
  assert.equal(validatePersonName("asdf"), "NAME_FAKE");
  assert.equal(validatePersonName("Bbbb"), "NAME_FAKE");
  assert.equal(validatePersonName("Qwrt"), "NAME_FAKE");
});

test("name: нормализация регистра", () => {
  assert.equal(capitalizeName("  aZIZ   ali-bek "), "Aziz Ali-Bek");
});
