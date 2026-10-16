import { rankTransitStops } from "./transitRankings.js";

export function rankingMapWhere(rows, scope, jurisdiction, limit) {
  if (!rows.length || (scope !== "regional" && !jurisdiction)) return "1=0";
  if (limit !== "all") {
    const ids = rows.map(row => row.objectId).filter(Number.isSafeInteger);
    return ids.length ? `OBJECTID IN (${ids.join(",")})` : "1=0";
  }
  const field = scope === "city" ? "CITY" : scope === "county" ? "COUNTY" : null;
  if (field === "CITY" && jurisdiction === "Unincorporated Pottawattamie County") {
    return "Total_25 >= 0 AND CITY IN ('Unincorporated Pottawattamie C', 'Unincorporated Pottawattamie County')";
  }
  if (field === "CITY" && jurisdiction === "Unincorporated Washington County") {
    return "Total_25 >= 0 AND CITY IN ('Unincorporated Washington Coun', 'Unincorporated Washington County')";
  }
  return `Total_25 >= 0${field ? ` AND ${field} = '${jurisdiction.replaceAll("'", "''")}'` : ""}`;
}

export const rankingProfile = kind => kind === "transit" ? "transit" : kind === "intersections" ? "intersection" : "interchange";
export const rankedObjectIds = row => (row.objectIds || [row.objectId]).filter(Number.isSafeInteger);

export const transitBayRankScale = 10000;

export function rankTransitBays(members, measure = "activity") {
  return rankTransitStops(members.map(member=>{
    const comparable=member.baselineMatched && member.baselineVisits>0 && Number.isFinite(member.baselineActivity) && Number.isFinite(member.activity);
    const difference=(current,baseline)=>comparable && Number.isFinite(current) && Number.isFinite(baseline)?current-baseline:null;
    return {...member,change:comparable?member.activity-member.baselineActivity:null,
      boardingsChange:difference(member.boardings,member.baselineBoardings),alightingsChange:difference(member.alightings,member.baselineAlightings),
      visitsChange:difference(member.visits,member.baselineVisits)};
  }),{measure});
}

const rankDecode=entries=>entries.length?`Decode($feature.OBJECTID, ${entries.flatMap(([id,rank])=>[id,`'${rank}'`]).join(", ")}, '')`:"''";

const expandsGroup=(row,selectedGroupId)=>row.members?.length>1 && (selectedGroupId===undefined || row.objectId===selectedGroupId);

export function rankingLabelExpression(rows, { disaggregateGroups = false, measure = "activity", selectedGroupId } = {}) {
  const labels = rows.slice(0, 500).filter(row => Number.isSafeInteger(row.objectId) && Number.isSafeInteger(row.rank));
  const overall=rankDecode(labels.flatMap(row=>rankedObjectIds(row).map(id=>[id,row.rank])));
  if(!disaggregateGroups || !labels.some(row=>expandsGroup(row,selectedGroupId)))return overall;
  return rankDecode(labels.flatMap(row=>expandsGroup(row,selectedGroupId)?
    rankTransitBays(row.members,measure).filter(member=>Number.isSafeInteger(member.objectId)).map(member=>[member.objectId,`${row.rank}.${member.rank}`]):
    rankedObjectIds(row).map(id=>[id,row.rank])));
}

export function rankingLabelClasses(rows, { disaggregateGroups = false, measure = "activity", minScale = 0, fontSize = 11, selectedGroupId } = {}) {
  const overall={labelExpressionInfo:{expression:rankingLabelExpression(rows)},labelPlacement:"above-center",minScale,
    symbol:{type:"text",color:"#004b58",haloColor:"white",haloSize:1.5,font:{size:fontSize,weight:"bold"}}};
  if(!disaggregateGroups || !rows.slice(0,500).some(row=>expandsGroup(row,selectedGroupId)))return [overall];
  return [
    {...overall,minScale:transitBayRankScale,maxScale:0,
      labelExpressionInfo:{expression:rankingLabelExpression(rows,{disaggregateGroups:true,measure,selectedGroupId})}},
    {...overall,maxScale:transitBayRankScale},
  ];
}

export async function applyRankingFilter(element, layers, filter, isCurrent, signal) {
  if (!layers.length) throw new Error("The ranking layer could not be found in this map.");
  const isTransit = filter.kind === "transit";
  const ids = filter.rows.flatMap(rankedObjectIds);
  const where = isTransit ? ids.length ? `OBJECTID IN (${ids.join(",")})` : "1=0" : rankingMapWhere(filter.rows, filter.scope, filter.jurisdiction, filter.limit);
  for (const layer of layers) {
    layer.definitionExpression = where;
    layer.visible = true;
    layer.minScale = 0;
    layer.maxScale = 0;
    layer.featureReduction = null;
    layer.renderer = {
      type: "simple",
      symbol: { type: "simple-marker", color: "#007cab", outline: { color: "white", width: 1 }, size: 10 },
      visualVariables: [{ type: "size", field: isTransit ? "Act100Vis" : "Total_25", stops: [{ value: 0, size: 7 }, { value: isTransit ? 650 : 100000, size: 22 }] }],
    };
    layer.labelingInfo = rankingLabelClasses(filter.rows,{disaggregateGroups:isTransit,measure:filter.measure,
      minScale:filter.rows.length>50?100000:0,selectedGroupId:null});
    layer.labelsVisible = true;
  }
  const popup = element.querySelector('arcgis-popup[slot="popup"]');
  if (popup) popup.open = false;
  if (!filter.rows.length) return;
  const { extent } = await layers[0].queryExtent(undefined, { signal });
  if (!isCurrent() || !extent) return;
  await element.view.goTo(extent.width && extent.height ? extent.expand(1.15) : { target: extent.center, zoom: 14 }, { animate: false });
}
