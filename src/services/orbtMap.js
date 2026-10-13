export async function configureOrbtMap(map, view, isCancelled = () => false) {
  const layers = map.allLayers.toArray();
  const route = layers.find(layer => layer.title === "Omaha Rapid Bus Transit System");
  const stops = layers.find(layer => layer.title === "Metro Stops");
  if (!route || !stops) throw new Error("The ORBT route or stops layer could not be found.");
  await route.load();
  await stops.load();
  if (isCancelled()) return null;

  for (const layer of layers) {
    if (layer.title === "Metro Transit Routes" || layer.title === "Traffic Flow Line 2025" ||
        layer.title.startsWith("Passenger Activity per 100")) layer.visible = false;
  }
  route.visible = true;
  route.definitionExpression = "route_short_name = '00'";
  route.minScale = route.maxScale = 0;
  stops.visible = true;
  stops.definitionExpression = stops.definitionExpression
    ? `(${stops.definitionExpression}) AND ServiceType = 'ORBT'`
    : "ServiceType = 'ORBT'";
  stops.minScale = stops.maxScale = 0;
  if (stops.renderer?.type === "unique-value") {
    const renderer = stops.renderer.clone();
    renderer.uniqueValueInfos = renderer.uniqueValueInfos.filter(info => info.value === "ORBT");
    stops.renderer = renderer;
  }

  const result = await route.queryExtent({ where: route.definitionExpression, outSpatialReference: view.spatialReference });
  if (isCancelled()) return null;
  if (!result.extent) throw new Error("The ORBT route extent could not be loaded.");
  view.constraints.snapToZoom = false;
  const extent = result.extent.expand(1.15);
  await view.goTo(extent, { animate: false });
  return extent;
}
