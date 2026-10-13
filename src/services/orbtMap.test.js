import test from "node:test";
import assert from "node:assert/strict";
import { configureOrbtMap } from "./orbtMap.js";

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
  await configureOrbtMap(f.map, f.view);
  assert.equal(f.route.visible, true);
  assert.equal(f.route.definitionExpression, "route_short_name = '00'");
  assert.equal(f.stops.definitionExpression, "(MatchStat = 'matched') AND ServiceType = 'ORBT'");
  assert.equal(f.stops.visible, true);
  assert.deepEqual(f.stops.renderer.uniqueValueInfos, [{ value: "ORBT" }]);
  assert.deepEqual(f.others.map(layer => layer.visible), [false, false, false, true]);
  assert.deepEqual(f.route.query, { where: "route_short_name = '00'", outSpatialReference: { wkid: 3857 } });
  assert.deepEqual(f.targets, [{ extent: { scale: 1.15 }, options: { animate: false } }]);
});

test("ORBT initialization leaves cancelled maps alone and reports missing layers", async () => {
  const f = fixture();
  await configureOrbtMap(f.map, f.view, () => true);
  assert.equal(f.targets.length, 0);
  assert.equal(f.route.visible, false);
  await assert.rejects(configureOrbtMap({ allLayers: { toArray: () => [] } }, f.view), /could not be found/);
});
