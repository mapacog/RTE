import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";

const notices=JSON.parse(readFileSync(new URL("../data/translationNotices.json",import.meta.url)));
test("separate general and Google notices exist in all eight languages",()=>{
  assert.deepEqual(Object.keys(notices),["en","es","fr","ar","de","zh","ru","ko"]);
  for(const notice of Object.values(notices)){
    assert.ok(notice.title && notice.general && notice.google && notice.close);
    assert.doesNotMatch(notice.general,/Google/);
    assert.match(notice.google,/Google Translate/);
  }
  assert.match(notices.en.general,/errors.*context.*English/);
  assert.match(notices.en.google,/MAPA cannot guarantee.*English/);
});

test("notice opens only on request and dismisses with focus restored",async()=>{
  const server=await createServer({configFile:false,esbuild:{jsx:"automatic"},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:"custom"});
  let view;
  try{
    const {default:TranslationNotice}=await server.ssrLoadModule("/src/components/TranslationNotice.jsx");
    const markup=renderToStaticMarkup(createElement(TranslationNotice));
    assert.match(markup,/aria-haspopup="dialog"/);
    assert.match(markup,/aria-describedby=/);
    assert.match(markup,/Translations are provided for convenience/);
    assert.doesNotMatch(markup,/Google Translate/);
    const french=renderToStaticMarkup(createElement(TranslationNotice,{language:"fr"}));
    assert.match(french,/Avis de traduction/);
    const previousLocation=global.location;
    try{
      global.location=new URL("http://127.0.0.1:5175/#Home");
      const {PreferencesControls}=await server.ssrLoadModule("/src/components/Preferences.jsx");
      const controls=renderToStaticMarkup(createElement(PreferencesControls));
      assert.match(controls,/aria-describedby="google-translation-notice"/);
      assert.match(controls,/Google Translate provides automated translations/);
      assert.match(controls,/id="google-translation-notice"/);
    }finally{
      if(previousLocation===undefined)delete global.location;else global.location=previousLocation;
    }
    let opened=0,closed=0,focused=0;
    const dialog={open:false,showModal(){this.open=true;opened++;},close(){this.open=false;closed++;}};
    await act(async()=>{view=TestRenderer.create(createElement(TranslationNotice),{createNodeMock:element=>element.type==="dialog"?dialog:{focus(){focused++;}}});});
    assert.equal(opened,0);
    await act(async()=>view.root.findByProps({className:"translation-notice-trigger"}).props.onClick());
    assert.equal(opened,1);
    await act(async()=>view.root.findByType("dialog").props.onCancel());
    assert.equal(closed,1);assert.equal(focused,1);
    await act(async()=>view.root.findByProps({className:"translation-notice-trigger"}).props.onClick());
    await act(async()=>view.root.findByType("dialog").props.onClick({target:dialog,currentTarget:dialog}));
    assert.equal(closed,2);assert.equal(focused,2);
  }finally{
    if(view)await act(async()=>view.unmount());
    await server.close();
  }
});
