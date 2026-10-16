import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";
import { loadTransitStops, rankTransitStops } from "../services/transitRankings";
import { languageLocale } from "../utils/localization";
import { usePreferences } from "./Preferences";
import MapExplorer from "./MapExplorer";
import sources from "../data/visualSources.json";
import { aggregateTransitStops } from "../utils/transitGroups";
import { useViewActive } from "./RetainedView";
import TransitMemberStops from "./TransitMemberStops";

const pageSize = 25;
const baseColumns = [["name","Location"],["county","County"],["boardings","Boardings"],["alightings","Alightings"],
  ["visits","Scheduled visits"],["days","Service days"]];
const changeColumns=[["name","Location"],["county","County"],["boardingsChange","Boarding change"],["alightingsChange","Alighting change"],
  ["visitsChange","Scheduled-visit change"]];

export default function TransitRankings({selectedMeasure,onMeasureChange}={}) {
  const { t, language } = usePreferences();
  const [data,setData] = useState([]), [status,setStatus] = useState("loading"), [error,setError] = useState("");
  const [reload,setReload] = useState(0), [county,setCounty] = useState(""), [limit,setLimit] = useState("10"), [query,setQuery] = useState("");
  const [page,setPage] = useState(0), [selectedId,setSelectedId] = useState(null);
  const [selectionVersion,setSelectionVersion]=useState(0);
  const [memberSelection,setMemberSelection]=useState(null);
  const active=useViewActive();
  useEffect(()=>{
    if(active){setLimit("10");setPage(0);setSelectedId(null);setSelectionVersion(0);setMemberSelection(null);}
  },[active]);
  const [localMeasure,setMeasure]=useState("activity");
  const measure=selectedMeasure ?? localMeasure;
  const columns=[...(measure==="change"?changeColumns:baseColumns),measure==="change"?["change","Change per 100 visits"]:["activity","Avg activity per 100 visits"]];
  useEffect(()=>{
    let cancelled=false;
    setStatus("loading");setError("");
    loadTransitStops({refresh:reload>0}).then(rows=>{if(!cancelled){setData(rows);setStatus("ready");}})
      .catch(cause=>{if(!cancelled){setError(cause.message);setStatus("error");}});
    return()=>{cancelled=true;};
  },[reload]);
  useEffect(()=>{setPage(0);setSelectedId(null);setSelectionVersion(0);setMemberSelection(null);},[county,limit,query,measure,reload]);
  const counties=useMemo(()=>[...new Set(data.map(row=>row.county).filter(Boolean))].sort(),[data]);
  const grouped=useMemo(()=>aggregateTransitStops(data),[data]);
  const ranked=useMemo(()=>rankTransitStops(grouped,{county,measure}),[grouped,county,measure]);
  const rows=useMemo(()=>{
    const result=(limit==="all"?ranked:ranked.slice(0,Number(limit)));
    return result.filter(row=>`${row.name} ${row.members.map(member=>`${member.name} ${member.code}`).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  },[ranked,limit,query]);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize)), currentPage=Math.min(page,pages-1);
  const visible=rows.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  const selected=rows.find(row=>row.objectIds.includes(selectedId)) || visible[0];
  const number=(value,decimal=false)=>value===null || value===undefined?t("Not reported"):typeof value==="string"?value:
    new Intl.NumberFormat(languageLocale(language),{maximumFractionDigits:decimal?1:0}).format(value);
  const signed=value=>value==null?t("Not reported"):Array.isArray(value)?t("{0} to {1}").replace("{0}",signed(value[0])).replace("{1}",signed(value[1])):new Intl.NumberFormat(languageLocale(language),{maximumFractionDigits:1,signDisplay:"exceptZero"}).format(value);
  const serviceLabel=row=>row.service==="Metro"?t("Fixed Route Bus"):row.service || t("Not reported");
  const rankingFilter=useMemo(()=>({kind:"transit",rows,scope:county?"county":"regional",jurisdiction:county,locale:county || "Region",limit,measure}),[rows,county,limit,measure]);
  const select=(objectId,source="map")=>{
    const index=rows.findIndex(row=>row.objectIds.includes(objectId));
    if(index>=0){
      setSelectedId(objectId);
      setMemberSelection(source!=="table" && rows[index].members.length>1?{objectId}:null);
      setSelectionVersion(value=>source==="table" || source==="member"?value+1:0);
      setPage(Math.floor(index/pageSize));
    }
  };
  const download=()=>{
    const escape=value=>{
      const text=String(value??"");
      const safe=typeof value==="string" && /^[=+\-@\t\r]/.test(text)?`'${text}`:text;
      return `"${safe.replaceAll('"','""')}"`;
    };
    const csv=[["Rank",...columns.map(([,label])=>label)],...rows.map(row=>[row.rank,...columns.map(([key])=>Array.isArray(row[key])?signed(row[key]):row[key])])]
      .map(row=>row.map(escape).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=measure==="change"?"metro-orbt-stop-changes-april-2022-2025.csv":"metro-orbt-stop-rankings-april-2025.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="transit-rankings" aria-busy={status==="loading"}>
    <div className="workspace-toolbar transit-filter-toolbar">
      <label className="field"><span>{t("Ranking measure")}</span><select aria-label={t("Ranking measure")} value={measure} onChange={event=>{setMeasure(event.target.value);onMeasureChange?.(event.target.value);}}>
        <option value="activity">{t("April 2025 average productivity")}</option><option value="change">{t("Change since April 2022")}</option>
      </select></label>
      <label className="field"><span>{t("County")}</span><select value={county} onChange={event=>setCounty(event.target.value)}><option value="">{t("All")}</option>{counties.map(name=><option key={name}>{name}</option>)}</select></label>
      <label className="field"><span>{t("Show")}</span><select value={limit} onChange={event=>setLimit(event.target.value)}>{["10","50","500","all"].map(value=><option key={value} value={value}>{t(value==="all"?"All locations":`Top ${value}`)}</option>)}</select></label>
      <label className="field"><span>{t("Search table")}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <button className="icon-button" type="button" title={t("Download CSV")} aria-label={t("Download CSV")} disabled={status!=="ready" || !rows.length} onClick={download}><Download size={18}/></button>
      <button className="icon-button" type="button" title={t("Refresh")} aria-label={t("Refresh")} disabled={status==="loading"} onClick={()=>setReload(value=>value+1)}><RefreshCw size={18}/></button>
    </div>
    <p className="transit-ranking-summary" id="transit-ranking-summary" tabIndex={-1}>{t("Metro and ORBT stops")} · {measure==="change"?"April 2022–April 2025":t("April 2025")} · {number(rows.length)} {t("locations")}</p>
    {measure==="change"?<p className="source-note">{t("All changes are April 2025 minus April 2022. Only locations with valid data in both periods are compared.")}</p>:null}
    {status==="loading"?<p role="status">{t("Loading")}</p>:status==="error"?<div role="alert"><p>{error}</p><button type="button" className="button-secondary" onClick={()=>setReload(value=>value+1)}>{t("Retry")}</button></div>:
      <div className="transit-ranking-layout">
        <div>
          <div className="interactive-table-scroll"><table className="interactive-report-table transit-ranking-table">
            <colgroup>{(measure==="change"?[6,27,15,12,12,12,16]:[5,26,14,10,10,11,9,15]).map((width,index)=><col key={index} style={{width:`${width}%`}}/>)}</colgroup>
            <caption className="sr-only">{t("Metro and ORBT stop rankings")}</caption>
            <thead><tr><th scope="col">{t("Rank")}</th>{columns.map(([key,label])=><th scope="col" key={key}>{t(label)}</th>)}</tr></thead>
            <tbody>{visible.map(row=><tr key={row.objectId} className={row.objectId===selected?.objectId?"selected-row":""}>
              <td>#{row.rank}</td>{columns.map(([key])=><td key={key}>{key==="name"?<button type="button" className="transit-stop-button" onClick={()=>select(row.objectId,"table")} aria-pressed={row.objectId===selected?.objectId}>{row.name}<small>{row.members.length>1?`${row.members.length} ${t("stops")}`:`${t("Stop")} ${row.code}`} · {serviceLabel(row)}</small></button>:
                key==="county"?row.county || t("Not reported"):measure==="change"?signed(row[key]):number(row[key],key==="activity")}</td>)}
            </tr>)}</tbody>
          </table></div>
          {!rows.length?<p role="status">{t("No ranked locations")}</p>:null}
          {pages>1?<nav className="ranking-pagination" aria-label={t("Table pages")}>
            <button type="button" title={t("Previous page")} aria-label={t("Previous page")} disabled={!currentPage} onClick={()=>{setPage(currentPage-1);setSelectedId(null);setSelectionVersion(0);setMemberSelection(null);}}><ChevronLeft size={20}/></button>
            <span>{currentPage+1} / {pages}</span>
            <button type="button" title={t("Next page")} aria-label={t("Next page")} disabled={currentPage===pages-1} onClick={()=>{setPage(currentPage+1);setSelectedId(null);setSelectionVersion(0);setMemberSelection(null);}}><ChevronRight size={20}/></button>
          </nav>:null}
        </div>
        <aside className="transit-ranking-detail" aria-label={t("Selected stop")}>
          <MapExplorer sources={{maps:sources.maps.filter(map=>map.id==="transit-rankings")}} rankingFilter={rankingFilter}
            selectedObjectId={memberSelection && selected?.objectIds.includes(memberSelection.objectId)?[memberSelection.objectId]:selected?.objectIds}
            selectedLabelGroupId={selectedId!==null && selected?.members.length>1?selected.objectId:null}
            selectionVersion={selectionVersion} onLocationSelect={select} summaryId="transit-ranking-summary" disablePopup/>
          {selected?<div className="transit-stop-detail"><h4>{selected.name}</h4><p>#{selected.rank} · {selected.county} · {serviceLabel(selected)}</p>
            <strong>{measure==="change"?signed(selected.change):number(selected.activity,true)}</strong><p>{t(measure==="change"?"Change per 100 visits":"Avg activity per 100 visits")}</p>
            <dl>{(measure==="change"?changeColumns:baseColumns).slice(2).map(([key,label])=><div key={key}><dt>{t(label)}</dt><dd>{measure==="change"?signed(selected[key]):number(selected[key])}</dd></div>)}
              {measure==="change"?<><div><dt>{t("2022 activity per 100 scheduled visits")}</dt><dd>{number(selected.baselineActivity,true)}</dd></div><div><dt>{t("2022 scheduled visits")}</dt><dd>{number(selected.baselineVisits)}</dd></div><div><dt>{t("2025 activity per 100 scheduled visits")}</dt><dd>{number(selected.activity,true)}</dd></div><div><dt>{t("2025 scheduled visits")}</dt><dd>{number(selected.visits)}</dd></div></>:null}
            </dl>
            {selected.members.length>1?<TransitMemberStops group={selected} measure={measure} selection={memberSelection}
              onSelect={id=>select(id,"member")} columns={(measure==="change"?changeColumns:baseColumns).slice(2)} number={number} signed={signed}/>:null}
          </div>:null}
        </aside>
      </div>}
    <p className="source-note">{t("Passenger activity = boardings + alightings. Rankings use activity per 100 scheduled visits, not unique riders.")}</p>
  </div>;
}
