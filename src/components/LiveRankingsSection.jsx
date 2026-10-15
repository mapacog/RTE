import { translateText } from "../utils/localization.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Map, ListOrdered } from "lucide-react";
import { loadTrafficLocations, rankLocations, trafficLayers, trafficYear } from "../services/trafficRankings";
import SectionHeader from "./SectionHeader";
import FilterBar from "./FilterBar";
import RankingTable from "./RankingTable";
import DetailCard from "./DetailCard";
import MobileFilterDrawer, { MobileFilterButton } from "./MobileFilterDrawer";
import { usePreferences } from "./Preferences";
import ReportDownload from "./ReportDownload";
import InsightCards from "./InsightCards";
import MapExplorer from "./MapExplorer";
import sources from "../data/visualSources.json";
import narratives from "../data/rankingNarratives";
import { interchangeMapInsights } from "../utils/interchangeMapInsights";
import RetainedView, { useViewActive } from "./RetainedView";

const pageSize = 25;

export default function LiveRankingsSection({ kind, navigation }) {
  const { t, language } = usePreferences();
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [scope, setScope] = useState("regional");
  const [jurisdiction, setJurisdiction] = useState("");
  const [limit, setLimit] = useState("10");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selectionVersion,setSelectionVersion]=useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState(() => window.location.hash.endsWith("/rankings") ? "Rankings" : "Maps");
  const rankingActive=useViewActive() && view==="Rankings";
  useEffect(()=>{
    if(rankingActive){setLimit("10");setPage(0);setSelectedId(null);setSelectionVersion(0);}
  },[rankingActive]);
  const [mapId, setMapId] = useState(kind === "intersections" ? "845151efd8a9408289ceef59d5c76790" : "f01dec2d7e4747999db5027c64d323de");
  const detailPanel = useRef(null);
  const config = trafficLayers[kind];
  const mapSummaryId = `${kind}-map-summary`;
  const rankingSummaryId = `${kind}-ranking-summary`;
  useEffect(() => { if (navigation?.topic === "rankings") setView("Rankings"); }, [navigation]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading"); setError("");
    loadTrafficLocations(kind, { signal: controller.signal }).then(rows => {
      if (controller.signal.aborted) return;
      setData(rows); setPage(0); setSelectedId(null); setSelectionVersion(0); setStatus("ready");
    }).catch(cause => {
      if (controller.signal.aborted) return;
      setError(cause.name === "AbortError" ? "The traffic service took too long to respond." : cause.message);
      setStatus("error");
    });
    return () => controller.abort();
  }, [kind, reload]);

  const jurisdictions = useMemo(() => scope === "regional" ? [] :
    [...new Set(data.map(row => row[scope]).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [data, scope]);
  const ranked = useMemo(() => rankLocations(data, scope, jurisdiction), [data, scope, jurisdiction]);
  const limited = useMemo(() => limit === "all" ? ranked : ranked.slice(0, Number(limit)), [ranked, limit]);
  const pages = Math.max(1, Math.ceil(limited.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visibleRows = limited.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const selected = limited.find(row => row.id === selectedId) ?? visibleRows[0] ?? null;
  const locale = scope === "regional" ? "Region" : jurisdiction || (scope === "city" ? "Choose a city" : "Choose a county");
  const reset = () => { setPage(0); setSelectedId(null); setSelectionVersion(0); };
  const rankingFilter = useMemo(() => ({kind, rows: limited, scope, jurisdiction, limit, locale}), [kind, limited, scope, jurisdiction, limit, locale]);
  const selectLocation = objectId => {
    const index = limited.findIndex(row => row.objectId === objectId);
    if (index < 0) return;
    setSelectedId(limited[index].id);
    setSelectionVersion(0);
    setPage(Math.floor(index / pageSize));
  };
  const insightCards = useMemo(() => {
    const rows = ranked;
    if (!rows.length) return [];
    const first = rows[0];
    const format = number => new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", { maximumFractionDigits: 0 }).format(number);
    const top = rows.slice(0, 50);
    const omaha = top.filter(row => row.city?.trim().toLowerCase() === "omaha").length;
    const countyLeaders = [...new Set(rows.map(row => row.county).filter(Boolean))]
      .map(county => rows.find(row => row.county === county)).sort((a,b)=>b.aadt-a.aadt).slice(0,3)
      .map(row=>({label:row.county,value:row.name}));
    return [
      { title: language === "es" ? "Ubicación más transitada" : translateText("Busiest location",language), text: `${first.name} · ${format(first.aadt)} ${language === "es" ? "vehículos por día en promedio" : translateText("vehicles per day on average",language)} · 2025` },
      { title: language === "es" ? "Actividad local" : translateText("Where traffic concentrates",language), text: scope === "regional"
        ? (language === "es" ? `${omaha} de las ${top.length} ubicaciones principales están identificadas en Omaha.` : translateText(`${omaha} of the top ${top.length} locations are identified in Omaha.`,language))
        : (language === "es" ? `${ranked.length} ubicaciones con volúmenes reportados en ${jurisdiction}.` : translateText(`${ranked.length} locations with reported volumes in ${jurisdiction}.`,language)), context: narratives[kind][scope === "regional" ? "regional" : "local"] },
      ...(countyLeaders.length ? [{ title: language === "es" ? "Líderes por condado" : translateText("County leaders",language), items: countyLeaders }] : []),
    ];
  }, [ranked, scope, jurisdiction, language, kind]);
  const rankingMapId = kind === "intersections" ? "9d5d2824442b453abfbfcd95f2e8421b" : "f01dec2d7e4747999db5027c64d323de";
  const mapCards = useMemo(() => kind === "interchanges" ? interchangeMapInsights(data, language) : [], [data, language, kind]);
  const mapIds = kind === "intersections" ? ["845151efd8a9408289ceef59d5c76790", rankingMapId] : [rankingMapId];
  const filters = [
    { id: `${kind}-scope`, label: "Rank within", value: scope, onChange: value => {
      setScope(value); setJurisdiction(""); reset();
    }, options: [{ value: "regional", label: "Region" }, { value: "county", label: "County" }, { value: "city", label: "City" }] },
    ...(scope === "regional" ? [] : [{ id: `${kind}-jurisdiction`, label: scope === "city" ? "City" : "County", value: jurisdiction,
      onChange: value => { setJurisdiction(value); reset(); },
      options: [{ value: "", label: scope === "city" ? "Choose a city" : "Choose a county" },
        ...jurisdictions.map(value => ({ value, label: value }))] }]),
    { id: `${kind}-limit`, label: "Show", value: limit, onChange: value => { setLimit(value); reset(); },
      options: [{ value: "10", label: "Top 10" }, { value: "50", label: "Top 50" },
        { value: "500", label: "Top 500" }, { value: "all", label: "All locations" }] },
  ];

  return (
    <section className={`section-wrap live-rankings ${view==="Rankings"?"rankings-table-view":"rankings-map-view"}`} id={kind} aria-busy={status === "loading"}>
      <SectionHeader eyebrow={`2025 / ${language === "es" ? "Tráfico diario promedio" : translateText("Average daily traffic",language)}`} title={t(`Top ${config.label}`)}
        action={<div className="section-downloads"><ReportDownload report={kind}/>{view === "Rankings"?<MobileFilterButton onClick={() => setDrawerOpen(true)} />:null}</div>}>
        {language === "es" ? "Las ubicaciones más transitadas de su ciudad, condado o región." : translateText("The busiest locations in your city, county, or the region.",language)}
      </SectionHeader>
      <div className="workspace-tabs ranking-view-tabs" role="tablist" aria-label={t("Explore")}>
        {[["Maps",Map],["Rankings",ListOrdered]].map(([name,Icon])=><button key={name} type="button" id={`tab-${kind}-${name}`} role="tab" aria-selected={view===name} tabIndex={view===name?0:-1} aria-controls={`panel-${kind}`} onClick={()=>setView(name)} onKeyDown={event=>{
          if(["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){event.preventDefault();const next=event.key==="Home"?"Maps":event.key==="End"?"Rankings":name==="Maps"?"Rankings":"Maps";setView(next);document.getElementById(`tab-${kind}-${next}`)?.focus();}
        }}><Icon size={19} aria-hidden="true"/>{t(name)}</button>)}
      </div>
      <div role="tabpanel" id={`panel-${kind}`} aria-labelledby={`tab-${kind}-${view}`}>
      <RetainedView active={view === "Maps"}>
        <p id={mapSummaryId} className="section-intro" tabIndex={-1}>{language==="es"?"Tráfico regional en 2025. Los volúmenes representan el promedio diario anual de vehículos.":translateText("Regional traffic in 2025. Volumes represent annual average daily vehicles.",language)}</p>
        <div className={kind === "intersections" ? "ranking-maps-layout" : ""}>
          {kind === "intersections" ? <>
            <nav className="report-contents ranking-map-contents" aria-label={language === "es" ? "Vistas de intersecciones" : translateText("Intersection map views",language)}>
              {mapIds.map((id,index)=><button key={id} type="button" aria-current={mapId===id?"true":undefined} onClick={()=>setMapId(id)}>
                <span className="topic-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
                <span>{id===mapIds[0]?(language==="es"?"Mapa de calor de intersecciones":translateText("Intersection Heat Map",language)):(language==="es"?"Clasificación regional de intersecciones":translateText("Regional intersection ranking",language))}</span>
              </button>)}
            </nav>
            <label className="field ranking-mobile-map-picker"><span>{t("Web map")}</span><select aria-label={t("Web map")} value={mapId} onChange={event=>setMapId(event.target.value)}>
              {mapIds.map(id=><option key={id} value={id}>{id===mapIds[0]?(language==="es"?"Mapa de calor de intersecciones":translateText("Intersection Heat Map",language)):(language==="es"?"Clasificación regional de intersecciones":translateText("Regional intersection ranking",language))}</option>)}
            </select></label>
          </>:null}
          <div className={kind === "intersections" ? "ranking-map-content" : ""}>
            {mapIds.map(id => <RetainedView key={id} active={mapId === id}>
              <MapExplorer sources={{...sources,maps:sources.maps.filter(map=>map.id===id)}} initialMapId={id} contextCards={mapCards} summaryId={mapSummaryId} popupInSidePanel={kind==="intersections" && id===rankingMapId}/>
            </RetainedView>)}
          </div>
        </div>
      </RetainedView>
      <RetainedView active={view === "Rankings"}>
      <div className="desktop-filter-row"><FilterBar filters={filters} /></div>
      <MobileFilterDrawer open={drawerOpen} title={`${config.label} filters`} onClose={() => setDrawerOpen(false)}>
        <FilterBar filters={filters} />
      </MobileFilterDrawer>
      {status === "ready" && insightCards.length ? <div className="ranking-insights ranking-highlights"><InsightCards cards={insightCards}/></div> : null}
      <div className="live-ranking-summary">
        <p role="status" id={rankingSummaryId} tabIndex={-1}>{status === "ready" ? `${locale} · ${ranked.length.toLocaleString()} ranked locations · ${trafficYear} AADT` : "Live MAPA traffic service"}</p>
        <button type="button" className="ranking-refresh" onClick={() => setReload(value => value + 1)}
          disabled={status === "loading"} aria-label={`Refresh ${config.label.toLowerCase()}`} title="Refresh live traffic data">
          <RefreshCw size={18} aria-hidden="true" />
        </button>
      </div>
      {status === "loading" ? <div className="ranking-state" role="status">Loading live {config.label.toLowerCase()}…</div> : null}
      {status === "error" ? <div className="ranking-state" role="alert">
        <h3>{t("Traffic data unavailable")}</h3><p>{error}</p>
        <button type="button" className="button-secondary" onClick={() => setReload(value => value + 1)}>{t("Retry")}</button>
      </div> : null}
      {status === "ready" ? <>
        <div className="ranking-two-column">
        <div className="ranking-table-column">
        <RankingTable rows={visibleRows} selectedId={selected?.id} onSelect={row => {
          setSelectedId(row.id);setSelectionVersion(value=>value+1);detailPanel.current?.scrollTo({top:0,behavior:"auto"});
        }}
          title={`${config.label}: ${locale}, ${trafficYear}`} showCounty showCity
          emptyMessage={scope !== "regional" && !jurisdiction ? `Select a ${scope} to see its rankings.` : "No locations with reported 2025 traffic volumes match this selection."} />
        {limited.length > pageSize ? <nav className="ranking-pagination" aria-label={`${config.label} table pages`}>
          <button type="button" onClick={() => {setPage(currentPage - 1);setSelectedId(null);setSelectionVersion(0);}} disabled={!currentPage} aria-label="Previous page" title="Previous page"><ChevronLeft size={20} /></button>
          <span>Page {currentPage + 1} of {pages} · Ranks {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, limited.length)}</span>
          <button type="button" onClick={() => {setPage(currentPage + 1);setSelectedId(null);setSelectionVersion(0);}} disabled={currentPage === pages - 1} aria-label="Next page" title="Next page"><ChevronRight size={20} /></button>
        </nav> : null}
        </div>
        <aside ref={detailPanel} className="ranking-detail-column" aria-label={language==="es"?"Mapa y detalles de la ubicación":translateText("Map and location details",language)}>
          <MapExplorer sources={{...sources,maps:sources.maps.filter(map=>map.id===rankingMapId)}} initialMapId={rankingMapId}
            rankingFilter={rankingFilter} selectedObjectId={selected?.objectId} selectionVersion={selectionVersion} onLocationSelect={selectLocation} summaryId={rankingSummaryId}/>
          {selected?<DetailCard item={selected} label={`Selected ${kind === "intersections" ? "intersection" : "interchange"} / ${locale} / ${trafficYear}`} />:null}
        </aside>
        </div>
        <p className="source-note live-ranking-source">{language === "es" ? "AADT: promedio diario anual de vehículos. Datos:" : translateText("AADT: annual average daily vehicles. Data:",language)} <a href={config.url} target="_blank" rel="noreferrer">MAPA</a>.</p>
      </> : null}
      </RetainedView>
      </div>
    </section>
  );
}
