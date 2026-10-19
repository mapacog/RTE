import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkRepository } from "./checkRepository.mjs";

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), "rte-repository-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const contents = { "package.json": '{"dependencies":{"react":"18"}}', ...files };
  for (const [file, value] of Object.entries(contents)) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, value);
  }
  return root;
}

test("repository checks resolve extensionless and inline imports and local asset paths", t => {
  const root = fixture(t, {
    "src/App.jsx": 'import React from "react"; import css from "./popup.css?inline"; import data from "./copy"; export default <img src="./assets/logo.svg" />;',
    "src/popup.css": "",
    "src/copy.json": '{"src":"assets/photo.webp"}',
    "src/load.js": 'fetch(`${import.meta.env.BASE_URL}data/table.json`);',
    "public/assets/logo.svg": "<svg/>",
    "public/assets/photo.webp": "photo",
    "public/data/table.json": "[]",
  });
  const result = checkRepository(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.imports, 3);
  assert.equal(result.assets, 3);
});

test("repository checks catch broken imports, undeclared dependencies, and missing assets", t => {
  const root = fixture(t, {
    "src/load.js": 'export {load} from "./gone.js"; import x from "@missing/package"; import("./missing.json"); const photo="assets/gone.webp";',
  });
  assert.deepEqual(checkRepository(root).errors, [
    "src/load.js: Missing local import ./gone.js",
    "src/load.js: Undeclared dependency @missing/package",
    "src/load.js: Missing local import ./missing.json",
    "src/load.js: Missing public asset assets/gone.webp",
  ]);
});

test("repository checks report invalid JSON and JavaScript syntax", t => {
  const root = fixture(t, { "src/bad.json": "{", "src/bad.js": "export default <" });
  const result = checkRepository(root);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.some(error => error.startsWith("src/bad.json:")));
  assert.ok(result.errors.some(error => error.startsWith("src/bad.js:")));
});

test("remote URLs and import paths are not mistaken for public assets", t => {
  const root = fixture(t, {
    "src/main.js": 'import data from "./data/config.json" with {type:"json"}; const url="https://example.com/assets/external.png";',
    "src/data/config.json": "{}",
  });
  assert.deepEqual(checkRepository(root).errors, []);
});
