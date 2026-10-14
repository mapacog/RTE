import test from "node:test";
import assert from "node:assert/strict";
import { selectSpeechVoice, speechLanguage } from "./speechVoices.js";
import { createSpeechReader } from "./speechReader.js";
test("natural native-language voices take priority over legacy voices",()=>{
  const legacy={name:"Microsoft David",lang:"en-US",localService:true};
  const natural={name:"Microsoft Aria Online (Natural)",lang:"en-US",localService:false};
  assert.equal(selectSpeechVoice([legacy,natural],"en"),natural);
  assert.equal(selectSpeechVoice([legacy,natural],"fr"),null);
  assert.equal(speechLanguage("ar"),"ar-SA");
});
test("missing matching voice does not read foreign text with an English voice",()=>{
  let spoke=false;const errors=[];
  const reader=createSpeechReader({getVoices:()=>[{lang:"en-US"}],speak:()=>spoke=true,cancel(){}},text=>({text}));
  reader.speak("Texte français","fr",()=>{},error=>errors.push(error));
  assert.equal(spoke,false);assert.deepEqual(errors,["voice-unavailable"]);
});
test("voices loading asynchronously are awaited and listeners cleaned up",()=>{
  let voices=[],listener,spoken;let removals=0;
  const synth={getVoices:()=>voices,addEventListener:(event,callback)=>listener=callback,
    removeEventListener:()=>removals++,speak:utterance=>spoken=utterance,cancel(){}};
  const reader=createSpeechReader(synth,text=>({text}));
  const stop=reader.speak("Bonjour","fr",()=>{});
  assert.equal(spoken,undefined);voices=[{lang:"fr-FR",name:"French Natural"}];listener();
  assert.equal(spoken.voice,voices[0]);assert.ok(removals>0);stop();
});
