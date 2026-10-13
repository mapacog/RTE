import test from "node:test";
import assert from "node:assert/strict";
import { insightReadingText } from "./insightReading.js";

test("card speech includes its heading, text, and additional context", () => {
  assert.equal(insightReadingText({ title: "Traffic", text: "Daily activity.", context: "Counts vary." }, "en"),
    "Traffic. Daily activity. Counts vary.");
});

test("card speech uses the selected language and includes list entries", () => {
  const card = {
    title: { en: "County leaders", es: "Líderes por condado" },
    text: { en: "Regional locations.", es: "Ubicaciones regionales." },
    items: [{ label: "Douglas", value: "90th Street & West Dodge Road" }],
  };
  assert.equal(insightReadingText(card, "es"),
    "Líderes por condado. Ubicaciones regionales. Douglas: 90th Street & West Dodge Road.");
  assert.ok(!insightReadingText(card, "es").includes("County leaders"));
});

test("card speech omits absent fields and preserves numeric list values", () => {
  assert.equal(insightReadingText({ title: "Counts", items: [{ label: "Sites", value: 5 }] }, "en"), "Counts. Sites: 5.");
});
