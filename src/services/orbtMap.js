export function orbtRankSymbols(rows) {
  const levels=new Map();
  for(const south of [false,true]){
    const side=rows.filter(row=>/ (SE|SW)$/.test(row.name)===south).sort((a,b)=>Number(a.attributes?.Stop_Longi)-Number(b.attributes?.Stop_Longi));
    let previous=null,tier=0;
    for(const row of side){
      const longitude=Number(row.attributes?.Stop_Longi);
      tier=previous!==null && Math.abs(longitude-previous)<0.01?(tier+1)%3:0;
      levels.set(row.objectId,{south,tier});previous=longitude;
    }
  }
  return rows.filter(row=>Number.isSafeInteger(row.objectId) && Number.isSafeInteger(row.rank)).map(row=>{
    const {south,tier}=levels.get(row.objectId);const height=46+tier*20,cy=south?height-12:12,anchor=south?6:height-6;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="${height}" viewBox="0 0 24 ${height}"><path d="M12 ${south?6:23}V${south?height-23:height-6}" stroke="#68878e" stroke-width="1.2"/><circle cx="12" cy="${anchor}" r="5" fill="#004b58" stroke="white" stroke-width="2"/><circle cx="12" cy="${cy}" r="10" fill="white" stroke="#004b58" stroke-width="1.5"/><text x="12" y="${cy+4}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#004b58">${row.rank}</text></svg>`;
    return {value:row.objectId,label:`#${row.rank}`,symbol:{type:"picture-marker",url:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,width:24,height,yoffset:(south?-1:1)*(height/2-6)}};
  });
}

export async function configureOrbtMap(map, view, isCancelled = () => false, rankedStops = []) {
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
  route.renderer = { type:"simple",label:"ORBT route",symbol:{type:"simple-line",color:"#e76f00",width:3,cap:"round",join:"round"} };
  stops.visible = true;
  stops.definitionExpression = stops.definitionExpression
    ? `(${stops.definitionExpression}) AND ServiceType = 'ORBT'`
    : "ServiceType = 'ORBT'";
  stops.minScale = stops.maxScale = 0;
  stops.renderer = { type:"unique-value",field:"OBJECTID",uniqueValueInfos:orbtRankSymbols(rankedStops),defaultLabel:"ORBT stop",
    defaultSymbol:{type:"simple-marker",size:10,color:"#004b58",outline:{color:"white",width:2}} };
  stops.legendEnabled=false;stops.labelingInfo=[];stops.labelsVisible=false;

  const result = await route.queryExtent({ where: route.definitionExpression, outSpatialReference: view.spatialReference });
  if (isCancelled()) return null;
  if (!result.extent) throw new Error("The ORBT route extent could not be loaded.");
  view.constraints.snapToZoom = false;
  const extent = result.extent.expand(1.1);
  await view.goTo(extent, { animate: false });
  return extent;
}
