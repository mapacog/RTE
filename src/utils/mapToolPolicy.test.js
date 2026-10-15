import test from "node:test";
import assert from "node:assert/strict";
import { mapToolPolicy } from "./mapToolPolicy.js";

test("all ranking insets hide layers and legend but retain a north reset", () => {
  for (const rankingKind of ["intersections", "interchanges", "transit"]) {
    const tools=mapToolPolicy({rankingKind});
    assert.equal(tools.layersAndLegend,false,rankingKind);
    assert.equal(tools.compass,true,rankingKind);
    assert.equal(tools.navigation,rankingKind!=="transit",rankingKind);
  }
});

test("full ranking maps and ordinary maps retain their map tools", () => {
  for (const rankingKind of ["intersections", "interchanges", "transit"]) {
    assert.deepEqual(mapToolPolicy({rankingKind,fullPage:true}),{
      compass:true,navigation:true,layersAndLegend:true,
    });
  }
  assert.equal(mapToolPolicy({}).layersAndLegend,true);
  assert.equal(mapToolPolicy({context:"orbt"}).layersAndLegend,false);
  assert.equal(mapToolPolicy({context:"orbt",fullPage:true}).layersAndLegend,true);
});
