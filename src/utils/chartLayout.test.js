import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chartLayout } from "./chartLayout.js";

const sources = JSON.parse(readFileSync(new URL("../data/visualSources.json", import.meta.url)));
for (const id of ["5", "12", "29", "30"]) {
  test(`chart ${id} fits its full published extent at desktop and mobile widths`, () => {
    const chart = sources.charts.find(item => item.id === id);
    for (const width of [320, 679, 1024]) {
      const layout = chartLayout(chart, width);
      assert.ok(layout.width <= width);
      assert.ok(layout.height >= chart.height * layout.scale);
      assert.equal(layout.nativeWidth, chart.width);
      assert.equal(layout.nativeHeight, chart.height);
    }
    assert.equal(chartLayout(chart, 320, true).width, chart.width);
  });
}
