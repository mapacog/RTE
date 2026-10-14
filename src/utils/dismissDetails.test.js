import test from "node:test";
import assert from "node:assert/strict";
import { dismissDetails } from "./dismissDetails.js";
test("accessibility pane closes outside, stays open inside, and closes on Escape",()=>{
  const listeners=new Map();let focused=false,prevented=false;
  const doc={addEventListener:(key,value)=>listeners.set(key,value),removeEventListener:key=>listeners.delete(key)};
  const pane={open:true,contains:target=>target==="inside",querySelector:()=>({focus:()=>focused=true})};
  const cleanup=dismissDetails(pane,doc);
  listeners.get("pointerdown")({target:"inside"});assert.equal(pane.open,true);
  listeners.get("pointerdown")({target:"outside"});assert.equal(pane.open,false);
  pane.open=true;listeners.get("keydown")({key:"Escape",preventDefault:()=>prevented=true});
  assert.equal(pane.open,false);assert.ok(focused && prevented);
  cleanup();assert.equal(listeners.size,0);
});
