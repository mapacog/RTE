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

test("the swoop is decorative inside the home topic section, with the heading and footer unchanged",async()=>{
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
    assert.match(markup,/mapa-logo-white-yellow\.png/);
    assert.doesNotMatch(markup,/home-brand-accent|footer-brand-swoop|overview-flow-band/);
  } finally {
    if(previousWindow===undefined)delete global.window;else global.window=previousWindow;
    if(previousLocation===undefined)delete global.location;else global.location=previousLocation;
    await server.close();
  }
});
