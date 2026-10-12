import test from "node:test";
import assert from "node:assert/strict";
import { popupModel, popupProfile, createPopupContent } from "./mapPopups.js";

const base = "https://services.arcgis.com/CHjpJeHqytL8t8op/arcgis/rest/services/";
const layer = (service, index = 0, title = "") => ({ url: `${base}${service}/FeatureServer/${index}`, title });

test("ranked locations show whole-number AADT, zero legs, and missing legs separately", () => {
  const attributes = { INTERSECTI: "90th Street & West Dodge Road", CITY: "Omaha", COUNTY: "Douglas", Total_25: 95430.5, Total_24: 90000, Rank_25: 1, N_LEGSUM_25: 0, E_LEGSUM_25: 70560.5 };
  const model = popupModel(layer("Traffic_Flow_System__Public_view", 1), attributes);
  assert.equal(model.value, "95,431");
  assert.equal(model.rank, "#1");
  assert.equal(model.legs[0].value, "0");
  assert.equal(model.legs[1].value, "70,561");
  assert.equal(model.legs[2].value, "Not reported");
  assert.equal(attributes.Total_25, 95430.5);
});

test("a zero or absent comparison baseline does not fabricate a percentage", () => {
  const source = layer("Traffic_Flow_System__Public_view", 0);
  assert.equal(popupModel(source, { Total_25: 200, Total_24: 0 }).comparison, undefined);
  assert.equal(popupModel(source, { Total_25: 200 }).comparison, undefined);
});

test("SDK service-root URLs use the separate layer ID", () => {
  assert.equal(popupProfile({ url: `${base}Traffic_Flow_System__Public_view/FeatureServer`, layerId: 1 }), "intersection");
  assert.equal(popupProfile({ url: `${base}Traffic_Flow_System__Public_view/FeatureServer/`, layerId: 0 }), "interchange");
});

test("district and regional views use their own fields and fractional percentages", () => {
  const a = { TAD_12: "DOUG_ECBD", COUNTYFP10: "UC", SUM_VMT_25: 669464.95, VMT_Change_22H_25: 0.100764, REG_Change22H_25: 0.05732983, REG_SUM_VMT_25: 9267146.31 };
  const district = popupModel(layer("Traffic_Analysis_District", 0, "Estimated Percent Change in VMT, 2022-2025"), a);
  const regional = popupModel(layer("Traffic_Analysis_District", 0, "Regional Percent Change in VMT 2022 - 2025"), a);
  const daily = popupModel(layer("Traffic_Analysis_District", 0, "2025 Average Daily"), a);
  assert.equal(district.value, "+10.1%");
  assert.equal(regional.value, "+5.7%");
  assert.equal(regional.title, "Urban Core");
  assert.equal(regional.rows[0].value, "9,267,146");
  assert.equal(daily.value, "669,465");
});

test("transit change is a difference in activity points, not percentage growth", () => {
  const model = popupModel(layer("Metro_Ridership_Productivity", 11), { Act100Vis: 9.6774, Act100Vis_2022: 0.554, Board_Coun: 18 });
  assert.equal(model.value, "9.7");
  assert.equal(model.comparison.value, "+9.1");
  assert.equal(model.comparison.label, "points since April 2022");
  assert.equal(model.rows[0].value, "18");
});

test("district popups hide coded names while retaining measurement context", () => {
  const model = popupModel(layer("Traffic_Analysis_District", 0, "Traffic Analysis District"), { TAD_12: "DOUG_ENE", TAD_Label: "Douglas", VMT22_HARM_METHOD: "2022 Traffic Report Methodology" });
  assert.equal(model.title, "Traffic Analysis District");
  assert.equal(model.subtitle, "Douglas");
  assert.equal(model.method, "2022 Traffic Report Methodology");
  assert.equal(model.methodLabel, "How this is measured");
});

test("bike share shows annual checkouts instead of claiming live availability", () => {
  const model = popupModel(layer("Heartland_BCycle_Stations"), { C_2025: 3230, data__stations__name: "67th & Pine", data__stations__num_bikes_avail: 4 });
  assert.equal(model.value, "3,230");
  assert.match(model.label, /checkouts/);
  assert.equal(model.rows.length, 0);
});

test("counter profiles omit absent volumes and unknown layers retain authored popups", () => {
  assert.equal(popupModel(layer("MAPA_Bike_and_Ped._Counters_Public_View"), { site_name: "Field Club" }).value, undefined);
  assert.equal(popupModel(layer("MAPA_ATR"), { Status: "Old" }).rows[0].value, "Historical station");
  assert.equal(popupProfile({ url: "https://example.com/unknown" }), null);
  assert.equal(popupModel({ url: "https://example.com/unknown" }, {}), null);
});

test("custom content treats service text as text, not HTML", () => {
  const doc = { createElement: tag => ({ tag, children: [], style: {}, append(...children) { this.children.push(...children); }, setAttribute() {} }) };
  const model = popupModel(layer("MAPA_Bike_and_Ped._Counters_Public_View"), { site_name: "<img onerror=alert(1)>", domain_name: "<script>bad</script>" });
  const content = createPopupContent(model, doc);
  assert.equal(content.children[1].textContent, "<script>bad</script>");
  assert.equal(content.innerHTML, undefined);
});
