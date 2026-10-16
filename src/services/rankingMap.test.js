import test from "node:test";
import assert from "node:assert/strict";
import { rankingMapWhere, rankingLabelExpression, rankingLabelClasses, applyRankingFilter, rankTransitBays, transitBayRankScale } from "./rankingMap.js";

const rows = [{ objectId: 12, rank: 1 }, { objectId: 7, rank: 2 }];
const bay=(objectId,activity,baselineActivity)=>({objectId,activity,baselineActivity,visits:100,baselineVisits:100,baselineMatched:true});
const grouped=[{objectId:12,objectIds:[12,13,14],rank:2,members:[bay(12,100,10),bay(13,300,290),bay(14,200,100)]},
  {objectId:7,objectIds:[7],rank:8,members:[bay(7,50,10)]}];

test("close-up grouped labels rank bays locally while overview and individual ranks stay unchanged",()=>{
  assert.equal(transitBayRankScale,10000);
  const expression=rankingLabelExpression(grouped,{disaggregateGroups:true});
  assert.equal(expression,"Decode($feature.OBJECTID, 13, '2.1', 14, '2.2', 12, '2.3', 7, '8', '')");
  assert.equal(rankingLabelExpression(rows,{disaggregateGroups:true}),rankingLabelExpression(rows));
  assert.equal(rankingLabelExpression([],{disaggregateGroups:true}),"''");
  assert.deepEqual(grouped[0].members.map(member=>member.objectId),[12,13,14]);
});

test("native scale-based classes switch labels in both zoom directions without cached view expressions",()=>{
  const classes=rankingLabelClasses(grouped,{disaggregateGroups:true,minScale:50000,fontSize:10});
  assert.equal(classes.length,2);
  assert.equal(classes[0].minScale,10000);
  assert.equal(classes[0].maxScale,0);
  assert.equal(classes[1].minScale,50000);
  assert.equal(classes[1].maxScale,10000);
  assert.equal(classes[0].symbol.font.size,10);
  assert.equal(classes[0].labelExpressionInfo.expression,rankingLabelExpression(grouped,{disaggregateGroups:true}));
  assert.equal(classes[1].labelExpressionInfo.expression,rankingLabelExpression(grouped));
  assert.equal(rankingLabelClasses(rows,{disaggregateGroups:true}).length,1);
  assert.equal(rankingLabelClasses(grouped).length,1);
  assert.ok(classes.every(label=>!label.labelExpressionInfo.expression.includes("$view")));
});

test("bay change ranks use comparable activity differences rather than 2025 totals",()=>{
  assert.deepEqual(rankTransitBays(grouped[0].members,"change").map(member=>[member.objectId,member.rank,member.change]),[
    [14,1,100],[12,2,90],[13,3,10],
  ]);
  assert.match(rankingLabelExpression(grouped,{disaggregateGroups:true,measure:"change"}),/14, '2.1', 12, '2.2', 13, '2.3', 7, '8'/);
});

test("bay ranks restart per group, resolve ties deterministically, and omit missing or incomparable values",()=>{
  const members=[bay(3,100,100),bay(2,100,100),bay(4,null,1),{...bay(5,80,50),baselineMatched:false},
    {...bay(6,80,50),baselineVisits:0},{...bay(8,100,1),visits:0}];
  assert.deepEqual(rankTransitBays(members,"activity").map(member=>[member.objectId,member.rank]),[[2,1],[3,2],[5,3],[6,4]]);
  assert.deepEqual(rankTransitBays(members,"change").map(member=>[member.objectId,member.rank]),[[2,1],[3,2]]);
  const second={objectId:20,objectIds:[20,21],rank:3,members:[bay(20,5,1),bay(21,10,1)]};
  assert.match(rankingLabelExpression([...grouped,second],{disaggregateGroups:true}),/21, '3.1', 20, '3.2'/);
});

test("transit filter applies scale-aware bay labels without changing its displayed locations",async()=>{
  const layer={queryExtent:async()=>({extent:null})};
  const element={querySelector:()=>null,view:{}};
  await applyRankingFilter(element,[layer],{kind:"transit",rows:grouped,measure:"change"},()=>true);
  assert.equal(layer.definitionExpression,"OBJECTID IN (12,13,14,7)");
  assert.equal(layer.labelingInfo.length,1);
  assert.equal(layer.labelingInfo[0].labelExpressionInfo.expression,rankingLabelExpression(grouped));
});

test("nearby Westroads ORBT and TC ranks remain distinct and only the selected TC disaggregates",()=>{
  const westroads=[{objectId:6000,objectIds:[6000],name:"Westroads ORBT Station",rank:3,members:[bay(6000,269,100)]},
    {objectId:3270,objectIds:[3270,3271],name:"Westroads TC",rank:8,members:[bay(3270,200,100),bay(3271,300,100)]}];
  const labels=selectedGroupId=>rankingLabelExpression(westroads,{disaggregateGroups:true,selectedGroupId});
  assert.equal(labels(null),rankingLabelExpression(westroads));
  assert.equal(labels(6000),rankingLabelExpression(westroads));
  assert.equal(labels(3270),"Decode($feature.OBJECTID, 6000, '3', 3271, '8.1', 3270, '8.2', '')");
  assert.equal(rankingLabelClasses(westroads,{disaggregateGroups:true,selectedGroupId:6000}).length,1);
  assert.equal(rankingLabelClasses(westroads,{disaggregateGroups:true,selectedGroupId:3270}).length,2);
});
test("rankings map uses the same limited IDs and safe jurisdiction filters", () => {
  assert.equal(rankingMapWhere(rows, "county", "Sarpy", "10"), "OBJECTID IN (12,7)");
  assert.equal(rankingMapWhere(rows, "city", "O'Fallon", "all"), "Total_25 >= 0 AND CITY = 'O''Fallon'");
  assert.equal(rankingMapWhere(rows, "regional", "", "all"), "Total_25 >= 0");
  assert.equal(rankingMapWhere(rows, "county", "", "all"), "1=0");
  assert.equal(rankingMapWhere([], "regional", "", "10"), "1=0");
  assert.equal(rankingLabelExpression(rows), "Decode($feature.OBJECTID, 12, '1', 7, '2', '')");
});
test("shared filters replace regional styling and zoom only the current result", async () => {
  const extent = { width: 10, height: 10, expand: scale => ({ scale }) };
  const layer = { queryExtent: async () => ({ extent }) };
  const targets = [], popup = { open: true };
  const element = { querySelector: () => popup, view: { goTo: async target => targets.push(target) } };
  const filter = { rows, scope: "county", jurisdiction: "Sarpy", limit: "10" };
  await applyRankingFilter(element, [layer], filter, () => true);
  assert.equal(layer.definitionExpression, "OBJECTID IN (12,7)");
  assert.equal(layer.renderer.type, "simple");
  assert.equal(layer.labelsVisible, true);
  assert.equal(popup.open, false);
  assert.deepEqual(targets, [{ scale: 1.15 }]);
  await applyRankingFilter(element, [layer], filter, () => false);
  assert.equal(targets.length, 1);
  await assert.rejects(applyRankingFilter(element, [], filter, () => true), /could not be found/);
});
