import { writeFile } from "node:fs/promises";
import sources from "../src/data/visualSources.json" with { type: "json" };

async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const data = await response.json();
  if (data.error || data.exceededTransferLimit) throw new Error(JSON.stringify(data.error || "Incomplete source response"));
  return data;
}

// Decode a string literal, never execute the published chart's JavaScript.
async function chartTable(id) {
  const url = sources.charts.find(chart => chart.id === id).url;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const html = await response.text();
  const literal = html.match(/'chartJson':\s*'((?:\\.|[^'\\])*)'/)?.[1];
  if (!literal) throw new Error(`Chart data unavailable: ${id}`);
  const decoded = JSON.parse(`"${literal.replace(/\\x([0-9a-f]{2})/gi, "\\u00$1").replace(/\\'/g, "'").replace(/"/g, '\\"')}"`);
  return { url, table: JSON.parse(decoded).dataTable };
}

const estimates = { sourceYear: 2025, retrieved: new Date().toISOString().slice(0, 10), sources: {}, sites: {} };
const matches = { "Bob Kerrey Bridge Western Approach": "Bob Kerrey Western Approach", "Field Club Trail at Vinton": "Field Club at Vinton",
  "Keystone Trail at Center": "Keystone Trail at Center", "West Papio Trail at I-80": "West Papio at I-80", "Big Papio Trail at 103rd": "Big Papio at Woolworth" };
for (const [mode, id] of [["pedestrian", "16"], ["bicycle", "17"]]) {
  const { url, table } = await chartTable(id);
  estimates.sources[mode] = url;
  const row = table.rows.find(row => row.c[0].v === 2025);
  if (!row) throw new Error(`Missing 2025 estimates: ${mode}`);
  table.cols.slice(1).forEach((column, index) => {
    const site = matches[column.label];
    if (!site || !Number.isFinite(row.c[index + 1]?.v)) throw new Error(`Unmatched site: ${column.label}`);
    (estimates.sites[site] ||= {})[mode] = row.c[index + 1].v;
  });
}
await writeFile(new URL("../src/data/trailCounterEstimates.json", import.meta.url), `${JSON.stringify(estimates, null, 2)}\n`);

const ruralIds = ["279940", "279927", "279941", "279944", "279946", "279948", "279949"];
const districtUrl = "https://services.arcgis.com/CHjpJeHqytL8t8op/arcgis/rest/services/Traffic_Analysis_District/FeatureServer/0";
const params = new URLSearchParams({ f: "json", where: `TAD_UID IN (${ruralIds.map(id => `'${id}'`).join(",")})`,
  outFields: "TAD_UID,TAD_12,SUM_VMT_2022_HARM,SUM_VMT_25", returnGeometry: "false" });
const rural = await json(`${districtUrl}/query?${params}`);
if (rural.features.length !== ruralIds.length) throw new Error("The seven rural TADs were not all returned.");
await writeFile(new URL("../src/data/ruralVmt.json", import.meta.url), `${JSON.stringify({ source: districtUrl, retrieved: estimates.retrieved,
  baselineField: "SUM_VMT_2022_HARM", currentField: "SUM_VMT_25", districts: rural.features.map(feature => feature.attributes) }, null, 2)}\n`);

const countySource = "https://services.arcgis.com/CHjpJeHqytL8t8op/arcgis/rest/services/MSA_Test/FeatureServer/2";
const countyParams = new URLSearchParams({ f: "geojson", where: "1=1",
  outFields: "GEOID,NAME", outSR: "4326", returnGeometry: "true", geometryPrecision: "6" });
const counties = await json(`${countySource}/query?${countyParams}`);
if (!["Douglas", "Sarpy", "Pottawattamie"].every(name => counties.features?.some(feature => feature.properties.NAME === name))) throw new Error("MAPA county boundaries are incomplete.");
await writeFile(new URL("../public/data/transitCounties.json", import.meta.url), `${JSON.stringify({ ...counties, source: countySource, retrieved: estimates.retrieved })}\n`);
console.log("Prepared published trail estimates, seven harmonized rural TADs, and MAPA MSA_Test county boundaries.");
