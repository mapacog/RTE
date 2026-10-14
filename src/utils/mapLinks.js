export function fullMapLink(mapId, comparison = "") {
  const params = new URLSearchParams();
  if (comparison) params.set("comparison", comparison);
  return `#map/${encodeURIComponent(mapId)}${params.size ? `?${params}` : ""}`;
}
