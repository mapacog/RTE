import { useEffect,useRef,useState } from "react";
import { ExternalLink, LockKeyhole, MousePointer2 } from "lucide-react";
import { usePreferences } from "./Preferences";
import InsightCards from "./InsightCards";
import insights from "../data/reportInsights.json";
import { configureMapPopups } from "../services/mapPopups";
import popupStyles from "../styles/popups.css?inline";

let sdkPromise;
function loadMapSdk() {
  if(!sdkPromise) sdkPromise=new Promise((resolve,reject)=>{
    const script=document.createElement("script");script.type="module";script.src="https://js.arcgis.com/5.1/";
    const timer=setTimeout(()=>{script.remove();sdkPromise=null;reject(new Error("The map library took too long to load."));},45000);
    script.onload=()=>{clearTimeout(timer);resolve();};
    script.onerror=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(new Error("The map library could not be loaded."));};
    document.head.append(script);
  });
  return sdkPromise;
}

export default function MapExplorer({ sources, initialComparison, initialMapId, contextCards = [], summaryId = "chapter-summary", onComparisonChange }) {
  const { t,language }=usePreferences();
  const popupLanguage=useRef(language);
  popupLanguage.current=language;
  const [maps,setMaps]=useState(sources.maps);
  const [id,setId]=useState(initialMapId || sources.maps[0].id);
  const [status,setStatus]=useState("loading");
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const host=useRef(null);
  const mapElement=useRef(null);
  const [comparisonViews,setComparisonViews]=useState([]);
  const [comparisonId,setComparisonId]=useState("");
  const [active,setActive]=useState(false);
  const activation=useRef(null);
  const pointerType=useRef("mouse");
  const map=maps.find(item=>item.id===id) || sources.maps[0];
  const comparison=comparisonViews.find(view=>view.id===comparisonId);
  const activeCards=insights.contexts[comparison?.context] || insights.mapContexts[id] || contextCards;
  const activate=()=>{setActive(true);requestAnimationFrame(()=>host.current?.focus());};
  const deactivate=()=>{setActive(false);requestAnimationFrame(()=>activation.current?.focus());};
  useEffect(()=>{
    const popup=mapElement.current?.querySelector('arcgis-popup[slot="popup"]');
    if(popup)popup.open=false;
  },[language]);
  useEffect(()=>{
    const selected=comparisonViews.find(view=>view.title.includes(initialComparison || "Traffic Analysis District"));
    if(!selected)return;
    setComparisonId(selected.id);
    const popup=mapElement.current?.querySelector('arcgis-popup[slot="popup"]');
    if(popup)popup.open=false;
    mapElement.current?.map.allLayers.forEach(layer=>{
      if(comparisonViews.some(view=>view.id===layer.id))layer.visible=layer.id===selected.id;
    });
  },[initialComparison,comparisonViews]);
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({f:"json",q:`group:${sources.group} AND type:"Web Map"`,num:"100"});
    fetch(`https://www.arcgis.com/sharing/rest/search?${params}`,{signal:controller.signal}).then(r=>r.json()).then(result=>{
      if(result.results?.length)setMaps(result.results.filter(item=>sources.maps.some(map=>map.id===item.id)).map(item=>({id:item.id,title:item.title})).sort((a,b)=>a.title.localeCompare(b.title)));
    }).catch(()=>{});
    return()=>controller.abort();
  },[sources.group]);
  useEffect(()=>{
    let cancelled=false,element,timer,initialization,resizeObserver,resizeFrame;
    setStatus("loading");setError("");setComparisonViews([]);setComparisonId("");setActive(false);
    timer=setTimeout(()=>{if(!cancelled){setStatus("error");setError("The web map took too long to respond.");}},60000);
    (async()=>{
      await loadMapSdk();
      await customElements.whenDefined("arcgis-map");
      if(cancelled)return;
      element=document.createElement("arcgis-map");
      // Let initialization finish before disposing a map during fast navigation.
      element.autoDestroyDisabled=true;
      element.setAttribute("item-id",id);element.setAttribute("aria-label",map.title);
      element.setAttribute("popup-component-enabled","");
      const popup=document.createElement("arcgis-popup");popup.setAttribute("slot","popup");element.append(popup);
      const zoom=document.createElement("arcgis-zoom");zoom.setAttribute("slot","top-left");element.append(zoom);
      for(const name of ["layer-list","legend"]){
        const expand=document.createElement("arcgis-expand");expand.setAttribute("slot","top-right");
        const control=document.createElement(`arcgis-${name}`);expand.append(control);element.append(expand);
      }
      host.current.append(element);
      initialization=element.componentOnReady();
      await initialization;
      if(cancelled)return;
      await element.viewOnReady();
      if(cancelled)return;
      await popup.componentOnReady();
      popup.dockOptions={position:"bottom-right",breakpoint:{width:600},buttonEnabled:true};
      popup.dockEnabled=true;
      if(!cancelled){
        mapElement.current=element;
        await configureMapPopups(element.map,()=>popupLanguage.current,()=>cancelled,popupStyles);
        if(cancelled)return;
        if(id==="db0cf9c83aaa4a3995b98daa8f5bd798"){
          const candidates=element.map.allLayers.toArray().filter(layer=>
            /Traffic Analysis District|2025 Average Daily|Estimated Percent Change in VMT|Regional Percent Change in VMT/.test(layer.title));
          const order=["Traffic Analysis District","2025 Average Daily","Estimated Percent Change","Regional Percent Change"];
          candidates.sort((a,b)=>order.findIndex(title=>a.title.includes(title))-order.findIndex(title=>b.title.includes(title)));
          const first=candidates.find(layer=>layer.title.includes(initialComparison || "Traffic Analysis District")) || candidates[0];
          candidates.forEach(layer=>{layer.visible=layer.id===first?.id;});
          const boundaries=candidates.find(layer=>layer.title==="Traffic Analysis District");
          if(boundaries){
            await boundaries.load();
            if(cancelled)return;
            if(boundaries.fullExtent){
              const extent=boundaries.fullExtent.expand(1.08);
              await element.view.goTo(extent,{animate:false});
              resizeObserver=new ResizeObserver(()=>{
                cancelAnimationFrame(resizeFrame);
                resizeFrame=requestAnimationFrame(()=>{
                  if(!cancelled)element.view.goTo(extent,{animate:false}).catch(()=>{});
                });
              });
              resizeObserver.observe(host.current);
            }
          }
          const contexts=["districts","daily-vmt","district-change","change-vmt"];
          setComparisonViews(candidates.map(layer=>({id:layer.id,title:layer.title,context:contexts[order.findIndex(title=>layer.title.includes(title))]})));
          setComparisonId(first?.id || "");
        }
        clearTimeout(timer);setStatus("ready");
      }
    })().catch(cause=>{if(!cancelled){clearTimeout(timer);setError(cause.message);setStatus("error");}});
    return()=>{
      cancelled=true;clearTimeout(timer);mapElement.current=null;
      resizeObserver?.disconnect();cancelAnimationFrame(resizeFrame);
      if(element){
        element.remove();
        initialization.then(()=>element.destroy(),()=>element.destroy()).catch(()=>{});
      }
    };
  },[id,retry]);
  return <div className="map-explorer">
    <div className="workspace-toolbar">
      {maps.length>1?<label className="field"><span>{t("Web map")}</span><select aria-label={t("Web map")} value={id} onChange={e=>setId(e.target.value)}>
        {maps.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}
      </select></label>:null}
      {comparisonViews.length?<label className="field"><span>{language==="es"?"Vista de comparación":"Comparison view"}</span>
        <select aria-label={language==="es"?"Vista de comparación":"Comparison view"} value={comparisonId} onChange={e=>{
          setComparisonId(e.target.value);
          mapElement.current?.map.allLayers.forEach(layer=>{
            if(comparisonViews.some(view=>view.id===layer.id))layer.visible=layer.id===e.target.value;
          });
          const selected=comparisonViews.find(view=>view.id===e.target.value);
          if(selected?.context)onComparisonChange?.(selected.context);
        }}>{comparisonViews.map(view=><option key={view.id} value={view.id}>{view.title==="Traffic Analysis District"?t("Traffic Analysis Districts"):view.title}</option>)}</select>
      </label>:null}
      <a className="icon-button" title={t("Open map")} aria-label={t("Open map")} href={`https://www.arcgis.com/apps/mapviewer/index.html?webmap=${id}`} target="_blank" rel="noreferrer"><ExternalLink size={18} aria-hidden="true"/></a>
      {active?<button className="icon-button" type="button" title={t("Deactivate map")} aria-label={t("Deactivate map")} onClick={deactivate}><LockKeyhole size={18} aria-hidden="true"/></button>:null}
    </div>
    <div className={`map-content-layout ${activeCards.length?"":"map-only"}`}>
    <div className="live-map-shell" aria-busy={status==="loading"} onKeyDown={event=>{
      if(active&&event.key==="Escape"&&!event.defaultPrevented){event.preventDefault();deactivate();}
    }}>
      <div ref={host} className="live-map-host" role="region" aria-label={map.title} tabIndex={-1} inert={active?undefined:""} aria-hidden={!active} data-interactive={active} data-ready={status==="ready"}/>
      {status!=="ready"?<div className="map-status" role={status==="error"?"alert":"status"}>
        {status==="loading"?t("Loading"):t("View unavailable")}
        {error?<><p>{error}</p><button className="button-secondary" type="button" onClick={()=>setRetry(n=>n+1)}>{t("Retry")}</button></>:null}
      </div>:null}
      {status==="ready"&&!active?<button ref={activation} className="map-activation" type="button" aria-label={t("Activate map")}
        onPointerDown={event=>{pointerType.current=event.pointerType;}}
        onDoubleClick={activate} onClick={event=>{if(event.detail===0||pointerType.current==="touch")activate();}}>
        <span className="map-activation-label"><MousePointer2 size={19} aria-hidden="true"/><span className="map-desktop-hint">{language==="es"?"Doble clic para explorar":"Double-click to explore"}</span><span className="map-touch-hint">{language==="es"?"Toque para explorar":"Tap to explore"}</span></span>
      </button>:null}
    </div>
    <InsightCards cards={activeCards}/>
    </div>
    <a className="skip-map sr-only" href={`#${summaryId}`}>{language==="es"?"Saltar el mapa e ir al resumen":"Skip map and go to summary"}</a>
  </div>;
}
