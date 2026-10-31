import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("the faint background retains all seven original vector paths without external resources",()=>{
  const svg=readFileSync(new URL("../../public/assets/mapa-arrow-swoop.svg",import.meta.url),"utf8");
  assert.ok(Buffer.byteLength(svg)<25000);
  assert.match(svg,/viewBox="0 600 3300 1200"/);
  assert.equal((svg.match(/<path /g)||[]).length,7);
  assert.doesNotMatch(svg,/<(?:script|image|foreignObject|animate)\b|(?:href|onload)=/);
});

test("home shows approved MAPA copy and a translated GIS email contact beside the footer logo",async()=>{
  const server=await createServer({configFile:false,esbuild:{jsx:"automatic"},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:"custom"});
  const previous={window:global.window,location:global.location,localStorage:global.localStorage};
  try {
    global.location=new URL("http://localhost/#Home");
    global.window={location:global.location};
    const {default:App}=await server.ssrLoadModule("/src/App.jsx");
    const {PreferencesProvider}=await server.ssrLoadModule("/src/components/Preferences.jsx");
    const {default:about}=await server.ssrLoadModule("/src/data/aboutMapa.js");
    for(const language of ["en","es","fr","ar","de","zh","ru","ko"]){
      global.localStorage={getItem:key=>key==="rte-language"?language:null};
      const markup=renderToStaticMarkup(createElement(PreferencesProvider,null,createElement(App)));
      const footer=markup.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/)?.[1];
      assert.ok(footer,language);
      assert.match(footer,/class="footer-email" href="mailto:gis@mapacog\.org" dir="ltr">gis@mapacog\.org<\/a>/);
      assert.match(footer,/<\/span> <a class="footer-email"/);
      assert.doesNotMatch(footer,/lucide-mail|<span>At<\/span>|<span aria-hidden="true">@<\/span>/);
      assert.ok(footer.includes(renderToStaticMarkup(createElement("p",null,about.contact.intro[language]))),language);
      assert.ok(footer.includes(renderToStaticMarkup(createElement("p",null,about.contact.subject[language]))),language);
      assert.equal((footer.match(/<p>/g)||[]).length,3,language);
      assert.ok(footer.includes(renderToStaticMarkup(createElement("span",null,about.contact.prompt[language]))),language);
      assert.doesNotMatch(footer,/footer-contact-title|Questions about the data\?/);
      assert.doesNotMatch(footer,/Transportation and Data Department|Data\/GIS Team/);
      assert.ok(footer.indexOf('class="footer-contact"')<footer.indexOf('class="footer-logo"'));
      assert.match(footer,/mapa-logo-white-yellow\.png/);
      assert.ok(markup.includes(renderToStaticMarkup(createElement("p",null,about.dataCollaboration[language]))),language);
      assert.ok(markup.includes(renderToStaticMarkup(createElement("p",null,about.purpose[language]))),language);
      assert.doesNotMatch(markup,/It connects local priorities with the region/);
    }
  } finally {
    for(const [key,value] of Object.entries(previous)){
      if(value===undefined)delete global[key];else global[key]=value;
    }
    await server.close();
  }
});

test("the swoop is decorative inside the home topic section, with the heading and footer logo preserved",async()=>{
  const server=await createServer({configFile:false,esbuild:{jsx:"automatic"},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:"custom"});
  const previousWindow=global.window,previousLocation=global.location;
  try {
    global.location=new URL("http://localhost/#Home");
    global.window={location:global.location};
    const {default:App}=await server.ssrLoadModule("/src/App.jsx");
    const markup=renderToStaticMarkup(createElement(App));
    assert.match(markup,/class="destination-swoop"[^>]*alt="" aria-hidden="true"/);
    assert.ok(markup.indexOf('class="destination-swoop"')>markup.indexOf('class="home-destinations"'));
    assert.match(markup,/<footer class="site-footer">/);
    assert.match(markup,/Local Streets Trends/);
    assert.doesNotMatch(markup,/home-beta|>Beta</);
    assert.doesNotMatch(markup,/Local street growth/);
    assert.match(markup,/mapa-logo-white-yellow\.png/);
    assert.doesNotMatch(markup,/home-brand-accent|footer-brand-swoop|overview-flow-band/);
  } finally {
    if(previousWindow===undefined)delete global.window;else global.window=previousWindow;
    if(previousLocation===undefined)delete global.location;else global.location=previousLocation;
    await server.close();
  }
});
