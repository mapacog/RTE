import test from "node:test";
import assert from "node:assert/strict";
import { readableRenderer,configureReviewMap } from "./reviewMap.js";
import { fullMapLink } from "../utils/mapLinks.js";

test("VMT legends use rounded thousands without changing natural-break thresholds or symbols",()=>{
  const renderer={field:"SUM_VMT_25",legendOptions:{},classBreakInfos:[{minValue:160136.0404,maxValue:449673.2781,label:"raw"}],clone(){return {...this,classBreakInfos:this.classBreakInfos.map(info=>({...info}))};}};
  const result=readableRenderer(renderer);
  assert.equal(result.classBreakInfos[0].label,"160 - 450");assert.equal(result.classBreakInfos[0].maxValue,449673.2781);
  assert.equal(renderer.classBreakInfos[0].label,"raw");assert.match(result.legendOptions.title,/thousands; rounded/);
});
test("full-map links retain the logical view and selected comparison",()=>{
  const link=fullMapLink("orbt");assert.equal(link,"#map/orbt");
  const regional=fullMapLink("db0cf9c83aaa4a3995b98daa8f5bd798","Estimated Percent Change in VMT, 2022-2025");
  assert.equal(new URLSearchParams(regional.split("?")[1]).get("comparison"),"Estimated Percent Change in VMT, 2022-2025");
});
test("fixed transit shows Metro routes at all scales and excludes ORBT; extent follows routes",async()=>{
  const extent={expand:scale=>({scale})};const routes={title:"Metro Transit Routes",minScale:270087,load:async()=>{},queryExtent:async()=>({extent})};
  const stops={title:"Metro Stops",url:"Metro_Ridership_Productivity",type:"feature"};const orbt={title:"Omaha Rapid Bus Transit System"};
  const view={constraints:{}};const result=await configureReviewMap({allLayers:{toArray:()=>[routes,stops,orbt]}},view,"fixed-transit",()=>false);
  assert.equal(routes.minScale,0);assert.equal(routes.visible,true);assert.equal(routes.definitionExpression,"route_short_name <> '00'");
  assert.equal(orbt.visible,false);assert.match(stops.definitionExpression,/ServiceType = 'Metro'/);assert.equal(result.scale,1.08);
  assert.equal(routes.renderer.symbol.color,"#888c86");assert.equal(routes.renderer.symbol.width,0.7);assert.equal(routes.opacity,0.7);
  assert.equal(stops.renderer,undefined);assert.equal(orbt.renderer,undefined);
});
test("individual Metro Stops are hidden in the productivity heat-map view",async()=>{
  const originalRenderer={type:"simple",symbol:{color:"original",width:1}};
  const routes={title:"Metro Transit Routes",renderer:originalRenderer,load:async()=>{},queryExtent:async()=>({extent:{expand:()=>({})}})};
  const stops={title:"Metro Stops",type:"feature",visible:true};
  await configureReviewMap({allLayers:{toArray:()=>[routes,stops]}},{constraints:{}},"9cb9e8555b954ac9abee3313f8ec7d8e",()=>false);
  assert.equal(stops.visible,false);assert.equal(routes.visible,true);assert.equal(routes.minScale,0);
  assert.equal(routes.renderer,originalRenderer);
});

test("combined ranking map includes matched ORBT stops and routes without changing the fixed-route map",async()=>{
  const routes={title:"Metro Transit Routes",definitionExpression:"route_short_name <> '00'",load:async()=>{},queryExtent:async()=>({extent:{expand:()=>({})}})};
  const stops={title:"Metro Stops",url:"Metro_Ridership_Productivity",type:"feature",definitionExpression:"ServiceType = 'Metro'"};
  const orbt={title:"Omaha Rapid Bus Transit System",visible:false};
  await configureReviewMap({allLayers:{toArray:()=>[routes,stops,orbt]}},{constraints:{}},"transit-rankings",()=>false);
  assert.equal(stops.visible,true);assert.equal(stops.definitionExpression,"MatchStat = 'matched'");
  assert.equal(orbt.visible,true);assert.equal(routes.definitionExpression,null);
});
