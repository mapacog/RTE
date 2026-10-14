import { ArrowLeft } from "lucide-react";
import MapExplorer from "./MapExplorer";
import { usePreferences } from "./Preferences";
import sources from "../data/visualSources.json";

export default function FullMapView({ id, comparison }) {
  const { t } = usePreferences();
  const map = sources.maps.find(map => map.id === id);
  if (!map) return null;
  const title = comparison || map.title;
  const back = id === "db0cf9c83aaa4a3995b98daa8f5bd798" ? "#regional-patterns" :
    ["orbt","fixed-transit","9cb9e8555b954ac9abee3313f8ec7d8e","e2547ddd72254f2ab44c3b4302ebe8e2"].includes(id) ? "#multimodal/transit" :
      /Intersection/.test(map.title) ? "#intersections" : /Interchange/.test(map.title) ? "#interchanges" : "#Home";
  return <section className="full-map-view">
    <div className="full-map-heading"><a href={back} className="icon-button" title={t("Back")} aria-label={t("Back")}><ArrowLeft size={20}/></a><h1>{t(title)}</h1></div>
    <MapExplorer key={`${id}-${comparison}`} sources={{maps:[map]}} initialMapId={id} initialComparison={comparison} fullPage showOpenMap={false}
      popupInSidePanel={id==="9d5d2824442b453abfbfcd95f2e8421b"}/>
  </section>;
}
