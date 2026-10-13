import test from "node:test";
import assert from "node:assert/strict";
import { compareReportCells } from "./reportTableSort.js";

test("roadway classes use FHWA 1 through 7 rather than alphabetical order", () => {
  const classes = ["Local", "Minor Collector", "Freeway", "Major Collector", "Interstate", "Minor Arterial", "Principal Arterial"];
  assert.deepEqual(classes.sort((a, b) => compareReportCells(a, b, "ffc", 0)),
    ["Interstate", "Freeway", "Principal Arterial", "Minor Arterial", "Major Collector", "Minor Collector", "Local"]);
  assert.equal(compareReportCells(10, 2, "ffc", 1), 8);
  assert.ok(compareReportCells("Iowa", "Nebraska", "atr", 0) < 0);
});
