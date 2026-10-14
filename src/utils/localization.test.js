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
