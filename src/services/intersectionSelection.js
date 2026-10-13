import { popupProfile } from "./mapPopups.js";

export function authoredIntersectionGraphic(selection) {
  const graphic = selection.graphic.clone();
  graphic.popupTemplate = selection.layer.popupTemplate || selection.graphic.popupTemplate;
  return graphic;
}

export async function fetchIntersectionSelection(mapElement, event) {
  const generator = await mapElement.fetchPopupFeatures(event.screenPoint || { x: event.x, y: event.y }, {
    pointerType: event.pointerType,
  });
  const selected = [], seen = new Set();
  for await (const graphic of generator) {
    const layer = graphic.layer || graphic.origin?.layer;
    if (!layer || popupProfile(layer) !== "intersection") continue;
    const attributes = graphic.attributes || {};
    const id = attributes[layer.objectIdField || "OBJECTID"];
    if (id != null && seen.has(id)) continue;
    if (id != null) seen.add(id);
    selected.push({ layer, attributes, graphic });
  }
  return selected;
}
