import test from "node:test";
import assert from "node:assert/strict";
import { intersectionDetails } from "./intersectionDetails.js";

const westDodge = { INTERSECTI: "West Dodge Road & 96th Street", Total_25: 80679, Total_24: 78406,
  Total_23: 76100, Rank_25: 2, N_LEGSUM_25: 2652, E_LEGSUM_25: 78331, S_LEGSUM_25: 1863,
  W_LEGSUM_25: 78512, HPMS_F_SYSTEM: 3, URBAN_RURAL: "Urban", maxspeed: "45", CITY: "Omaha", COUNTY: "Douglas" };

test("native ranking details match the supplied Arcade headline, summary and road context", () => {
  const model = intersectionDetails(westDodge);
  assert.equal(model.value, "80,679");
  assert.equal(model.rankText, "rank #2");
  assert.equal(model.comparisons[0].label, "2.9% from 2024");
  assert.equal(model.comparisons[1].label, "2022 comparison unavailable");
  assert.equal(model.summary, "Traffic increased 2.9% from 2024. A comparison with 2022 is unavailable. This intersection ranks #2 by 2025 AADT.");
  assert.deepEqual(model.legs.map(item => item.value), ["2,652", "78,331", "1,863", "78,512"]);
  assert.deepEqual(model.roads.map(item => item.value), ["Other principal arterial", "Urban", "45 mph"]);
  assert.equal(model.location, "Omaha · Douglas");
});

test("historical values use the Arcade hundred-unit conversions without inventing missing years", () => {
  const model = intersectionDetails({ ...westDodge, Leg_Tot_20: 120, Leg_Tot_21: 0, Leg_Tot_22: 400 });
  assert.deepEqual(model.history.map(item => item.value), [12000, 0, 40000, 76100, 78406, 80679]);
  assert.equal(model.comparisons[1].label, "101.7% from 2022");
  const missing = intersectionDetails({ Total_25: 0, Total_24: 0 });
  assert.equal(missing.value, "0");
  assert.equal(missing.comparisons[0].percent, null);
  assert.equal(missing.history[0].value, null);
  assert.equal(missing.legs[0].value, "Not reported");
  assert.equal(missing.rankText, "not ranked");
});

test("comparison thresholds, decreases and Spanish content preserve the original meaning", () => {
  assert.equal(intersectionDetails({ Total_25: 10001, Total_24: 10000 }).comparisons[0].tone, "neutral");
  const decrease = intersectionDetails({ Total_25: 90, Total_24: 100 });
  assert.equal(decrease.comparisons[0].tone, "decrease");
  assert.match(decrease.summary, /decreased 10\.0%/);
  const spanish = intersectionDetails(westDodge, "es");
  assert.match(spanish.summary, /aumentó.*2024/);
  assert.equal(spanish.roads[0].value, "Otra arterial principal");
  assert.equal(spanish.roads[1].value, "Urbana");
});
