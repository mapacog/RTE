function languageTag(value) {
  if (!value || value === "auto") return null;
  const aliases = { iw: "he", jw: "jv" };
  try { return Intl.getCanonicalLocales(aliases[value] || value.replaceAll("_", "-"))[0]; }
  catch { return null; }
}

export function readingLanguage(document, fallback = "en") {
  const selected = languageTag(document.querySelector(".goog-te-combo")?.value);
  const url = new URL(document.location?.href || "http://localhost");
  const proxy = languageTag(url.searchParams.get("_x_tr_tl"));
  const cookie = document.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith("googtrans="));
  let translated;
  try { translated = languageTag(decodeURIComponent(cookie?.slice(10) || "").split("/").at(-1)); }
  catch { translated = null; }
  const translatedPage=document.documentElement.classList?.contains("translated-ltr") || document.documentElement.classList?.contains("translated-rtl");
  return selected || proxy || (translatedPage?translated:null) || languageTag(document.documentElement.lang) || fallback;
}

export function cardReading(button, text, fallbackLanguage, document) {
  const language = readingLanguage(document, fallbackLanguage);
  const card = button.closest(".insight-card");
  // Read the rendered text, including Google Translate's replacements, not React's source strings.
  const visibleText = card && [...card.querySelectorAll("h4, p, li")]
    .map(element => element.innerText?.trim()).filter(Boolean).join("\n");
  return { text: visibleText || text, language };
}
