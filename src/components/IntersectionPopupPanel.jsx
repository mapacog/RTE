import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePreferences } from "./Preferences";
import InsightCards from "./InsightCards";
import { authoredIntersectionGraphic } from "../services/intersectionSelection";

export default function IntersectionPopupPanel({ features = [], index = 0, loading = false, error = "", mapElement, onIndexChange, onClear, contextCards = [] }) {
  const { language } = usePreferences();
  const body = useRef(null);
  const panel = useRef(null);
  const [contentError,setContentError]=useState("");
  const [contentLoading,setContentLoading]=useState(false);
  const selected = features[index];
  const label = language === "es" ? "Detalles de la intersección" : "Intersection details";
  useEffect(() => {
    setContentError("");
    if(!selected){setContentLoading(false);return;}
    let cancelled=false,feature,ready;
    setContentLoading(true);
    (async()=>{
      await customElements.whenDefined("arcgis-feature");
      if(cancelled)return;
      feature=document.createElement("arcgis-feature");
      feature.autoDestroyDisabled=true;
      feature.lang=language;
      feature.headingLevel=4;
      feature.map=mapElement?.map;
      feature.spatialReference=mapElement?.view?.spatialReference;
      feature.graphic=authoredIntersectionGraphic(selected);
      body.current.replaceChildren(feature);
      panel.current.scrollTop=0;
      ready=feature.componentOnReady();
      await ready;
      if(!cancelled)setContentLoading(false);
    })().catch(()=>{
      if(!cancelled){setContentLoading(false);setContentError(language==="es"?"No se pudo cargar la ventana emergente.":"The web map popup could not be loaded.");}
    });
    return()=>{
      cancelled=true;
      if(feature){feature.remove();Promise.resolve(ready).then(()=>feature.destroy()).catch(()=>{});}
    };
  }, [selected, language, mapElement]);
  return <aside ref={panel} className="intersection-popup-panel" aria-label={label} aria-busy={loading || contentLoading}>
    <div className="intersection-popup-heading">
      <h4>{label}</h4>
      {features.length ? <button type="button" className="icon-button" onClick={onClear}
        aria-label={language === "es" ? "Borrar selección" : "Clear selection"} title={language === "es" ? "Borrar selección" : "Clear selection"}><X size={18}/></button> : null}
    </div>
    {loading || contentLoading ? <p role="status">{language === "es" ? "Cargando detalles…" : "Loading details…"}</p> : null}
    {error || contentError ? <p role="alert">{error || contentError}</p> : null}
    {selected ? <>
      {features.length > 1 ? <nav className="intersection-popup-pagination" aria-label={language === "es" ? "Intersecciones seleccionadas" : "Selected intersections"}>
        <button type="button" className="icon-button" disabled={!index} onClick={() => onIndexChange(index - 1)}
          aria-label={language === "es" ? "Intersección anterior" : "Previous intersection"} title={language === "es" ? "Intersección anterior" : "Previous intersection"}><ChevronLeft size={18}/></button>
        <span>{index + 1} / {features.length}</span>
        <button type="button" className="icon-button" disabled={index === features.length - 1} onClick={() => onIndexChange(index + 1)}
          aria-label={language === "es" ? "Siguiente intersección" : "Next intersection"} title={language === "es" ? "Siguiente intersección" : "Next intersection"}><ChevronRight size={18}/></button>
      </nav> : null}
      <div ref={body}/>
    </> : !loading && !error ? <>
      <p className="source-note" role="status">{language === "es" ? "Ninguna intersección seleccionada." : "No intersection selected."}</p>
      {contextCards.length ? <InsightCards cards={contextCards}/> : null}
    </> : null}
  </aside>;
}
