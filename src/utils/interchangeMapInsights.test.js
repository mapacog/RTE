import test from "node:test";
import assert from "node:assert/strict";
import { interchangeMapInsights } from "./interchangeMapInsights.js";

test("interchange map insights derive their counts from the live ranked locations", () => {
  const rows = [
    { id: "a", name: "72nd St & I-80", aadt: 200, county: "Douglas" },
    { id: "b", name: "West Dodge Rd & I-680", aadt: 100, county: "Douglas" },
    { id: "c", name: "I-80 & I-29", aadt: 50, county: "Pottawattamie" },
    { id: "d", name: "Other", aadt: null, county: "Sarpy" },
  ];
  const cards = interchangeMapInsights(rows);
  assert.deepEqual(cards.map(card => card.title.en), ["I-80 connections", "County footprint"]);
  assert.match(cards[0].text.en, /2 of the 3/);
  assert.deepEqual(cards[1].items, [
    { label: "Douglas", value: "2 interchanges" },
    { label: "Pottawattamie", value: "1 interchange" },
  ]);
  assert.ok(!cards.some(card => ["Busiest location", "Where traffic concentrates", "County leaders"].includes(card.title.en)));
});

test("interchange map handles empty data and Spanish counts", () => {
  assert.deepEqual(interchangeMapInsights([]), []);
  const cards = interchangeMapInsights([{ id: "a", name: "I-80", aadt: 50, county: "Sarpy" }], "es");
  assert.equal(cards[1].items[0].value, "1 intercambio");
  for (const card of cards) assert.ok(card.title.es);
});
