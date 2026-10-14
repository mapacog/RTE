import { translateText, languageLocale } from "./localization.js";
import { correctedIntersectionCity } from "./locationCorrections.js";
const number = value => value == null || String(value).trim() === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const roadClasses = [null, ["Interstate", "Interestatal"], ["Other freeway / expressway", "Otra autopista / vía rápida"],
  ["Other principal arterial", "Otra arterial principal"], ["Minor arterial", "Arterial secundaria"],
  ["Major collector", "Colectora principal"], ["Minor collector", "Colectora secundaria"], ["Local road", "Vía local"]];

export function intersectionDetails(attributes = {}, language = "en") {
  const a = attributes, es = language === "es";
  const text = (en, translated) => es ? translated : translateText(en,language);
  const format = value => number(value) === null ? text("Not reported", "No reportado") :
    new Intl.NumberFormat(languageLocale(language), { maximumFractionDigits: 0 }).format(number(value));
  const current = number(a.Total_25), rank = number(a.Rank_25);
  // Match the authored Arcade popup: legacy totals are stored in hundreds.
  const legacy = year => number(a[`Leg_Tot_${year}`]) === null ? null : number(a[`Leg_Tot_${year}`]) * 100;
  const compare = (baseline, year) => {
    const percent = current === null || baseline === null || baseline === 0 ? null : (current - baseline) / baseline * 100;
    const tone = percent === null || Math.abs(percent) <= 0.05 ? "neutral" : percent > 0 ? "increase" : "decrease";
    const amount = percent === null ? "" : new Intl.NumberFormat(languageLocale(language), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(percent));
    const label = percent === null ? text(`${year} comparison unavailable`, `Comparación con ${year} no disponible`) :
      tone === "neutral" ? text(`No change from ${year}`, `Sin cambio desde ${year}`) :
        text(`${amount}% from ${year}`, `${amount}% desde ${year}`);
    const summary = percent === null ? text(`A comparison with ${year} is unavailable.`, `No hay una comparación disponible con ${year}.`) :
      tone === "neutral" ? text(`Traffic is essentially unchanged from ${year}.`, `El tráfico prácticamente no cambió desde ${year}.`) :
        tone === "increase" ? text(`Traffic increased ${amount}% from ${year}.`, `El tráfico aumentó ${amount}% desde ${year}.`) :
          text(`Traffic decreased ${amount}% from ${year}.`, `El tráfico disminuyó ${amount}% desde ${year}.`);
    return { year, percent, tone, label, summary };
  };
  const comparisons = [compare(number(a.Total_24), 2024), compare(legacy("22"), 2022)];
  const history = [2020, 2021, 2022, 2023, 2024, 2025].map(year => ({ year,
    value: year < 2023 ? legacy(String(year).slice(2)) : number(a[`Total_${String(year).slice(2)}`]) }));
  const cls = roadClasses[number(a.HPMS_F_SYSTEM)];
  const speed = a.maxspeed == null || String(a.maxspeed).trim() === "" ? format(null) : `${a.maxspeed}${/mph/i.test(String(a.maxspeed)) ? "" : " mph"}`;
  return {
    title: a.INTERSECTI || text("Intersection", "Intersección"), value: format(current), rank,
    rankText: rank === null ? text("not ranked", "sin puesto") : text(`rank #${format(rank)}`, `puesto #${format(rank)}`),
    comparisons, history, format,
    summary: [...comparisons.map(item => item.summary), rank === null ? "" :
      text(`This intersection ranks #${format(rank)} by 2025 AADT.`, `Esta intersección ocupa el puesto #${format(rank)} por AADT de 2025.`)].filter(Boolean).join(" "),
    legs: [["N", "North leg", "Tramo norte"], ["E", "East leg", "Tramo este"], ["S", "South leg", "Tramo sur"], ["W", "West leg", "Tramo oeste"]]
      .map(([key, en, translated]) => ({ label: text(en, translated), value: format(a[`${key}_LEGSUM_25`]) })),
    roads: [{ label: text("Functional class", "Clase funcional"), value: translateText(cls?.[es ? 1 : 0] || format(null),language) },
      { label: text("Area", "Área"), value: es && a.URBAN_RURAL === "Urban" ? "Urbana" : translateText(a.URBAN_RURAL || format(null),language) },
      { label: text("Posted speed", "Velocidad señalada"), value: speed }],
    location: [correctedIntersectionCity(a), a.COUNTY].filter(value => value != null && String(value).trim() !== "").join(" · "),
  };
}
