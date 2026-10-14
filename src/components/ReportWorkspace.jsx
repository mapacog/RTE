import { useEffect,useState } from "react";
import { Map as MapIcon,ChartNoAxesCombined,Table2 } from "lucide-react";
import { usePreferences } from "./Preferences";
import MapExplorer from "./MapExplorer";
import ChartExplorer from "./ChartExplorer";
import InteractiveReportTable from "./InteractiveReportTable";
import sources from "../data/visualSources.json";
import content from "../data/reportContent";
import topics from "../data/reportTopics.json";
import insights from "../data/reportInsights";
import InsightCards, { RegionalHighlights } from "./InsightCards";
import ReportDownload from "./ReportDownload";
import RetainedView from "./RetainedView";

export function useReportTables() {
  const [tables,setTables]=useState([]);
  const [error,setError]=useState("");
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setError("");
    fetch(`${import.meta.env.BASE_URL}data/reportTables.json`,{signal:controller.signal}).then(response=>{
      if(!response.ok)throw new Error("The report table source could not be loaded.");return response.json();
    }).then(setTables).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
    return()=>controller.abort();
  },[reload]);
  return { tables,error,retry:()=>setReload(n=>n+1) };
}

export default function ReportWorkspace({ tables,error,retry,section = "regional",initialTopicId,onTopicChange }) {
  const { t,language }=usePreferences();
  const chapters=topics.filter(topic=>topic.section===section);
  const [topicId,setTopicId]=useState(initialTopicId || chapters[0].id);
  useEffect(()=>{setTopicId(initialTopicId || chapters[0].id);setRequestedView("");},[initialTopicId,section]);
  const topic=chapters.find(topic=>topic.id===topicId) || chapters[0];
  const availableViews=[...(topic.maps.length?["Maps"]:[]),...(topic.charts.length?["Charts"]:[]),...(topic.tables.length?["Tables"]:[])];
  const [requestedView,setRequestedView]=useState(availableViews[0]);
  const view=availableViews.includes(requestedView)?requestedView:availableViews[0];
  const selectTopic=(id,options)=>{setTopicId(id);setRequestedView("");onTopicChange?.(id,options);};
  const isRegional=section==="regional";
  const sectionId=isRegional?"regional-patterns":"multimodal";
  const icons={Maps:MapIcon,Charts:ChartNoAxesCombined,Tables:Table2};
  const contextCards=insights.contexts[topic.id] || insights.contexts[topic.id==="orbt"?"transit":topic.context] || [];
  const mapGroups = [...new Map(chapters.filter(item => item.maps.length).map(item => [item.maps.join(","), item.maps]))];
  const mapGroup = topic.maps.join(",");
  const summaryId = `chapter-summary-${section}`;
  return <section className="section-wrap topic-section" id={sectionId}>
    <div className="section-header"><div><p className="eyebrow">2022–2025</p><h2>{t(isRegional?"Regional traffic patterns":"Multimodal transportation")}</h2></div>
      <div className="section-downloads"><ReportDownload report="regional"/>{isRegional?<ReportDownload report="flow"/>:null}</div>
    </div>
    {isRegional?<RegionalHighlights/>:null}
    <div className="topic-layout">
      <nav className="report-contents" aria-label={t("Topics")}>
        {chapters.map((item,i)=><button key={item.id} type="button" aria-current={item.id===topic.id?"true":undefined} onClick={()=>selectTopic(item.id)}>
          <span className="topic-number" aria-hidden="true">{String(i+1).padStart(2,"0")}</span><span>{t(item.title)}</span>
        </button>)}
      </nav>
      <div className="topic-content">
        <label className="field mobile-topic-picker"><span className="sr-only">{t("Topic")}</span><select aria-label={t("Topic")} value={topic.id} onChange={e=>selectTopic(e.target.value)}>
          {chapters.map(item=><option key={item.id} value={item.id}>{t(item.title)}</option>)}
        </select></label>
        <h3 className="chapter-heading">{t(topic.title)}</h3>
        <p id={summaryId} tabIndex={-1} className="section-intro">{(view==="Charts"?insights.chartSummaries?.[topic.id]?.[language]:null) || insights.summaries[topic.id]?.[language] || content[topic.context][language]}</p>
        <div className="workspace-tabs" role="tablist" aria-label={t("Explore")}>
          {availableViews.map(name=>{const Icon=icons[name];const tabId=`tab-${section}-${name}`;return <button key={name} id={tabId} type="button" role="tab" aria-selected={view===name} aria-controls={`panel-${section}`} tabIndex={view===name?0:-1}
            onClick={()=>setRequestedView(name)} onKeyDown={e=>{
              const i=availableViews.indexOf(name);
              const next=e.key==="ArrowRight"?availableViews[(i+1)%availableViews.length]:e.key==="ArrowLeft"?availableViews[(i+availableViews.length-1)%availableViews.length]:e.key==="Home"?availableViews[0]:e.key==="End"?availableViews.at(-1):null;
              if(next){e.preventDefault();setRequestedView(next);document.getElementById(`tab-${section}-${next}`)?.focus();}
            }}><Icon size={19} aria-hidden="true"/>{t(name)}</button>;})}
        </div>
        <div id={`panel-${section}`} role="tabpanel" aria-labelledby={`tab-${section}-${view}`} className="report-workspace">
          {mapGroups.map(([key, ids]) => <RetainedView key={key} active={view === "Maps" && mapGroup === key}>
            <MapExplorer sources={{...sources,maps:sources.maps.filter(map=>ids.includes(map.id))}} initialMapId={ids[0]} initialComparison={topic.comparison} contextCards={contextCards} summaryId={summaryId} onComparisonChange={id=>selectTopic(id,{preservePosition:true})}/>
          </RetainedView>)}
          {view==="Charts"?<ChartExplorer key={topic.id} charts={sources.charts.filter(chart=>topic.charts.includes(chart.id))} contextCards={contextCards}/>:
            view==="Tables" ? (error?<div role="alert"><p>{error}</p><button type="button" onClick={retry}>{t("Retry")}</button></div>:
            <InteractiveReportTable key={topic.id} tables={tables.filter(table=>topic.tables.includes(table.id))} contextCards={insights.tableContexts?.[topic.id]}/>) : null}
        </div>
        {view==="Tables" && !insights.tableContexts?.[topic.id]?<InsightCards cards={contextCards}/>:null}
      </div>
    </div>
  </section>;
}
