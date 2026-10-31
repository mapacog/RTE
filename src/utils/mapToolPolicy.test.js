import test from "node:test";
import assert from "node:assert/strict";
import { mapToolPolicy } from "./mapToolPolicy.js";

test("all ranking insets hide layers and legend but retain a north reset", () => {
  for (const rankingKind of ["intersections", "interchanges", "transit"]) {
    const tools=mapToolPolicy({rankingKind});
    assert.deepEqual(tools.layerControls,[],rankingKind);
    assert.equal(tools.compass,true,rankingKind);
    assert.equal(tools.navigation,rankingKind!=="transit",rankingKind);
  }
});

test("full ranking maps and ordinary maps retain their map tools", () => {
  for (const rankingKind of ["intersections", "interchanges", "transit"]) {
    assert.deepEqual(mapToolPolicy({rankingKind,fullPage:true}),{
      compass:true,navigation:true,layerControls:[{name:"layer-list",position:"top-right"},{name:"legend",position:"top-right"}],
    });
  }
  const standard=[{name:"layer-list",position:"top-right"},{name:"legend",position:"top-right"}];
  assert.deepEqual(mapToolPolicy({}).layerControls,standard);
  assert.deepEqual(mapToolPolicy({context:"orbt"}).layerControls,[]);
  assert.deepEqual(mapToolPolicy({context:"orbt",fullPage:true}).layerControls,standard);
});

test("the home MAPA map hides Layers and places only Legend at bottom-right",()=>{
  assert.deepEqual(mapToolPolicy({context:"about-mapa"}),{
    compass:true,navigation:true,layerControls:[{name:"legend",position:"bottom-right"}],
  });
  assert.deepEqual(mapToolPolicy({context:"about-mapa",rankingKind:"transit"}).layerControls,[]);
});
