import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

export const transitLayerUrl = "https://services.arcgis.com/CHjpJeHqytL8t8op/arcgis/rest/services/Metro_Ridership_Productivity/FeatureServer/11";
export const transitCountyLayerUrl = "https://services.arcgis.com/CHjpJeHqytL8t8op/arcgis/rest/services/MSA_Test/FeatureServer/2";
let cached;
const number = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);

export function transitCounty(attributes, counties) {
  const longitude = number(attributes.Stop_Longi), latitude = number(attributes.Stop_Latit);
  if (longitude === null || latitude === null) return "";
  return counties.features.find(county => booleanPointInPolygon([longitude, latitude], county))?.properties.NAME || "";
}

export function rankTransitStops(rows, { service = "all", county = "", measure = "activity" } = {}) {
  const field=measure==="change"?"change":"activity";
  return rows.filter(row => typeof row[field]==="number" && Number.isFinite(row[field]) && row.visits > 0 && (service === "all" || row.service === service) && (!county || row.county === county))
    .sort((a, b) => b[field] - a[field] || a.objectId - b.objectId).map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function fetchTransitStops({ fetchImpl = fetch } = {}) {
  const countyResponse = await fetchImpl(`${import.meta.env?.BASE_URL || "./"}data/transitCounties.json`, { signal: AbortSignal.timeout(30000) });
  if (!countyResponse.ok) throw new Error("County boundaries could not be loaded.");
  const counties = await countyResponse.json();
  if (!["Douglas", "Sarpy", "Pottawattamie"].every(name => counties.features?.some(feature => feature.properties.NAME === name))) throw new Error("MAPA county boundaries are incomplete.");
  const rows = [], seen = new Set();
  for (let offset = 0; ; ) {
    const params = new URLSearchParams({ f: "json", where: "MatchStat = 'matched'", outFields: "*", returnGeometry: "false",
      orderByFields: "OBJECTID ASC", resultOffset: String(offset), resultRecordCount: "1000" });
    const response = await fetchImpl(`${transitLayerUrl}/query?${params}`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Transit stop data could not be loaded.");
    const result = await response.json();
    if (result.error || !Array.isArray(result.features)) throw new Error(result.error?.message || "Unexpected transit data response.");
    for (const { attributes: a } of result.features) {
      if (!Number.isSafeInteger(a?.OBJECTID) || seen.has(a.OBJECTID)) throw new Error("Transit records are incomplete or repeated.");
      seen.add(a.OBJECTID);
      rows.push({ objectId: a.OBJECTID, name: a.StopName || "", code: a.StopCode, service: a.ServiceType,
        county: transitCounty(a, counties), activity: number(a.Act100Vis), boardings: number(a.Board_Coun), alightings: number(a.Alight_Cou),
        visits: number(a.MonVisits), days: number(a.service_days), attributes: a,
        baselineActivity:number(a.Act100Vis_2022),baselineVisits:number(a.MonVisits_2022),baselineMatched:String(a.MatchStat_2022 || "").toLowerCase()==="matched",
        baselineBoardings:number(a.Board_Coun_2022),baselineAlightings:number(a.Alight_Cou_2022),baselineDays:number(a.service_days_2022) });
    }
    if (!result.exceededTransferLimit) break;
    if (!result.features.length) throw new Error("Transit pagination ended before all records were returned.");
    offset += result.features.length;
  }
  return rows;
}

export function loadTransitStops({ refresh = false } = {}) {
  if (refresh) cached = null;
  if (!cached) {
    const request = fetchTransitStops();
    cached = request;
    request.catch(() => { if (cached === request) cached = null; });
  }
  return cached;
}
