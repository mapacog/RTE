import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("photo assets are lightweight WebP files without camera metadata", () => {
  const photos = JSON.parse(readFileSync(new URL("./metroPhotos.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(photos), ["regional-patterns", "intersections", "interchanges", "multimodal", "freight"]);
  assert.equal(photos["regional-patterns"][0].src, "assets/metro-photos/us75-hamilton-sorensen.webp");
  assert.deepEqual(photos.freight.map(photo => photo.src), ["assets/metro-photos/fort-crook-cornhusker.webp"]);
  assert.equal(photos.freight[0].caption.en, "Fort Crook Road · Bellevue");
  assert.deepEqual(photos.intersections.map(photo => photo.src), ["assets/metro-photos/90th-west-dodge.webp", "assets/metro-photos/west-broadway-north16th.webp"]);
  assert.match(photos.multimodal[0].caption.en, /^Bob Kerrey Pedestrian Bridge/);
  assert.match(photos.multimodal[0].alt.en, /Bob Kerrey Pedestrian Bridge/);
  for (const photo of Object.values(photos).flat()) {
    const bytes = readFileSync(new URL(`../../public/${photo.src}`, import.meta.url));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    assert.ok(bytes.length < 300000);
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunk = bytes.toString("ascii", offset, offset + 4);
      assert.ok(chunk !== "EXIF" && chunk !== "XMP ");
      const length = bytes.readUInt32LE(offset + 4);
      offset += 8 + length + (length % 2);
    }
    for (const language of ["en", "es"]) {
      assert.ok(photo.alt[language]);
      assert.ok(photo.caption[language]);
    }
  }
});
