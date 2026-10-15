import test from "node:test";
import assert from "node:assert/strict";
import { showRankingSelection, rankingSymbolSize } from "./rankingSelection.js";

class Graphic { constructor(properties){Object.assign(this,properties);} }
class Point {
  constructor(x,y){Object.assign(this,{type:"point",x,y,spatialReference:{wkid:3857}});}
  clone(){return new Point(this.x,this.y);}
}
const point=(x,y)=>new Point(x,y);
function setup(points){
  const added=[],moves=[],queries=[];
  const element={view:{spatialReference:{wkid:3857},graphics:{
    addMany(items){added.push(...items);},removeMany(items){for(const item of items)added.splice(added.indexOf(item),1);},
  },async goTo(...args){assert.ok(args[0].target instanceof Point);moves.push(args);}}};
  const layer={objectIdField:"OBJECTID",createQuery:()=>({where:"1=1"}),async queryFeatures(query){
    queries.push(query);return {features:points.map(geometry=>({geometry}))};
  }};
  return {element,layer,added,moves,queries};
}

test("table selection queries geometry, adds a hollow red circle, and pans and zooms",async()=>{
  const state=setup([point(10,20)]);
  const selection=showRankingSelection(state.element,[state.layer],7,{Graphic});
  await selection.ready;
  assert.deepEqual(state.queries[0].objectIds,[7]);
  assert.equal(state.queries[0].returnGeometry,true);
  assert.deepEqual(state.queries[0].outSpatialReference,{wkid:3857});
  assert.equal(state.added[0].symbol.style,"circle");
  assert.deepEqual(state.added[0].symbol.color,[0,0,0,0]);
  assert.equal(state.added[0].symbol.outline.color,"#d32f2f");
  assert.equal(state.added[0].symbol.size,10);
  assert.deepEqual(state.moves[0][0],{target:point(10,20),zoom:16});
  selection.remove();
  assert.equal(state.added.length,0);
});

test("grouped stops are outlined together; overview defaults neither outline nor zoom",async()=>{
  const state=setup([point(10,20),point(30,40)]);
  await showRankingSelection(state.element,[state.layer],[7,8,7],{Graphic}).ready;
  assert.deepEqual(state.queries[0].objectIds,[7,8]);
  assert.equal(state.added.length,2);
  assert.deepEqual(state.moves[0][0].target,point(20,30));
  assert.equal(state.added[0].geometry.x,10);
  const initial=setup([point(10,20)]);
  await showRankingSelection(initial.element,[initial.layer],7,{Graphic,pan:false}).ready;
  assert.equal(initial.added.length,0);
  assert.equal(initial.queries.length,0);
  assert.equal(initial.moves.length,0);
});

test("late results and aborted selections cannot restore a stale outline or move the map",async()=>{
  const state=setup([]);
  let resolve;
  state.layer.queryFeatures=()=>new Promise(done=>{resolve=done;});
  const selection=showRankingSelection(state.element,[state.layer],7,{Graphic});
  selection.remove();
  resolve({features:[{geometry:point(10,20)}]});
  await selection.ready;
  assert.equal(state.added.length,0);
  assert.equal(state.moves.length,0);
  const controller=new AbortController();controller.abort();
  const aborted=setup([point(10,20)]);
  await showRankingSelection(aborted.element,[aborted.layer],7,{Graphic,signal:controller.signal}).ready;
  assert.equal(aborted.moves.length,0);
});

test("missing or non-point geometry does not fabricate a map location",async()=>{
  const state=setup([null,{type:"point",x:NaN,y:10}]);
  await showRankingSelection(state.element,[state.layer],7,{Graphic}).ready;
  assert.equal(state.added.length,0);
  assert.equal(state.moves.length,0);
});

test("selection outlines use the renderer's actual marker size, including zero and endpoint values",()=>{
  for(const [field,max] of [["Total_25",100000],["Act100Vis",650]]){
    const renderer={symbol:{size:10},visualVariables:[{type:"size",field,stops:[{value:0,size:7},{value:max,size:22}]}]};
    for(const [value,size] of [[0,7],[max/2,14.5],[max,22],[max*2,22],[-1,7]]){
      assert.equal(rankingSymbolSize(renderer,{[field]:value}),size);
    }
    assert.equal(rankingSymbolSize(renderer,{[field]:null}),10);
  }
});

test("geometry queries include the size attribute so an outline matches the selected symbol",async()=>{
  const state=setup([]);
  state.layer.renderer={symbol:{size:10},visualVariables:[{type:"size",field:"Act100Vis",stops:[{value:0,size:7},{value:650,size:22}]}]};
  state.layer.queryFeatures=async query=>{
    state.queries.push(query);
    return {features:[{geometry:point(10,20),attributes:{Act100Vis:325}}]};
  };
  await showRankingSelection(state.element,[state.layer],7,{Graphic}).ready;
  assert.deepEqual(state.queries[0].outFields,["OBJECTID","Act100Vis"]);
  assert.equal(state.added[0].symbol.size,14.5);
});
