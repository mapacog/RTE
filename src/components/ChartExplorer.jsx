import { useEffect,useRef,useState } from "react";
import { ExternalLink, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { usePreferences,ListenButton } from "./Preferences";
import content from "../data/reportContent.json";
import InsightCards from "./InsightCards";
import insights from "../data/reportInsights.json";
import { chartLayout } from "../utils/chartLayout";

function PublishedChart({ chart }) {
  const { t,language }=usePreferences();
  const [loaded,setLoaded]=useState(false);
  const [failed,setFailed]=useState(false);
  const [version,setVersion]=useState(0);
  const [fullSize,setFullSize]=useState(false);
  const [width,setWidth]=useState(chart.width || 600);
  const shell=useRef(null);
  useEffect(()=>{
    const observer=new ResizeObserver(entries=>{
      const measured=entries[0].contentRect.width;
      if(measured>0)setWidth(measured);
    });
    observer.observe(shell.current);return()=>observer.disconnect();
  },[]);
  const {nativeWidth,nativeHeight,scale,width:frameWidth,height:frameHeight}=chartLayout(chart,width,fullSize);
  return <div className="published-chart-stage">
    <div ref={shell} className="published-chart-shell" aria-busy={!loaded} style={{height:Math.ceil(frameHeight)+2}}>
      {!loaded?<p role="status">{t("Loading")}…</p>:null}
      {failed?<p role="alert">{t("View unavailable")} <a href={chart.url} target="_blank" rel="noreferrer">{t("Open chart")}</a></p>:null}
      <div className={`published-chart-viewport${fullSize?" is-full-size":""}`} tabIndex={fullSize?0:undefined} role="region" aria-label={chart.title}>
        <div className="published-chart-frame" style={{width:frameWidth,height:frameHeight,marginInline:fullSize?0:"auto"}}>
          <iframe key={version} title={chart.title} src={chart.url} loading="lazy" style={{width:nativeWidth,height:nativeHeight,transform:`scale(${scale})`,transformOrigin:"top left"}} onLoad={()=>setLoaded(true)} onError={()=>{setFailed(true);setLoaded(true);}}/>
        </div>
      </div>
    </div>
    <div className="chart-source-links">
      <button className="icon-button" type="button" title={language==="es"?"Tamaño original":"Full size"} aria-label={language==="es"?"Tamaño original":"Full size"} aria-pressed={fullSize} onClick={()=>setFullSize(value=>!value)}>{fullSize?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
      <a className="icon-button" aria-label={t("Open chart")} title={t("Open chart")} href={chart.url} target="_blank" rel="noreferrer"><ExternalLink size={17}/></a>
      {failed?<button className="icon-button" type="button" title={t("Retry")} aria-label={t("Retry")} onClick={()=>{setLoaded(false);setFailed(false);setVersion(n=>n+1);}}><RefreshCw size={17}/></button>:null}
    </div>
  </div>;
}

export default function ChartExplorer({ charts, initialTheme, contextCards = [] }) {
  const { t,language }=usePreferences();
  const themes=[...new Set(charts.map(chart=>chart.theme))];
  const [theme,setTheme]=useState(initialTheme || themes[0]);
  const filtered=charts.filter(chart=>chart.theme===theme);
  const [id,setId]=useState(filtered[0].id);
  const chart=filtered.find(chart=>chart.id===id) || filtered[0];
  const activeCards=insights.chartContexts[chart.id] || contextCards;
  const sidebarCount=chart.sidebarCardCount || 1;
  const narrative=theme==="Regional travel"?(chart.id==="5"||chart.id==="14"?content.methodology:content.seasonal):theme==="Transit"?content.transit:theme==="Bike share & scooters"?content.shared:Number(chart.id)<=17?content.walking:content.strava;
  return <div>
    <div className="workspace-toolbar">
      {themes.length>1?<label className="field"><span>{t("Topic")}</span><select aria-label={t("Topic")} value={theme} onChange={e=>{setTheme(e.target.value);setId(charts.find(chart=>chart.theme===e.target.value).id);}}>
        {themes.map(value=><option key={value} value={value}>{t(value)}</option>)}
      </select></label>:null}
      <label className="field chart-selector"><span>{t("Chart")}</span><select aria-label={t("Chart")} value={chart.id} onChange={e=>setId(e.target.value)}>
        {filtered.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
    </div>
    <div className={`chart-detail-layout${chart.compactSidebar?" chart-sidebar-compact":""}`}>
      <PublishedChart chart={chart} key={chart.id}/>
      {activeCards.length?<InsightCards cards={activeCards.slice(0,sidebarCount)}/>:<div className="visual-context"><p>{narrative[language]}</p><ListenButton text={narrative[language]}/></div>}
      {activeCards.length>sidebarCount?<div className="chart-supporting-insights"><InsightCards cards={activeCards.slice(sidebarCount)}/></div>:null}
    </div>
  </div>;
}
