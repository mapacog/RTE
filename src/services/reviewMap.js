export function readableRenderer(renderer, locale = "en-US") {
  if (!renderer?.clone) return renderer;
  const result = renderer.clone();
  const titles = { SUM_VMT_25: "Average daily VMT (thousands; rounded)", VMT_Change_22H_25: "Change from harmonized 2022 baseline",
    REG_Change22H_25: "Regional change from harmonized 2022 baseline", Act100Vis: "Passenger activity per 100 scheduled visits", C_2025: "Station checkouts in 2025" };
  if (titles[result.field]) result.legendOptions = { ...result.legendOptions, title: titles[result.field] };
  if (result.field === "SUM_VMT_25") {
    const format = number => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(number / 1000);
    result.classBreakInfos.forEach(info => { info.label = `${format(info.minValue)} - ${format(info.maxValue)}`; });
  }
  return result;
}

export async function configureReviewMap(map, view, id, isCancelled, locale) {
  const layers = map.allLayers.toArray();
  for (const layer of layers.filter(layer => layer.type === "feature")) {
    if (isCancelled()) return;
    layer.renderer = readableRenderer(layer.renderer, locale);
  }
  view.constraints.snapToZoom = false;
  const transit = ["9cb9e8555b954ac9abee3313f8ec7d8e", "e2547ddd72254f2ab44c3b4302ebe8e2", "fixed-transit", "transit-rankings"].includes(id);
  if (transit) {
    const routes = layers.find(layer => layer.title === "Metro Transit Routes");
    layers.filter(layer => /Metro Transit Routes|Omaha Rapid Bus Transit/.test(layer.title)).forEach(layer => {
      layer.minScale = 0; layer.maxScale = 0; layer.visible = true;
    });
    const stops = layers.find(layer => layer.title === "Metro Stops");
    if (stops) { stops.minScale = 0; stops.maxScale = 0; stops.visible = id === "fixed-transit" || id === "transit-rankings"; }
    if (id === "transit-rankings") {
      layers.forEach(layer => {
        if (/Traffic Flow Line|Passenger Activity per 100/.test(layer.title)) layer.visible = false;
        if (/Metro_Ridership_Productivity/.test(layer.url || "")) {
          layer.definitionExpression = "MatchStat = 'matched'";
          layer.visible = layer === stops;
        }
      });
      if (routes) routes.definitionExpression = null;
    }
    if (id === "fixed-transit") {
      layers.forEach(layer => {
        if (/Traffic Flow Line|Omaha Rapid Bus Transit|Passenger Activity per 100/.test(layer.title)) layer.visible = false;
        if (/Metro_Ridership_Productivity/.test(layer.url || "")) {
          layer.definitionExpression = "MatchStat = 'matched' AND ServiceType = 'Metro'";
          layer.visible = layer === stops;
        }
      });
      if (routes) routes.definitionExpression = "route_short_name <> '00'";
    }
    if (routes) {
      await routes.load();
      if (isCancelled()) return;
      if (id === "fixed-transit") {
        routes.renderer = { type: "simple", symbol: { type: "simple-line", color: "#b04435", width: 1, style: "solid" } };
        routes.opacity = 1;
      }
      const { extent } = await routes.queryExtent();
      if (!isCancelled() && extent) return extent.expand(1.08);
    }
  }
  if (id === "8387d6517be34ef98d55e05a9c1808a7") {
    const stations = layers.find(layer => layer.title === "Bike Share Stations Checkout");
    if (stations) {
      await stations.load();
      const query = stations.createQuery();
      query.where = `${query.where || "1=1"} AND UPPER(data__stations__name) NOT LIKE '%ASHLAND%'`;
      const { extent } = await stations.queryExtent(query);
      if (!isCancelled() && extent) return extent.expand(1.1);
    }
  }
  return null;
}
