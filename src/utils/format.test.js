import test from "node:test";
import assert from "node:assert/strict";
import { formatNumber, formatPercent } from "./format.js";

test("traffic volumes round to the nearest whole number", () => {
  assert.equal(formatNumber(95430.5), "95,431");
  assert.equal(formatNumber(238059.75), "238,060");
  assert.equal(formatNumber(81387.49), "81,387");
  assert.equal(formatNumber(0), "0");
  assert.equal(formatNumber(245868), "245,868");
});

test("rounding leaves source values and percentage precision unchanged", () => {
  const value = 95430.5;
  formatNumber(value, "es-US");
  assert.equal(value, 95430.5);
  assert.equal(formatPercent(8.3), "+8.3%");
});
