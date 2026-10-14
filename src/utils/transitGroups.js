import definitions from "../data/transitGroups.json" with {type:"json"};
const groupByCode=new Map(definitions.groups.flatMap(group=>group.stopCodes.map(code=>[code,group])));
const sum=(rows,field)=>rows.every(row=>typeof row[field]==="number" && Number.isFinite(row[field]))?rows.reduce((total,row)=>total+row[field],0):null;
const mean=(rows,field)=>rows.every(row=>typeof row[field]==="number" && Number.isFinite(row[field]))?sum(rows,field)/rows.length:null;
const difference=(current,baseline)=>typeof current==="number" && Number.isFinite(current) && typeof baseline==="number" && Number.isFinite(baseline)?current-baseline:null;

export function aggregateTransitStops(rows) {
  const groups=new Map();
  for(const row of rows){
    const definition=row.service==="Metro"?groupByCode.get(String(row.code)):undefined;
    const name=definition?.name || row.name;
    const key=JSON.stringify([row.service,row.county,name]);
    const group=groups.get(key) || {definition,name,members:[]};
    group.members.push(row);groups.set(key,group);
  }
  return [...groups.values()].map(({definition,name,members})=>{
    members.sort((a,b)=>a.objectId-b.objectId);
    const completeWorkbookGroup=definition && definition.stopCodes.every(code=>members.some(row=>String(row.code)===code));
    const activity=completeWorkbookGroup?definition.averageActivity2025:mean(members,"activity");
    const comparable=members.every(row=>row.baselineMatched && row.baselineVisits>0 && Number.isFinite(row.baselineActivity) && row.visits>0 && Number.isFinite(row.activity));
    const baselineActivity=comparable?mean(members,"baselineActivity"):null;
    const days=members.map(row=>row.days).filter(value=>typeof value==="number");
    const dayRange=days.length===members.length?[Math.min(...days),Math.max(...days)]:null;
    const boardings=sum(members,"boardings"),alightings=sum(members,"alightings"),visits=sum(members,"visits");
    const baselineBoardings=comparable?sum(members,"baselineBoardings"):null,baselineAlightings=comparable?sum(members,"baselineAlightings"):null,baselineVisits=comparable?sum(members,"baselineVisits"):null;
    const dayChanges=comparable?members.map(row=>difference(row.days,row.baselineDays)):[];
    const changeRange=dayChanges.length===members.length && dayChanges.every(value=>value!==null)?[Math.min(...dayChanges),Math.max(...dayChanges)]:null;
    return {...members[0],name,code:members.length===1?members[0].code:null,objectIds:members.map(row=>row.objectId),members,
      activity,baselineActivity,change:activity!==null && baselineActivity!==null?activity-baselineActivity:null,
      boardings,alightings,visits,baselineBoardings,baselineAlightings,baselineVisits,
      boardingsChange:difference(boardings,baselineBoardings),alightingsChange:difference(alightings,baselineAlightings),visitsChange:difference(visits,baselineVisits),
      daysChange:changeRange?changeRange[0]===changeRange[1]?changeRange[0]:changeRange:null,
      days:dayRange?dayRange[0]===dayRange[1]?dayRange[0]:`${dayRange[0]}-${dayRange[1]}`:null,
      averageSource:completeWorkbookGroup?"workbook":"stop-rates"};
  });
}
