import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const reports = JSON.parse(readFileSync(new URL("./reportDownloads.json", import.meta.url), "utf8"));
const expectedIds = {
  flow: "1seuP3GsPUhE9VPZfeBeMeST4UQSqqP22",
  interchanges: "1tOT7GI1LVwnsgevhQ58obeUoe7TKcUar",
  intersections: "1SCiddw235IhIa27LeCxf9xjzeqduM_H6",
  regional: "10lTblXOqTjgEgeZDhbaUSyQd3SVuW4jg",
};

test("all report buttons reference the supplied Drive files rather than local PDFs", () => {
  assert.deepEqual(Object.keys(reports).sort(), Object.keys(expectedIds).sort());
  for (const [key, id] of Object.entries(expectedIds)) {
    const url = new URL(reports[key].url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "drive.google.com");
    assert.equal(url.pathname, `/file/d/${id}/view`);
    assert.equal(reports[key].file, undefined);
    assert.ok(reports[key].label.en);
    assert.ok(reports[key].label.es);
  }
});
