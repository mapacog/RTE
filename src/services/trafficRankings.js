const service = "https://services.arcgis.com/CHjpJeHqytL8t8op/arcgis/rest/services/Traffic_Flow_System__Public_view/FeatureServer";
export const trafficLayers = {
  intersections: { url: `${service}/1`, nameField: "INTERSECTI", label: "Intersections" },
  interchanges: { url: `${service}/0`, nameField: "NAME", label: "Interchanges" },
};
export const trafficYear = 2025;

function volume(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeFeature(attributes, kind) {
  return {
    id: `${kind}-${attributes.OBJECTID}`, objectId: attributes.OBJECTID,
    name: String(attributes[trafficLayers[kind].nameField] ?? "Unnamed location").trim().replace(/\s+/g, " "),
    city: String(attributes.CITY ?? "").trim(), county: String(attributes.COUNTY ?? "").trim(),
    aadt: volume(attributes.Total_25),
    legs: Object.fromEntries(["north", "east", "south", "west"].map(direction => [
      direction, volume(attributes[`${direction[0].toUpperCase()}_LEGSUM_25`]),
    ])),
  };
}

export function rankLocations(rows, scope = "regional", jurisdiction = "") {
  return rows.filter(row => row.aadt !== null && Number.isFinite(row.aadt) &&
    (scope === "regional" || (jurisdiction && row[scope] === jurisdiction)))
    .sort((a, b) => b.aadt - a.aadt || a.objectId - b.objectId)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function loadTrafficLocations(kind, { signal, fetchImpl = fetch } = {}) {
  const config = trafficLayers[kind];
  const rows = [], seen = new Set();
  const fields = ["OBJECTID", config.nameField, "CITY", "COUNTY", "Total_25",
    "N_LEGSUM_25", "E_LEGSUM_25", "S_LEGSUM_25", "W_LEGSUM_25"];
  // Complete pagination before applying jurisdiction filters and local ranks.
  for (let offset = 0; ; ) {
    const params = new URLSearchParams({ f: "json", where: "1=1", outFields: fields.join(","),
      returnGeometry: "false", orderByFields: "OBJECTID ASC", resultOffset: String(offset), resultRecordCount: "1000" });
    const request = new AbortController();
    const abort = () => request.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) request.abort();
    const timeout = setTimeout(abort, 30000);
    let result;
    try {
      const response = await fetchImpl(`${config.url}/query?${params}`, { signal: request.signal });
      if (!response.ok) throw new Error(`Traffic service returned HTTP ${response.status}.`);
      result = await response.json();
      if (result.error) throw new Error(result.error.message || "Traffic service query failed.");
      if (!Array.isArray(result.features)) throw new Error("Traffic service returned an unexpected response.");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
    for (const { attributes } of result.features) {
      if (!attributes || attributes.OBJECTID == null || seen.has(attributes.OBJECTID)) {
        throw new Error("Traffic service returned incomplete or repeated records. Please retry.");
      }
      seen.add(attributes.OBJECTID);
      rows.push(normalizeFeature(attributes, kind));
    }
    if (!result.exceededTransferLimit) break;
    if (!result.features.length) throw new Error("Traffic service stopped before all records were loaded.");
    offset += result.features.length;
  }
  return rows;
}
