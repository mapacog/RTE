import test from "node:test";
import assert from "node:assert/strict";
import definitions from "../data/transitGroups.json" with {type:"json"};
import { aggregateTransitStops } from "./transitGroups.js";
import { rankTransitStops } from "../services/transitRankings.js";
import { rankedObjectIds,rankingLabelExpression } from "../services/rankingMap.js";

test("workbook grouping reuses the calculated average and retains every member for map selection",()=>{
  const definition=definitions.groups.find(group=>group.name==="North Omaha TC");
  const rows=definition.stopCodes.map((code,index)=>({objectId:index+1,code,name:`North Omaha TC Bay ${index+1}`,county:"Douglas",service:"Metro",
    activity:1000,visits:100,boardings:50,alightings:40,days:index?30:26,baselineMatched:true,baselineVisits:100,baselineActivity:300}));
  const [group]=aggregateTransitStops(rows);
  assert.equal(group.activity,definition.averageActivity2025);assert.ok(Math.abs(group.activity-405.91991839214575)<1e-8);
  assert.equal(group.name,"North Omaha TC");assert.equal(group.days,"26-30");assert.equal(group.boardings,600);assert.equal(group.visits,1200);
  assert.equal(group.change,group.activity-300);assert.equal(group.averageSource,"workbook");assert.equal(rankedObjectIds(group).length,12);
  assert.match(rankingLabelExpression([{...group,rank:2}]),/1, '2', 2, '2'/);
  assert.equal(rankTransitStops([group],{service:"Metro",measure:"change"})[0].rank,1);
});
test("missing baselines cannot masquerade as changes from zero, while real zero activity is valid",()=>{
  const rows=[{objectId:1,code:"unmapped",name:"Single stop",county:"Douglas",service:"Metro",activity:20,visits:10,days:30,baselineMatched:true,baselineVisits:10,baselineActivity:0}];
  assert.equal(aggregateTransitStops(rows)[0].change,20);
  rows[0].baselineActivity=null;assert.equal(aggregateTransitStops(rows)[0].change,null);
  assert.equal(rankTransitStops(aggregateTransitStops(rows),{measure:"change"}).length,0);
});
test("duplicate-name grouping never crosses counties or services",()=>{
  const base={name:"Same stop",activity:10,visits:1,days:30,baselineMatched:false};
  const rows=[{...base,objectId:1,county:"Douglas",service:"Metro"},{...base,objectId:2,county:"Sarpy",service:"Metro"},{...base,objectId:3,county:"Douglas",service:"ORBT"}];
  assert.equal(aggregateTransitStops(rows).length,3);
});

test("combined rankings retain comparable ORBT stops without applying Metro workbook groups",()=>{
  const base={county:"Douglas",service:"ORBT",visits:100,baselineVisits:100,baselineMatched:true,days:30};
  const code=definitions.groups[0].stopCodes[0];
  const rows=[{...base,objectId:1,code,name:"ORBT station",activity:80,baselineActivity:30},
    {...base,objectId:2,code:"other",name:"New ORBT station",activity:90,baselineActivity:null},
    {...base,objectId:3,code:"metro",name:"Metro stop",service:"Metro",activity:20,baselineActivity:10}];
  const grouped=aggregateTransitStops(rows);
  assert.equal(grouped[0].name,"ORBT station");assert.equal(grouped[0].activity,80);
  assert.deepEqual(rankTransitStops(grouped).map(row=>row.objectId),[2,1,3]);
  assert.deepEqual(rankTransitStops(grouped,{measure:"change"}).map(row=>[row.objectId,row.change]),[[1,50],[3,10]]);
  rows[0].visits=0;
  assert.equal(aggregateTransitStops(rows)[0].change,null);
});

test("grouped numeric changes use matched 2022 totals and member service-day differences",()=>{
  const base={name:"Grouped location",county:"Douglas",service:"Metro",baselineMatched:true};
  const rows=[{...base,objectId:1,code:"a",activity:100,baselineActivity:90,boardings:100,baselineBoardings:80,alightings:10,baselineAlightings:20,visits:120,baselineVisits:100,days:30,baselineDays:26},
    {...base,objectId:2,code:"b",activity:200,baselineActivity:120,boardings:50,baselineBoardings:70,alightings:30,baselineAlightings:30,visits:180,baselineVisits:200,days:26,baselineDays:30}];
  const [group]=aggregateTransitStops(rows);
  assert.equal(group.boardingsChange,0);assert.equal(group.alightingsChange,-10);assert.equal(group.visitsChange,0);
  assert.deepEqual(group.daysChange,[-4,4]);assert.equal(group.change,45);
  rows[1].baselineBoardings=null;rows[1].baselineDays=null;
  const [incomplete]=aggregateTransitStops(rows);
  assert.equal(incomplete.boardingsChange,null);assert.equal(incomplete.daysChange,null);assert.equal(incomplete.alightingsChange,-10);
});
