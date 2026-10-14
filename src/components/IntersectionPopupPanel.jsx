import { translateText } from "../utils/localization.js";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePreferences } from "./Preferences";
import InsightCards from "./InsightCards";
import IntersectionDetails from "./IntersectionDetails";

export default function IntersectionPopupPanel({ features = [], index = 0, loading = false, error = "", onIndexChange, onClear, contextCards = [] }) {
  const { language } = usePreferences();
  const panel = useRef(null);
  const selected = features[index];
  const label = language === "es" ? "Detalles de la intersección" : translateText("Intersection details",language);
  useEffect(() => {
    if (panel.current) panel.current.scrollTop=0;
  }, [selected]);
  return <aside ref={panel} className="intersection-popup-panel" translate="yes" aria-label={label} aria-busy={loading}>
    <div className="intersection-popup-heading">
      <h4>{label}</h4>
      {features.length ? <button type="button" className="icon-button" onClick={onClear}
        aria-label={language === "es" ? "Borrar selección" : translateText("Clear selection",language)} title={language === "es" ? "Borrar selección" : translateText("Clear selection",language)}><X size={18}/></button> : null}
    </div>
    {loading ? <p role="status">{language === "es" ? "Cargando detalles…" : translateText("Loading details…",language)}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {selected ? <>
      {features.length > 1 ? <nav className="intersection-popup-pagination" aria-label={language === "es" ? "Intersecciones seleccionadas" : translateText("Selected intersections",language)}>
        <button type="button" className="icon-button" disabled={!index} onClick={() => onIndexChange(index - 1)}
          aria-label={language === "es" ? "Intersección anterior" : translateText("Previous intersection",language)} title={language === "es" ? "Intersección anterior" : translateText("Previous intersection",language)}><ChevronLeft size={18}/></button>
        <span>{index + 1} / {features.length}</span>
        <button type="button" className="icon-button" disabled={index === features.length - 1} onClick={() => onIndexChange(index + 1)}
          aria-label={language === "es" ? "Siguiente intersección" : translateText("Next intersection",language)} title={language === "es" ? "Siguiente intersección" : translateText("Next intersection",language)}><ChevronRight size={18}/></button>
      </nav> : null}
      <IntersectionDetails key={`${selected.attributes.OBJECTID ?? index}-${language}`} attributes={selected.attributes} language={language}/>
    </> : !loading && !error ? <>
      <p className="source-note" role="status">{language === "es" ? "Ninguna intersección seleccionada." : translateText("No intersection selected.",language)}</p>
      {contextCards.length ? <InsightCards cards={contextCards}/> : null}
    </> : null}
  </aside>;
}
