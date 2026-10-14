import test from "node:test";
import assert from "node:assert/strict";
import { counterVolumeRecord } from "./counterVolumes.js";
import { popupModel } from "../services/mapPopups.js";
const layer={url:"https://services.arcgis.com/test/arcgis/rest/services/MAPA_ATR/FeatureServer/0"};
test("annual workbook volumes match both state and zero-padded station ID",()=>{
  assert.equal(counterVolumeRecord({state:"IA",Station_Id:"000914"}).history["2025"],10745);
  assert.equal(counterVolumeRecord({state:"NE",Name:"A-17"}).history["2025"],81322);
  assert.equal(counterVolumeRecord({State_Code:31,Station_Id:"000024"}).history["2025"],180942);
  assert.equal(counterVolumeRecord({state:"IA",Station_Id:"000017"}),null);
});
test("A-40 uses the requested NDOT annual summary value and records the workbook difference",()=>{
  const record=counterVolumeRecord({state:"NE",Name:"A-40"});
  assert.equal(record.history["2025"],96224);
  assert.equal(record.reportOverride.workbookValue,96808);
  const model=popupModel(layer,{state:"NE",Name:"A-40"});
  assert.equal(model.value,"96,224");
  assert.match(model.note,/Continuous Traffic Count Data and Traffic Characteristics/);
  assert.match(model.note,/Iowa DOT's Automatic Traffic Recorder Reports/);
  assert.doesNotMatch(model.note,/supplied ATR workbook/);
});
test("counter popups show actual annual AADT, recent history, and the correct source year",()=>{
  const current=popupModel(layer,{state:"NE",Station_Id:"000017"});
  assert.equal(current.value,"81,322");assert.equal(current.label,"2025 AADT");assert.equal(current.history.length,32);
  assert.equal(current.chartSeries[0].year,1994);assert.equal(current.chartSeries.at(-1).year,2025);
  assert.equal(current.chartSeries.at(-1).amount,81322);
  const inactive=popupModel(layer,{state:"IA",Station_Id:"000110",Status:"Not Counting"});
  assert.equal(inactive.value,"26,448");assert.equal(inactive.label,"2022 AADT");
  assert.equal(inactive.chartSeries.at(-1).year,2022);
  const missing=popupModel(layer,{state:"NE",Station_Id:"00078",Name:"A-78"});
  assert.equal(missing.value,undefined);assert.match(missing.note,/No annual value/);
  assert.equal(missing.chartSeries,undefined);
});
