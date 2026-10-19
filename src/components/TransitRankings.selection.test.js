import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";

const stops=[...Array.from({length:4},(_,index)=>({objectId:1001+index,code:String(3270+index),name:`Westroads TC Bay ${index+1}`,
  service:"Metro",county:"Douglas",activity:100+index,visits:100,boardings:10,alightings:90,days:30,
  baselineMatched:true,baselineActivity:50,baselineVisits:80,baselineBoardings:5,baselineAlightings:35})),
  {objectId:2000,code:"6000",name:"Westroads ORBT Station",service:"ORBT",county:"Douglas",activity:269,visits:100,boardings:20,alightings:249,days:30,
    baselineMatched:true,baselineActivity:100,baselineVisits:80,baselineBoardings:10,baselineAlightings:70}];
const server=await createServer({configFile:false,esbuild:{jsx:"automatic"},optimizeDeps:{noDiscovery:true,include:[]},
  server:{middlewareMode:true,hmr:false,ws:false},appType:"custom",plugins:[{
    name:"transit-selection-fixtures",enforce:"pre",
    resolveId(source,importer){
      if(!/[\\/]TransitRankings\.jsx$/.test(importer || ""))return;
      if(source==="./MapExplorer")return "\0selection-map";
      if(source==="../services/transitRankings")return "\0selection-stops";
    },
    load(id){
      if(id==="\0selection-map")return 'import {createElement} from "react"; export default function Map(props){return createElement("map-probe",props);}';
      if(id==="\0selection-stops")return `export {rankTransitStops} from "/src/services/transitRankings.js"; export async function loadTransitStops(){return ${JSON.stringify(stops)};}`;
    },
  }]});
const {default:TransitRankings}=await server.ssrLoadModule("/src/components/TransitRankings.jsx");
after(()=>server.close());

test("map bay selection opens exact member details without merging ORBT or refitting the filtered map",async()=>{
  let renderer;
  await act(async()=>{renderer=TestRenderer.create(createElement(TransitRankings));});
  const map=()=>renderer.root.findByType("map-probe").props;
  const filter=map().rankingFilter;
  assert.equal(map().selectedLabelGroupId,null);
  const tc=renderer.root.findAllByType("button").find(button=>button.props.className==="transit-stop-button" && button.children.includes("Westroads TC"));
  act(()=>tc.props.onClick());
  assert.equal(map().selectedLabelGroupId,1001);
  assert.deepEqual(map().selectedObjectId,[1001,1002,1003,1004]);
  assert.equal(map().selectionVersion,1);
  assert.equal(map().rankingFilter,filter);
  act(()=>map().onLocationSelect(1002));
  assert.equal(map().selectedLabelGroupId,1001);
  assert.deepEqual(map().selectedObjectId,[1002]);
  assert.equal(map().selectionVersion,0);
  assert.equal(renderer.root.findByType("details").props.open,true);
  assert.equal(renderer.root.findByType("h5").children.join(""),"Westroads TC Bay 2");
  assert.equal(map().rankingFilter,filter);
  act(()=>map().onLocationSelect(2000));
  assert.equal(map().selectedLabelGroupId,null);
  assert.deepEqual(map().selectedObjectId,[2000]);
  assert.equal(renderer.root.findAllByType("details").length,0);
  act(()=>map().onLocationSelect(1003));
  assert.equal(renderer.root.findByType("h5").children.join(""),"Westroads TC Bay 3");
  const show=renderer.root.findAllByType("select").find(select=>select.props.value==="10");
  act(()=>show.props.onChange({target:{value:"50"}}));
  assert.equal(map().selectedLabelGroupId,null);
  assert.equal(map().selectionVersion,0);
  assert.equal(renderer.root.findAllByProps({"aria-label":"Selected member stop"}).length,0);
  act(()=>renderer.unmount());
});
