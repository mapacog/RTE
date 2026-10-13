import test from "node:test";
import assert from "node:assert/strict";
import { homeShareUrl, shareLinks } from "./shareLinks.js";

test("Home sharing preserves the deployment path and removes query parameters", () => {
  assert.equal(homeShareUrl("https://example.org/RTE/?campaign=test#intersections/rankings"), "https://example.org/RTE/#Home");
  assert.equal(homeShareUrl("http://127.0.0.1:5175/#overview"), "http://127.0.0.1:5175/#Home");
});

test("share options encode the Home URL and product title correctly", () => {
  const url = "https://example.org/RTE/#Home";
  const title = "Regional Traffic Explorer";
  const links = shareLinks(url, title);
  assert.equal(new URL(links.facebook).searchParams.get("u"), url);
  assert.equal(new URL(links.linkedin).searchParams.get("url"), url);
  assert.equal(new URL(links.whatsapp).searchParams.get("text"), `${title}\n${url}`);
  const email = new URL(links.email);
  assert.equal(email.searchParams.get("subject"), title);
  assert.equal(email.searchParams.get("body"), `${title}\n${url}`);
});
