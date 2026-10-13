import { rankLocations } from "../services/trafficRankings.js";

export function interchangeMapInsights(locations, language = "en") {
  const ranked = rankLocations(locations);
  if (!ranked.length) return [];
  const top = ranked.slice(0, 50);
  const leading = ranked.slice(0, 10);
  const interstateLinks = leading.filter(row => /\bI-80\b/i.test(row.name)).length;
  const counties = new Map();
  for (const row of top) {
    const county = row.county || (language === "es" ? "No reportado" : "Not reported");
    counties.set(county, (counties.get(county) || 0) + 1);
  }
  return [
    {
      title: { en: "I-80 connections", es: "Conexiones con I-80" },
      text: {
        en: `${interstateLinks} of the ${leading.length} highest-volume interchanges connect with I-80 in 2025.`,
        es: `${interstateLinks} de los ${leading.length} intercambios de mayor volumen conectan con I-80 en 2025.`,
      },
    },
    {
      title: { en: "County footprint", es: "Distribución por condado" },
      text: { en: `County distribution of the regional top ${top.length}:`, es: `Distribución por condado de los ${top.length} intercambios principales de la región:` },
      items: [...counties].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({
        label, value: language === "es" ? `${count} ${count === 1 ? "intercambio" : "intercambios"}` : `${count} ${count === 1 ? "interchange" : "interchanges"}`,
      })),
    },
  ];
}
