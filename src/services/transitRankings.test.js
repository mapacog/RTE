import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { rankTransitStops,transitCounty,fetchTransitStops } from "./transitRankings.js";
const counties=JSON.parse(await readFile(new URL("../../public/data/transitCounties.json",import.meta.url)));

test("MAPA MSA_Test geometry assigns transit stops correctly, including Iowa rather than using a longitude cutoff",()=>{
  assert.match(counties.source,/MSA_Test\/FeatureServer\/2$/);
  assert.equal(transitCounty({Stop_Longi:-95.955472,Stop_Latit:41.206434},counties),"Douglas");
  assert.equal(transitCounty({Stop_Longi:-95.938585,Stop_Latit:41.147865},counties),"Sarpy");
  assert.equal(transitCounty({Stop_Longi:-95.8675,Stop_Latit:41.2737},counties),"Pottawattamie");
  assert.equal(transitCounty({Stop_Longi:null,Stop_Latit:41.2},counties),"");
});
test("fixed-route ranks exclude ORBT, rerank within county, distinguish null from zero, and break ties deterministically",()=>{
  const rows=[{objectId:3,service:"Metro",county:"Douglas",activity:200,visits:1},{objectId:1,service:"ORBT",county:"Douglas",activity:300,visits:1},
    {objectId:2,service:"Metro",county:"Sarpy",activity:200,visits:1},{objectId:4,service:"Metro",county:"Douglas",activity:0,visits:1},
    {objectId:5,service:"Metro",county:"Douglas",activity:null,visits:1},{objectId:6,service:"Metro",county:"Douglas",activity:400,visits:0}];
  assert.deepEqual(rankTransitStops(rows,{service:"Metro"}).map(row=>[row.objectId,row.rank]),[[2,1],[3,2],[4,3]]);
  assert.deepEqual(rankTransitStops(rows,{service:"Metro",county:"Douglas"}).map(row=>[row.objectId,row.rank]),[[3,1],[4,2]]);
  assert.deepEqual(rankTransitStops(rows).map(row=>[row.objectId,row.rank]),[[1,1],[2,2],[3,3],[4,4]]);
});
test("all transit pages load before ranks and county filters are calculated",async()=>{
  let page=0;
  const fetchImpl=async url=>({ok:true,json:async()=>String(url).includes("transitCounties")?counties:{features:[{attributes:{OBJECTID:++page,StopName:`Stop ${page}`,Stop_Longi:-95.955472,Stop_Latit:41.206434,ServiceType:"Metro",Act100Vis:page,MonVisits:100,Board_Coun_2022:0,Alight_Cou_2022:12,service_days_2022:26}}],exceededTransferLimit:page===1}});
  const rows=await fetchTransitStops({fetchImpl});assert.equal(rows.length,2);assert.equal(rows[0].county,"Douglas");
  assert.equal(rankTransitStops(rows)[0].objectId,2);
  assert.equal(rows[0].baselineBoardings,0);assert.equal(rows[0].baselineAlightings,12);assert.equal(rows[0].baselineDays,26);
});
