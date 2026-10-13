import { popupProfile } from "./mapPopups.js";

export const intersectionPopupSource = "c6f62728512144b3b05af7f27389d3f9";
let templatePromise;

function sourceTemplate(importSdk) {
  if (!templatePromise) {
    templatePromise = (async () => {
      const WebMap = await importSdk("@arcgis/core/WebMap.js");
      const source = new WebMap({ portalItem: { id: intersectionPopupSource } });
      try {
        await source.load();
        const layer = source.allLayers.toArray().find(item => popupProfile(item) === "intersection");
        if (!layer) throw new Error("The authored intersection popup layer could not be found.");
        await layer.load();
        if (!layer.popupTemplate?.content?.some(item => item.type === "expression")) {
          throw new Error("The source map's Arcade intersection popup is unavailable.");
        }
        return layer.popupTemplate.clone();
      } finally {
        source.destroy();
      }
    })().catch(error => { templatePromise = null; throw error; });
  }
  return templatePromise;
}

export async function applyIntersectionPopupTemplate(map, isCancelled = () => false, importSdk = path => window.$arcgis.import(path)) {
  const template = await sourceTemplate(importSdk);
  if (isCancelled()) return;
  for (const layer of map.allLayers.toArray()) {
    if (popupProfile(layer) !== "intersection") continue;
    const copy = template.clone();
    copy.outFields = ["*"];
    layer.popupTemplate = copy;
    layer.popupEnabled = true;
  }
}
