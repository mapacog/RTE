import test from "node:test";
import assert from "node:assert/strict";
import { cardReading, readingLanguage } from "./translatedReading.js";

function document({ selected, url = "https://example.com", cookie = "", lang = "en" } = {}) {
  return { querySelector: () => selected ? { value: selected } : null,
    location: { href: url }, cookie, documentElement: { lang } };
}

test("Google Translate widget and proxy target take priority over the app language", () => {
  assert.equal(readingLanguage(document({ selected: "fr", lang: "en" })), "fr");
  assert.equal(readingLanguage(document({ url: "https://example-com.translate.goog/?_x_tr_tl=de" })), "de");
  assert.equal(readingLanguage(document({ selected: "en", cookie: "googtrans=/en/fr" })), "en");
});

test("translation cookie, document language and supported aliases are recognized", () => {
  assert.equal(readingLanguage(document({ cookie: "other=1; googtrans=%2Fen%2Fzh-CN" })), "zh-CN");
  assert.equal(readingLanguage(document({ lang: "es" })), "es");
  assert.equal(readingLanguage(document({ selected: "iw" })), "he");
  assert.equal(readingLanguage(document({ selected: "auto", cookie: "googtrans=%bad", lang: "fr" })), "fr");
});

test("card audio reads translated rendered headings, paragraphs and list entries", () => {
  const elements = ["Trajets quotidiens", "Les déplacements ont augmenté.", "Total : 100"];
  const button = { closest: selector => {
    assert.equal(selector, ".insight-card");
    return { querySelectorAll: selector => {
      assert.equal(selector, "h4, p, li");
      return elements.map(innerText => ({ innerText }));
    } };
  } };
  assert.deepEqual(cardReading(button, "Original English source", "en", document({ selected: "fr" })), {
    text: "Trajets quotidiens\nLes déplacements ont augmenté.\nTotal : 100", language: "fr",
  });
});

test("non-card audio keeps its provided text and native language", () => {
  assert.deepEqual(cardReading({ closest: () => null }, "Texto", "es", document({ lang: "es" })), {
    text: "Texto", language: "es",
  });
});
