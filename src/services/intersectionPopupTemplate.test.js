import test from "node:test";
import assert from "node:assert/strict";
import { applyIntersectionPopupTemplate, intersectionPopupSource } from "./intersectionPopupTemplate.js";

const base = "https://services.arcgis.com/example/arcgis/rest/services/Traffic_Flow_System__Public_view/FeatureServer/";
const original = { title: "Old fields" };
const target = () => {
  const intersection = { url: `${base}1`, popupTemplate: original };
  const interchange = { url: `${base}0`, popupTemplate: original };
  return { intersection, interchange, map: { allLayers: { toArray: () => [intersection, interchange] } } };
};

test("missing Arcade configuration is surfaced rather than silently using a fields popup", async () => {
  class MissingMap {
    allLayers = { toArray: () => [{ url: `${base}1`, load: async () => {}, popupTemplate: { content: [{ type: "fields" }] } }] };
    async load() {}
    destroy() {}
  }
  await assert.rejects(applyIntersectionPopupTemplate(target().map, () => false, async () => MissingMap), /Arcade intersection popup is unavailable/);
});

test("the supplied Arcade popup and chart are reused only for intersections and cached across maps", async () => {
  let loads = 0, destroyed = 0;
  const content = [{ type: "expression", expressionInfo: { expression: "return { type: 'text', text: 'Authored formatting' };" } }, { type: "media", mediaInfos: [{ type: "columnchart" }] }, { type: "expression" }];
  const expressionInfos = [{ name: "expr6", expression: "Round($feature.Total_25, 0)" }];
  const template = () => ({ title: "{INTERSECTI}", content, expressionInfos, clone: template });
  class SourceMap {
    constructor(options) { assert.equal(options.portalItem.id, intersectionPopupSource); }
    allLayers = { toArray: () => [{ url: `${base}1`, load: async () => {}, popupTemplate: template() }] };
    async load() { loads++; }
    destroy() { destroyed++; }
  }
  const first = target(), second = target();
  const importer = async () => SourceMap;
  await applyIntersectionPopupTemplate(first.map, () => false, importer);
  await applyIntersectionPopupTemplate(second.map, () => false, importer);
  assert.equal(loads, 1);
  assert.equal(destroyed, 1);
  assert.equal(first.intersection.popupTemplate.content, content);
  assert.equal(first.intersection.popupTemplate.expressionInfos, expressionInfos);
  assert.deepEqual(first.intersection.popupTemplate.outFields, ["*"]);
  assert.notEqual(first.intersection.popupTemplate, second.intersection.popupTemplate);
  assert.equal(first.interchange.popupTemplate, original);
  const cancelled = target();
  await applyIntersectionPopupTemplate(cancelled.map, () => true, importer);
  assert.equal(cancelled.intersection.popupTemplate, original);
});
