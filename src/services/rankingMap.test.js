import test from "node:test";
import assert from "node:assert/strict";
import { rankingMapWhere, rankingLabelExpression, applyRankingFilter } from "./rankingMap.js";

const rows = [{ objectId: 12, rank: 1 }, { objectId: 7, rank: 2 }];
test("rankings map uses the same limited IDs and safe jurisdiction filters", () => {
  assert.equal(rankingMapWhere(rows, "county", "Sarpy", "10"), "OBJECTID IN (12,7)");
  assert.equal(rankingMapWhere(rows, "city", "O'Fallon", "all"), "Total_25 >= 0 AND CITY = 'O''Fallon'");
  assert.equal(rankingMapWhere(rows, "regional", "", "all"), "Total_25 >= 0");
  assert.equal(rankingMapWhere(rows, "county", "", "all"), "1=0");
  assert.equal(rankingMapWhere([], "regional", "", "10"), "1=0");
  assert.equal(rankingLabelExpression(rows), "Decode($feature.OBJECTID, 12, '1', 7, '2', '')");
});
test("shared filters replace regional styling and zoom only the current result", async () => {
  const extent = { width: 10, height: 10, expand: scale => ({ scale }) };
  const layer = { queryExtent: async () => ({ extent }) };
  const targets = [], popup = { open: true };
  const element = { querySelector: () => popup, view: { goTo: async target => targets.push(target) } };
  const filter = { rows, scope: "county", jurisdiction: "Sarpy", limit: "10" };
  await applyRankingFilter(element, [layer], filter, () => true);
  assert.equal(layer.definitionExpression, "OBJECTID IN (12,7)");
  assert.equal(layer.renderer.type, "simple");
  assert.equal(layer.labelsVisible, true);
  assert.equal(popup.open, false);
  assert.deepEqual(targets, [{ scale: 1.15 }]);
  await applyRankingFilter(element, [layer], filter, () => false);
  assert.equal(targets.length, 1);
  await assert.rejects(applyRankingFilter(element, [], filter, () => true), /could not be found/);
});
