import test from "node:test";
import assert from "node:assert/strict";
import { configureOrbtMap,orbtRankSymbols } from "./orbtMap.js";

function fixture() {
  const route = { title: "Omaha Rapid Bus Transit System", visible: false, load: async () => {},
    queryExtent: async query => { route.query = query; return { extent: { expand: scale => ({ scale }) } }; } };
  const stops = { title: "Metro Stops", definitionExpression: "MatchStat = 'matched'", load: async () => {},
    renderer: { type: "unique-value", clone: () => ({ uniqueValueInfos: [{ value: "Metro" }, { value: "ORBT" }] }) } };
  const others = ["Metro Transit Routes", "Passenger Activity per 100 Scheduled Visits, April 2025", "Traffic Flow Line 2025", "Human Geography Label"].map(title => ({ title, visible: true }));
  const targets = [];
  const view = { spatialReference: { wkid: 3857 }, constraints: {}, goTo: async (extent, options) => targets.push({ extent, options }) };
  return { route, stops, others, targets, view, map: { allLayers: { toArray: () => [route, stops, ...others] } } };
}

test("ORBT view enables the corridor, filters stops, and disables general transit overlays", async () => {
  const f = fixture();
  await configureOrbtMap(f.map, f.view,()=>false,[{objectId:1931,rank:1},{objectId:1951,rank:2}]);
  assert.equal(f.route.visible, true);
  assert.equal(f.route.definitionExpression, "route_short_name = '00'");
  assert.equal(f.stops.definitionExpression, "(MatchStat = 'matched') AND ServiceType = 'ORBT'");
  assert.equal(f.stops.visible, true);
  assert.equal(f.stops.renderer.defaultSymbol.color,"#004b58");
  assert.equal(f.stops.renderer.defaultSymbol.size,10);
  assert.equal(f.stops.renderer.defaultSymbol.outline.color,"white");
  assert.equal(f.route.renderer.symbol.color,"#e76f00");
  assert.equal(f.stops.renderer.uniqueValueInfos.length,2);
  assert.match(decodeURIComponent(f.stops.renderer.uniqueValueInfos[0].symbol.url),/>1<\/text>/);
  assert.match(decodeURIComponent(f.stops.renderer.uniqueValueInfos[0].symbol.url),/r="5" fill="#004b58" stroke="white" stroke-width="2"/);
  assert.equal(f.stops.legendEnabled,false);
  assert.deepEqual(f.others.map(layer => layer.visible), [false, false, false, true]);
  assert.deepEqual(f.route.query, { where: "route_short_name = '00'", outSpatialReference: { wkid: 3857 } });
  assert.deepEqual(f.targets, [{ extent: { scale: 1.1 }, options: { animate: false } }]);
});

test("ORBT rank badges use directional callouts and stagger nearby stops",()=>{
  const rows=[{objectId:1,rank:1,name:"42nd NE",attributes:{Stop_Longi:-95.96}},{objectId:2,rank:2,name:"33rd NW",attributes:{Stop_Longi:-95.956}},
    {objectId:3,rank:3,name:"24th NE",attributes:{Stop_Longi:-95.952}},{objectId:4,rank:4,name:"42nd SE",attributes:{Stop_Longi:-95.96}}];
  const symbols=orbtRankSymbols(rows);assert.equal(symbols.length,4);
  assert.deepEqual(symbols.slice(0,3).map(info=>info.symbol.height),[46,66,86]);
  for (const info of symbols) {
    const anchor = info.symbol.height / 2 - Math.abs(info.symbol.yoffset);
    assert.equal(anchor,6);
  }
  assert.ok(symbols[0].symbol.yoffset>0);assert.ok(symbols[3].symbol.yoffset<0);
});

test("ORBT initialization leaves cancelled maps alone and reports missing layers", async () => {
  const f = fixture();
  await configureOrbtMap(f.map, f.view, () => true);
  assert.equal(f.targets.length, 0);
  assert.equal(f.route.visible, false);
  await assert.rejects(configureOrbtMap({ allLayers: { toArray: () => [] } }, f.view), /could not be found/);
});
