import { translateText } from "../utils/localization.js";
import { useEffect,useState } from "react";
import { MapPinned,Route,Car,TrendingUp } from "lucide-react";
import { normalizeFeature,trafficLayers } from "../services/trafficRankings";
import MetricCard from "./MetricCard";
import { usePreferences } from "./Preferences";
import { formatNumber } from "../utils/format";

export default function LiveOverview({ tables }) {
  const { t,language }=usePreferences();
  const [leaders,setLeaders]=useState({});
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    setError(false);
    const timer=setTimeout(()=>{setError(true);controller.abort();},30000);
    Promise.all(Object.entries(trafficLayers).map(async([kind,layer])=>{
      const params=new URLSearchParams({f:"json",where:"Total_25 IS NOT NULL",outFields:`OBJECTID,${layer.nameField},CITY,COUNTY,Total_25`,returnGeometry:"false",orderByFields:"Total_25 DESC, OBJECTID ASC",resultRecordCount:"1"});
      const response=await fetch(`${layer.url}/query?${params}`,{signal:controller.signal});
      const result=await response.json();
      if(!response.ok||result.error||!result.features?.[0])throw new Error("Unavailable");
      return [kind,normalizeFeature(result.features[0].attributes,kind)];
    })).then(result=>{if(!controller.signal.aborted)setLeaders(Object.fromEntries(result));}).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>clearTimeout(timer));
    return()=>{clearTimeout(timer);controller.abort();};
  },[]);
  const roadway=tables.find(table=>table.id==="ffc");
  const column=roadway?.columns.indexOf("2024-2025");
  const localGrowth=roadway?.rows.find(row=>row[0]==="Local")?.[column];
  return <div className="metric-grid overview-metrics">
    <MetricCard href="#regional-patterns/change-vmt" label={t("Regional growth")} value="≈5%" detail={language==="es"?"VMT estimado, 2022–2025":translateText("Estimated VMT, 2022–2025",language)} tone="blue" icon={TrendingUp}/>
    {[["intersections","Busiest intersection",MapPinned,"coral"],["interchanges","Busiest interchange",Route,"teal"]].map(([kind,label,icon,tone])=>
      <MetricCard key={kind} href={`#${kind}/rankings`} className="metric-traffic" label={t(label)} value={leaders[kind]?.name || (error?t("Not reported"):t("Loading"))}
        detail={leaders[kind]?<><b>{formatNumber(leaders[kind].aadt,language==="es"?"es-US":"en-US")}</b><small>AADT · 2025</small></>:"2025 · MAPA"} icon={icon} tone={tone}/>
    )}
    <MetricCard href="#regional-patterns/roadway-classes" label={t("Local street growth")} value={typeof localGrowth==="number"?`${localGrowth>0?"+":""}${new Intl.NumberFormat(language==="es"?"es-US":"en-US",{style:"percent",minimumFractionDigits:1,maximumFractionDigits:1}).format(localGrowth)}`:roadway?t("Not reported"):t("Loading")}
      detail={language==="es"?"VMT en calles locales, 2024–2025":translateText("Local-street VMT, 2024–2025",language)} tone="yellow" icon={Car}/>
  </div>;
}
