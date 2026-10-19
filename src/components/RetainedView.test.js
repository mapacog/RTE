import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createElement, useEffect, useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  esbuild: { jsx: "automatic" },
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
const { default: RetainedView, useViewActive } = await server.ssrLoadModule("/src/components/RetainedView.jsx");
after(() => server.close());

test("a view mounts on first visit and retains its instance, state, and last visible props", () => {
  let mounts = 0, unmounts = 0;
  function MapProbe({ label }) {
    const [count, setCount] = useState(0);
    useEffect(() => { mounts++; return () => { unmounts++; }; }, []);
    return createElement("button", { onClick: () => setCount(value => value + 1) }, `${label}: ${count}`);
  }
  const view = (active, label) => createElement(RetainedView, { active }, createElement(MapProbe, { label }));
  let renderer;
  act(() => { renderer = TestRenderer.create(view(false, "unused")); });
  assert.equal(renderer.toJSON(), null);
  assert.equal(mounts, 0);
  act(() => { renderer.update(view(true, "loaded")); });
  act(() => { renderer.root.findByType("button").props.onClick(); });
  act(() => { renderer.update(view(false, "inactive props")); });
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);
  assert.equal(renderer.root.findByType("button").children[0], "loaded: 1");
  assert.equal(renderer.root.findByProps({ className: "retained-view" }).props.hidden, true);
  assert.equal(renderer.root.findByProps({ className: "retained-view" }).props.inert, "");
  act(() => { renderer.update(view(true, "returned")); });
  assert.equal(mounts, 1);
  assert.equal(renderer.root.findByType("button").children[0], "returned: 1");
  act(() => renderer.unmount());
  assert.equal(unmounts, 1);
});

test("switching keyed maps retains both visited map instances", () => {
  const mounts = { a: 0, b: 0 };
  function MapProbe({ id }) {
    useEffect(() => { mounts[id]++; }, []);
    return createElement("span", null, id);
  }
  const views = active => createElement("div", null, ["a", "b"].map(id =>
    createElement(RetainedView, { key: id, active: id === active }, createElement(MapProbe, { id }))));
  let renderer;
  act(() => { renderer = TestRenderer.create(views("a")); });
  assert.deepEqual(mounts, { a: 1, b: 0 });
  act(() => renderer.update(views("b")));
  act(() => renderer.update(views("a")));
  assert.deepEqual(mounts, { a: 1, b: 1 });
  act(() => renderer.unmount());
});

test("hidden parents deactivate nested views without unmounting them", () => {
  const states = [];
  let mounts = 0;
  function MapProbe() {
    const active = useViewActive();
    useEffect(() => { mounts++; }, []);
    useEffect(() => { states.push(active); }, [active]);
    return createElement("span", null, active ? "active" : "hidden");
  }
  const view = active => createElement(RetainedView, { active },
    createElement(RetainedView, { active: true }, createElement(MapProbe)));
  let renderer;
  act(() => { renderer = TestRenderer.create(view(true)); });
  act(() => renderer.update(view(false)));
  act(() => renderer.update(view(true)));
  assert.equal(mounts, 1);
  assert.deepEqual(states, [true, false, true]);
  act(() => renderer.unmount());
});

