import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFeature, rankLocations, loadTrafficLocations } from "./trafficRankings.js";

const feature = (id, total, city = "Omaha", county = "Douglas") => ({ attributes: {
  OBJECTID: id, INTERSECTI: `Location ${id}`, CITY: city, COUNTY: county,
  Total_25: total, N_LEGSUM_25: null, E_LEGSUM_25: 0,
} });

test("city and county ranks start at 1 before applying a top limit", () => {
  const rows = [feature(1, 1000), feature(2, 300, "Bellevue", "Sarpy"),
    feature(3, 500, "Papillion", "Sarpy"), feature(4, 200, "Bellevue", "Sarpy")]
    .map(item => normalizeFeature(item.attributes, "intersections"));
  assert.deepEqual(rankLocations(rows).map(row => row.objectId), [1, 3, 2, 4]);
  assert.deepEqual(rankLocations(rows, "city", "Bellevue").map(row => [row.objectId, row.rank]), [[2, 1], [4, 2]]);
  assert.deepEqual(rankLocations(rows, "county", "Sarpy").map(row => [row.objectId, row.rank]), [[3, 1], [2, 2], [4, 3]]);
  assert.equal(rankLocations(rows, "county", "Sarpy").slice(0, 1)[0].objectId, 3);
  assert.equal(rankLocations(rows, "city", "").length, 0);
  assert.equal(rankLocations(rows, "city", "Missing").length, 0);
});

test("missing volumes stay distinct from zero and ties are deterministic", () => {
  const rows = [feature(3, 100), feature(1, 100), feature(2, null), feature(4, 0)]
    .map(item => normalizeFeature(item.attributes, "intersections"));
  assert.equal(rows[0].legs.north, null);
  assert.equal(rows[0].legs.east, 0);
  assert.deepEqual(rankLocations(rows).map(row => [row.objectId, row.rank]), [[1, 1], [3, 2], [4, 3]]);
});

test("fetches every service page before ranking", async () => {
  const offsets = [];
  const rows = await loadTrafficLocations("intersections", { fetchImpl: async url => {
    const offset = Number(new URL(url).searchParams.get("resultOffset"));
    offsets.push(offset);
    return { ok: true, json: async () => offset === 0
      ? { features: [feature(1, 20)], exceededTransferLimit: true }
      : { features: [feature(2, 100)], exceededTransferLimit: false } };
  } });
  assert.deepEqual(offsets, [0, 1]);
  assert.equal(rankLocations(rows)[0].objectId, 2);
});

test("ArcGIS errors in a successful HTTP response are surfaced", async () => {
  await assert.rejects(loadTrafficLocations("interchanges", { fetchImpl: async () => ({
    ok: true, json: async () => ({ error: { message: "Query unavailable" } }),
  }) }), /Query unavailable/);
});

test("repeated pages cannot silently create partial or duplicate rankings", async () => {
  await assert.rejects(loadTrafficLocations("intersections", { fetchImpl: async () => ({
    ok: true, json: async () => ({ features: [feature(1, 20)], exceededTransferLimit: true }),
  }) }), /repeated records/);
});
