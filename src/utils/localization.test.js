import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalogs, translateText, expandLanguages, languages } from "./localization.js";
const en=JSON.parse(readFileSync(new URL("../data/locales/en.json",import.meta.url)));
test("six native catalogs cover every message and preserve interpolation placeholders",()=>{
  assert.deepEqual(languages.map(item=>item.code),["en","es","fr","ar","de","zh","ru","ko"]);
  for(const [code,catalog] of Object.entries(catalogs)){
    for(const key of Object.keys(en))assert.ok(Object.hasOwn(catalog,key),`${code}: ${key}`);
    assert.deepEqual(Object.keys(catalog).sort(),Object.keys(catalogs.fr).sort(),code);
    for(const [key,value] of Object.entries(catalog)){
      assert.ok(typeof value==="string" && value.trim(),`${code}: ${key}`);
      assert.deepEqual((value.match(/\{\d+\}/g)||[]).sort(),(key.match(/\{\d+\}/g)||[]).sort(),`${code}: ${key}`);
    }
    assert.notEqual(translateText("Home",code),"Home");
    assert.notEqual(translateText("Regional Traffic Explorer",code),"Regional Traffic Explorer");
  }
});
test("bilingual data expands natively without changing reviewed English and Spanish",()=>{
  const input={title:{en:"Home",es:"Inicio"},text:{en:"No change from 2024",es:"Sin cambio desde 2024"}};
  const result=expandLanguages(input);
  assert.equal(result.title.en,"Home");assert.equal(result.title.es,"Inicio");
  for(const code of Object.keys(catalogs)){assert.notEqual(result.title[code],"Home");assert.notEqual(result.text[code],input.text.en);}
  assert.deepEqual(Object.keys(input.title),["en","es"]);
  assert.equal(translateText("Some unknown place","fr"),"Some unknown place");
});

test("updated transit gains translate in all six native catalogs without changing authored English or Spanish",()=>{
  const report=JSON.parse(readFileSync(new URL("../data/reportInsights.json",import.meta.url)));
  const input=report.mapContexts.e2547ddd72254f2ab44c3b4302ebe8e2[1].text;
  const result=expandLanguages(input);
  assert.equal(result.en,input.en);
  assert.equal(result.es,input.es);
  assert.deepEqual(Object.keys(input),["en","es"]);
  for(const code of Object.keys(catalogs)){
    assert.ok(Object.hasOwn(catalogs[code],input.en),`${code}: missing updated lookup key`);
    assert.notEqual(result[code],input.en,code);
    for(const name of ["Crown Point & Wenninghoff Rd SW","Crown Point & NW High E Entrance NW","North Omaha TC"]){
      assert.ok(result[code].includes(name),`${code}: ${name}`);
    }
    for(const value of ["2022","100","+199","+192","+161"]){
      assert.ok(result[code].includes(value),`${code}: ${value}`);
    }
    assert.doesNotMatch(result[code],/22nd & Cuming|Westroads ORBT|153rd & Weir/,code);
  }
  for(const [code,month] of Object.entries({fr:"avril",ar:"أبريل",de:"April",zh:"4月",ru:"апрелем",ko:"4월"})){
    assert.ok(result[code].includes(month),`${code}: April comparison`);
  }
});

test("traffic calibration methodology includes partner counts and seasonal adjustments in every language",()=>{
  const report=JSON.parse(readFileSync(new URL("../data/reportInsights.json",import.meta.url)));
  const input=report.contexts.districts.find(item=>item.title.en==="Adjusted with traffic counts").text;
  const result=expandLanguages(input);
  assert.match(result.en,/City of Omaha and Douglas, Sarpy, and Pottawattamie counties/);
  assert.match(result.en,/seasonal factors provided by the state DOTs/);
  assert.match(result.en,/fill data gaps and were calibrated against available traffic counts/);
  assert.equal(result.es,input.es);
  for(const code of ["en","es",...Object.keys(catalogs)]){
    for(const term of ["MAPA","2022","StreetLight","FFC","TAD","DOT"]){
      assert.ok(result[code].includes(term),`${code}: ${term}`);
    }
    if(catalogs[code]){
      assert.ok(Object.hasOwn(catalogs[code],input.en),`${code}: missing methodology translation`);
      assert.notEqual(result[code],input.en,code);
    }
  }
});

test("MAPA description and GIS contact have native translations without changing the email",()=>{
  const input=JSON.parse(readFileSync(new URL("../data/aboutMapa.json",import.meta.url)));
  const result=expandLanguages(input);
  const fields=["description","dataCollaboration","purpose"];
  const contacts=["intro","subject","prompt"];
  assert.match(result.dataCollaboration.en,/collect, compile and share data/);
  assert.match(result.purpose.en,/more happy, healthy and vibrant region/);
  assert.equal(result.contact.email,"gis@mapacog.org");
  assert.equal(Object.hasOwn(result.contact,"emailPrefix"),false);
  assert.equal(`${result.contact.intro.en} ${result.contact.subject.en} ${result.contact.prompt.en} ${result.contact.email}`,"Have questions or want to learn more about Geographic Information System (GIS) at MAPA? Contact us at gis@mapacog.org");
  assert.equal(Object.hasOwn(result.contact,"department"),false);
  for(const field of [...fields.map(key=>[input[key],result[key]]),...contacts.map(key=>[input.contact[key],result.contact[key]])]){
    const [authored,expanded]=field;
    assert.equal(expanded.en,authored.en);
    assert.equal(expanded.es,authored.es);
    for(const code of Object.keys(catalogs)){
      assert.ok(Object.hasOwn(catalogs[code],authored.en),`${code}: ${authored.en}`);
      assert.notEqual(expanded[code],authored.en,code);
    }
  }
});
