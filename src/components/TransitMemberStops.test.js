import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";

const server=await createServer({configFile:false,esbuild:{jsx:"automatic"},optimizeDeps:{noDiscovery:true,include:[]},
  server:{middlewareMode:true,hmr:false,ws:false},appType:"custom"});
const {default:TransitMemberStops}=await server.ssrLoadModule("/src/components/TransitMemberStops.jsx");
after(()=>server.close());
const members=[
  {objectId:1,code:"3250",name:"North Omaha TC Bay 1",service:"Metro",activity:100,baselineActivity:50,visits:100,baselineVisits:80,
    baselineMatched:true,boardings:10,baselineBoardings:5,alightings:90,baselineAlightings:35,days:30},
  {objectId:2,code:"3252",name:"North Omaha TC Bay 2",service:"Metro",activity:200,baselineActivity:190,visits:200,baselineVisits:180,
    baselineMatched:true,boardings:50,baselineBoardings:40,alightings:350,baselineAlightings:302,days:30},
];
const group={objectId:1,objectIds:[1,2],name:"North Omaha TC",rank:4,members};
const number=value=>value==null?"Not reported":String(value);
const signed=value=>value==null?"Not reported":value>0?`+${value}`:String(value);
const base={group,measure:"activity",selection:null,onSelect:()=>{},number,signed,
  columns:[["boardings","Boardings"],["alightings","Alightings"],["visits","Scheduled visits"],["days","Service days"]]};
const render=props=>createElement(TransitMemberStops,{...base,...props});

test("a map-selected bay opens the member accordion and shows that bay's own values",()=>{
  let renderer;
  act(()=>{renderer=TestRenderer.create(render({}));});
  assert.equal(renderer.root.findByType("details").props.open,false);
  act(()=>renderer.update(render({selection:{objectId:2}})));
  assert.equal(renderer.root.findByType("details").props.open,true);
  const panel=renderer.root.findByProps({"aria-label":"Selected member stop"});
  assert.equal(panel.findByType("h5").children.join(""),"North Omaha TC Bay 2");
  assert.deepEqual(panel.findAllByType("dd").map(node=>node.children.join("")),["50","350","200","30"]);
  assert.match(JSON.stringify(renderer.toJSON()),/Rank within location/);
  act(()=>renderer.unmount());
});

test("member buttons select actual object IDs and a repeated map selection reopens the panel",()=>{
  let renderer,selected;
  const props={selection:{objectId:1},onSelect:id=>{selected=id;}};
  act(()=>{renderer=TestRenderer.create(render(props));});
  const buttons=renderer.root.findAllByType("button");
  act(()=>buttons[0].props.onClick());
  assert.equal(selected,2);
  act(()=>renderer.root.findByType("details").props.onToggle({currentTarget:{open:false}}));
  assert.equal(renderer.root.findByType("details").props.open,false);
  act(()=>renderer.update(render({...props,selection:{objectId:1}})));
  assert.equal(renderer.root.findByType("details").props.open,true);
  act(()=>renderer.update(render({selection:null})));
  assert.equal(renderer.root.findByType("details").props.open,false);
  assert.equal(renderer.root.findAllByProps({"aria-label":"Selected member stop"}).length,0);
  act(()=>renderer.unmount());
});

test("selected bay change details show its differences and both years, not group totals",()=>{
  let renderer;
  act(()=>{renderer=TestRenderer.create(render({measure:"change",selection:{objectId:1},
    columns:[["boardingsChange","Boarding change"],["alightingsChange","Alighting change"],["visitsChange","Scheduled-visit change"]]}));});
  const panel=renderer.root.findByProps({"aria-label":"Selected member stop"});
  assert.equal(panel.findByType("strong").children.join(""),"+50");
  assert.deepEqual(panel.findAllByType("dd").map(node=>node.children.join("")),["+5","+55","+20","50","80","100","100"]);
  act(()=>renderer.unmount());
});
