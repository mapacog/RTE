export function rankingMapWhere(rows, scope, jurisdiction, limit) {
  if (!rows.length || (scope !== "regional" && !jurisdiction)) return "1=0";
  if (limit !== "all") {
    const ids = rows.map(row => row.objectId).filter(Number.isSafeInteger);
    return ids.length ? `OBJECTID IN (${ids.join(",")})` : "1=0";
  }
  const field = scope === "city" ? "CITY" : scope === "county" ? "COUNTY" : null;
  return `Total_25 >= 0${field ? ` AND ${field} = '${jurisdiction.replaceAll("'", "''")}'` : ""}`;
}

export function rankingLabelExpression(rows) {
  const labels = rows.slice(0, 500).filter(row => Number.isSafeInteger(row.objectId) && Number.isSafeInteger(row.rank));
  return labels.length ? `Decode($feature.OBJECTID, ${labels.flatMap(row => [row.objectId, `'${row.rank}'`]).join(", ")}, '')` : "''";
}

export async function applyRankingFilter(element, layers, filter, isCurrent, signal) {
  if (!layers.length) throw new Error("The ranking layer could not be found in this map.");
  const where = rankingMapWhere(filter.rows, filter.scope, filter.jurisdiction, filter.limit);
  for (const layer of layers) {
    layer.definitionExpression = where;
    layer.visible = true;
    layer.minScale = 0;
    layer.maxScale = 0;
    layer.featureReduction = null;
    layer.renderer = {
      type: "simple",
      symbol: { type: "simple-marker", color: "#007cab", outline: { color: "white", width: 1 }, size: 10 },
      visualVariables: [{ type: "size", field: "Total_25", stops: [{ value: 0, size: 7 }, { value: 100000, size: 22 }] }],
    };
    layer.labelingInfo = [{
      labelExpressionInfo: { expression: rankingLabelExpression(filter.rows) },
      labelPlacement: "above-center", minScale: filter.rows.length > 50 ? 100000 : 0,
      symbol: { type: "text", color: "#004b58", haloColor: "white", haloSize: 1.5, font: { size: 11, weight: "bold" } },
    }];
    layer.labelsVisible = true;
  }
  const popup = element.querySelector('arcgis-popup[slot="popup"]');
  if (popup) popup.open = false;
  if (!filter.rows.length) return;
  const { extent } = await layers[0].queryExtent(undefined, { signal });
  if (!isCurrent() || !extent) return;
  await element.view.goTo(extent.width && extent.height ? extent.expand(1.15) : { target: extent.center, zoom: 14 }, { animate: false });
}
