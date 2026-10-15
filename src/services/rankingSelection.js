export function rankingSymbolSize(renderer, attributes = {}) {
  const variable=renderer?.visualVariables?.find(item=>item.type==="size" && item.field);
  const value=attributes[variable?.field];
  const fallback=Number(renderer?.symbol?.size) || 10;
  if(value==null || !Number.isFinite(Number(value)))return fallback;
  const stops=[...(variable?.stops || [])].filter(stop=>Number.isFinite(stop.value) && Number.isFinite(stop.size))
    .sort((a,b)=>a.value-b.value);
  if(!stops.length)return fallback;
  if(value<=stops[0].value)return stops[0].size;
  for(let i=1;i<stops.length;i++){
    if(value<=stops[i].value){
      const lower=stops[i-1],upper=stops[i];
      return lower.size+(upper.size-lower.size)*(value-lower.value)/(upper.value-lower.value);
    }
  }
  return stops.at(-1).size;
}

export function showRankingSelection(element, layers, selectedIds, { Graphic, signal, pan = true, animate = true }) {
  const view=element.view;
  const ids=[...new Set((Array.isArray(selectedIds)?selectedIds:[selectedIds]).filter(Number.isSafeInteger))];
  let disposed=false,graphics=[];
  const remove=()=>{disposed=true;view.graphics.removeMany(graphics);graphics=[];};
  const ready=(async()=>{
    if(!pan || !ids.length || !layers.length)return;
    const layer=layers[0],query=layer.createQuery();
    query.objectIds=ids;
    query.returnGeometry=true;
    query.outSpatialReference=view.spatialReference;
    query.outFields=[...new Set([layer.objectIdField || "OBJECTID",...(layer.renderer?.visualVariables || [])
      .filter(variable=>variable.type==="size").map(variable=>variable.field).filter(Boolean)])];
    const result=await layer.queryFeatures(query,{signal});
    if(disposed || signal?.aborted)return;
    const features=result.features.filter(({geometry:point})=>
      point?.type==="point" && Number.isFinite(point.x) && Number.isFinite(point.y));
    const points=features.map(feature=>feature.geometry);
    if(!points.length)return;
    graphics=features.map(({geometry,attributes})=>new Graphic({geometry,symbol:{
      type:"simple-marker",style:"circle",size:rankingSymbolSize(layer.renderer,attributes),color:[0,0,0,0],
      outline:{color:"#d32f2f",width:2},
    },popupTemplate:null}));
    view.graphics.addMany(graphics);
    const xs=points.map(point=>point.x),ys=points.map(point=>point.y);
    // goTo requires an SDK geometry instance, not a plain geometry-shaped object.
    const target=points[0].clone();
    target.x=(Math.min(...xs)+Math.max(...xs))/2;
    target.y=(Math.min(...ys)+Math.max(...ys))/2;
    await view.goTo({target,zoom:16},{animate});
  })();
  return {ready,remove};
}
