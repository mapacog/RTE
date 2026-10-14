import test from "node:test";
import assert from "node:assert/strict";
import { createSpeechReader } from "./speechReader.js";

function setup() {
  const spoken = [];
  let cancellations = 0;
  const reader = createSpeechReader({ speak: speech => spoken.push(speech), cancel: () => cancellations++ }, text => ({ text }));
  return { reader, spoken, cancellations: () => cancellations };
}

test("card playback uses its text and selected language and can be stopped", () => {
  const { reader, spoken, cancellations } = setup();
  const state = [];
  const stop = reader.speak("Texto de la tarjeta.", "es", value => state.push(value));
  assert.equal(spoken[0].text, "Texto de la tarjeta.");
  assert.equal(spoken[0].lang, "es-US");
  stop();
  assert.deepEqual(state, [true, false]);
  assert.equal(cancellations(), 1);
});

test("starting another card stops the previous one without stale events stopping the new card", () => {
  const { reader, spoken } = setup();
  const firstState = [], secondState = [];
  const stopFirst = reader.speak("First.", "en", value => firstState.push(value));
  const oldFinish = spoken[0].onend;
  reader.speak("Second.", "en", value => secondState.push(value));
  oldFinish();
  stopFirst();
  assert.deepEqual(firstState, [true, false]);
  assert.deepEqual(secondState, [true]);
  spoken[1].onend();
  assert.deepEqual(secondState, [true, false]);
});

test("a speech error or synchronous failure resets playback state", () => {
  const { reader, spoken } = setup();
  const state = [];
  reader.speak("First.", "en", value => state.push(value));
  spoken[0].onerror();
  assert.deepEqual(state, [true, false]);
  const failed = createSpeechReader({ speak: () => { throw new Error("Unavailable"); }, cancel() {} }, text => ({ text }));
  const failedState = [];
  failed.speak("Second.", "en", value => failedState.push(value));
  assert.deepEqual(failedState, [true, false]);
});

test("translated speech selects matching non-English voices and preserves regional language tags", () => {
  const spoken = [];
  const voices = [{ lang: "en-US" }, { lang: "fr-FR" }, { lang: "zh-CN" }];
  const reader = createSpeechReader({ speak: speech => spoken.push(speech), cancel() {}, getVoices: () => voices }, text => ({ text }));
  reader.speak("Texte traduit", "fr", () => {});
  assert.equal(spoken[0].lang, "fr-FR");
  assert.equal(spoken[0].voice, voices[1]);
  reader.speak("中文", "zh-CN", () => {});
  assert.equal(spoken[1].lang, "zh-CN");
  assert.equal(spoken[1].voice, voices[2]);
});
