import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePreferences } from "./Preferences";
import InsightCards from "./InsightCards";
import IntersectionDetails from "./IntersectionDetails";

export default function IntersectionPopupPanel({ features = [], index = 0, loading = false, error = "", onIndexChange, onClear, contextCards = [] }) {
  const { language } = usePreferences();
  const panel = useRef(null);
  const selected = features[index];
  const label = language === "es" ? "Detalles de la intersección" : "Intersection details";
  useEffect(() => {
    if (panel.current) panel.current.scrollTop=0;
  }, [selected]);
  return <aside ref={panel} className="intersection-popup-panel" translate="yes" aria-label={label} aria-busy={loading}>
    <div className="intersection-popup-heading">
      <h4>{label}</h4>
      {features.length ? <button type="button" className="icon-button" onClick={onClear}
        aria-label={language === "es" ? "Borrar selección" : "Clear selection"} title={language === "es" ? "Borrar selección" : "Clear selection"}><X size={18}/></button> : null}
    </div>
    {loading ? <p role="status">{language === "es" ? "Cargando detalles…" : "Loading details…"}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {selected ? <>
      {features.length > 1 ? <nav className="intersection-popup-pagination" aria-label={language === "es" ? "Intersecciones seleccionadas" : "Selected intersections"}>
        <button type="button" className="icon-button" disabled={!index} onClick={() => onIndexChange(index - 1)}
          aria-label={language === "es" ? "Intersección anterior" : "Previous intersection"} title={language === "es" ? "Intersección anterior" : "Previous intersection"}><ChevronLeft size={18}/></button>
        <span>{index + 1} / {features.length}</span>
        <button type="button" className="icon-button" disabled={index === features.length - 1} onClick={() => onIndexChange(index + 1)}
          aria-label={language === "es" ? "Siguiente intersección" : "Next intersection"} title={language === "es" ? "Siguiente intersección" : "Next intersection"}><ChevronRight size={18}/></button>
      </nav> : null}
      <IntersectionDetails key={`${selected.attributes.OBJECTID ?? index}-${language}`} attributes={selected.attributes} language={language}/>
    </> : !loading && !error ? <>
      <p className="source-note" role="status">{language === "es" ? "Ninguna intersección seleccionada." : "No intersection selected."}</p>
      {contextCards.length ? <InsightCards cards={contextCards}/> : null}
    </> : null}
  </aside>;
}
