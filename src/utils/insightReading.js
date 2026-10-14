import { translateText } from "./localization.js";
export function localizedInsightText(value, language) {
  return typeof value === "object" ? value?.[language] || translateText(value?.en || "",language) : translateText(String(value ?? ""),language);
}

export function insightReadingText(card, language) {
  const parts = [card.title, card.text, card.context].map(value => localizedInsightText(value, language));
  for (const item of card.items || []) {
    parts.push(`${localizedInsightText(item.label, language)}: ${localizedInsightText(item.value, language)}`);
  }
  return parts.filter(Boolean).map(value => {
    const text = value.trim();
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }).join(" ");
}
