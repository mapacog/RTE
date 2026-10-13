import test from "node:test";
import assert from "node:assert/strict";
import { fetchIntersectionSelection, authoredIntersectionGraphic } from "./intersectionSelection.js";

const base = "https://services.arcgis.com/example/arcgis/rest/services/Traffic_Flow_System__Public_view/FeatureServer/";
const intersection = { url: `${base}1`, objectIdField: "OBJECTID" };
const road = { url: `${base}2` };

test("native popup graphics use the exact authored web-map template without altering source graphics", () => {
  const authored = { title: "{INTERSECTI}", content: [{ type: "fields", fieldInfos: [{ fieldName: "INT_TOT_00" }] }] };
  const original = { popupTemplate: { title: "Service default" }, clone: () => ({}) };
  const result = authoredIntersectionGraphic({ graphic: original, layer: { popupTemplate: authored } });
  assert.equal(result.popupTemplate, authored);
  assert.equal(original.popupTemplate.title, "Service default");
  assert.notEqual(result, original);
});

test("side-panel selection uses native popup queries and excludes non-intersection layers", async () => {
  let requested;
  const point = { x: 100, y: 200 };
  const graphics = [
    { layer: road, attributes: { OBJECTID: 1 } },
    { layer: intersection, attributes: { OBJECTID: 2, INTERSECTI: "90th & Dodge" } },
    { origin: { layer: intersection }, attributes: { OBJECTID: 3, INTERSECTI: "72nd & Dodge" } },
    { layer: intersection, attributes: { OBJECTID: 2 } },
  ];
  const element = { fetchPopupFeatures: async (target, options) => {
    requested = { target, options };
    return (async function* () { yield* graphics; })();
  } };
  const result = await fetchIntersectionSelection(element, { screenPoint: point, pointerType: "touch" });
  assert.deepEqual(requested, { target: point, options: { pointerType: "touch" } });
  assert.deepEqual(result.map(item => item.attributes.OBJECTID), [2, 3]);
  assert.equal(result[1].layer, intersection);
  assert.equal(result[0].graphic, graphics[1]);
});

test("empty clicks clear the selection and native query failures are surfaced", async () => {
  const element = { fetchPopupFeatures: async () => (async function* () {})() };
  assert.deepEqual(await fetchIntersectionSelection(element, { x: 1, y: 2 }), []);
  await assert.rejects(fetchIntersectionSelection({ fetchPopupFeatures: async () => { throw new Error("Unavailable"); } }, {}), /Unavailable/);
});
