import test from "node:test";
import assert from "node:assert/strict";
import ruralVmt from "../data/ruralVmt.json" with {type:"json"};
import { harmonizedVmtChange } from "./vmtComparison.js";

test("rural VMT aggregates the confirmed districts using only harmonized 2022 values",()=>{
  assert.equal(ruralVmt.districts.length,7);
  assert.deepEqual(ruralVmt.districts.map(row=>row.TAD_UID).sort(),["279927","279940","279941","279944","279946","279948","279949"]);
  const result=harmonizedVmtChange(ruralVmt.districts);
  assert.equal(result.change,result.current/result.baseline-1);
  assert.ok(result.change>0.07 && result.change<0.08);
  assert.equal(harmonizedVmtChange([{SUM_VMT_2022_HARM:100,SUM_VMT_2022:999,SUM_VMT_25:120}]).change,120/100-1);
});
test("missing harmonized baselines never fall back to legacy values",()=>{
  assert.equal(harmonizedVmtChange([{SUM_VMT_2022:100,SUM_VMT_25:120}]),null);
  assert.equal(harmonizedVmtChange([{SUM_VMT_2022_HARM:0,SUM_VMT_25:120}]),null);
  assert.equal(harmonizedVmtChange([]),null);
});
