import { useEffect,useMemo,useRef,useState } from "react";
import { Download } from "lucide-react";
import { usePreferences } from "./Preferences";
import { createCounterChart,counterDataCoverage,counterExportBounds } from "../services/counterChart.js";
import { popupModel } from "../services/mapPopups.js";
import volumes from "../data/counterVolumes.json";
import "../styles/popups.css";

const stations=Object.entries(volumes.stations).sort(([,a],[,b])=>a.state.localeCompare(b.state) || a.station.localeCompare(b.station,undefined,{numeric:true}));
const layer={url:"MAPA_ATR/FeatureServer"};

export default function CounterCharts() {
  const {t,language}=usePreferences();
  const [id,setId]=useState("NE-17");
  const [compact,setCompact]=useState(false);
  const [format,setFormat]=useState("png"),[downloading,setDownloading]=useState(false),[error,setError]=useState("");
  const host=useRef(null);
  const record=volumes.stations[id];
  const model=useMemo(()=>popupModel(layer,{state:id.split("-")[0],Name:record.station},language),[id,language]);
  const coverage=counterDataCoverage(model.chartSeries);
  const rangeText=range=>range.first===range.last?String(range.first):t("{0} to {1}").replace("{0}",range.first).replace("{1}",range.last);
  useEffect(()=>{
    const observer=new ResizeObserver(entries=>setCompact(entries[0].contentRect.width<600));
    observer.observe(host.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const chart=createCounterChart(model,document,compact?{width:360,height:250}:{width:760,height:310});
    host.current.replaceChildren(...(chart?[chart]:[]));
  },[model,compact]);
  const save=blob=>{
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=url;link.download=`counter-${id}-annual-aadt.${format}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const download=async()=>{
    setDownloading(true);setError("");
    let exportFigure;
    try{
      if(format==="csv"){
        const csv="Year,AADT\r\n"+model.chartSeries.map(point=>`${point.year},${point.amount}`).join("\r\n");
        save(new Blob([csv],{type:"text/csv;charset=utf-8"}));return;
      }
      exportFigure=createCounterChart(model,document,{width:760,height:310,dataLabels:true});
      exportFigure.hidden=true;host.current.append(exportFigure);
      const original=exportFigure.querySelector("svg"),copy=original.cloneNode(true);
      const bounds=counterExportBounds(original.viewBox.baseVal);
      copy.setAttribute("xmlns","http://www.w3.org/2000/svg");copy.setAttribute("width",bounds.width);copy.setAttribute("height",bounds.height);
      copy.setAttribute("viewBox",`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
      const nodes=original.querySelectorAll("text,line,polyline,circle,rect,path"),copies=copy.querySelectorAll("text,line,polyline,circle,rect,path");
      nodes.forEach((node,index)=>{
        const style=getComputedStyle(node);
        for(const property of ["fill","stroke","stroke-width","stroke-dasharray","font-family","font-size","font-weight"])copies[index].style.setProperty(property,style.getPropertyValue(property));
      });
      copy.querySelector(".counter-chart-indicator")?.remove();
      const background=document.createElementNS("http://www.w3.org/2000/svg","rect");
      for(const [key,value] of Object.entries(bounds))background.setAttribute(key,value);
      background.setAttribute("fill","white");copy.prepend(background);
      const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:"image/svg+xml;charset=utf-8"});
      if(format==="svg"){save(blob);return;}
      const url=URL.createObjectURL(blob);
      try{
        const image=new Image();image.src=url;
        await image.decode();
        const canvas=document.createElement("canvas");canvas.width=bounds.width*2;canvas.height=bounds.height*2;
        canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
        const png=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
        if(!png)throw new Error("PNG export failed");save(png);
      }finally{URL.revokeObjectURL(url);}
    }catch{setError(t("View unavailable"));}finally{exportFigure?.remove();setDownloading(false);}
  };
  return <div className="counter-charts" translate="yes">
    <div className="workspace-toolbar">
      <label className="field"><span>{t("Counter location")}</span><select aria-label={t("Counter location")} value={id} onChange={event=>setId(event.target.value)}>
        {stations.map(([key,station])=><option key={key} value={key}>{station.station} · {station.route} · {station.location} · {station.state}</option>)}
      </select></label>
      <label className="field counter-download-format"><span>{t("Download format")}</span><select aria-label={t("Download format")} value={format} onChange={event=>setFormat(event.target.value)}>{["png","svg","csv"].map(value=><option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
      <button className="icon-button" type="button" aria-label={t("Download chart")} title={t("Download chart")} disabled={downloading} onClick={download}><Download size={18}/></button>
    </div>
    <div className="counter-chart-heading"><div><h4>{record.station} · {record.route}</h4><p>{record.location} · {record.state}</p></div><div className="counter-chart-current"><strong>{model.value}</strong><span>{model.label}</span></div></div>
    <p className="counter-data-summary">{t(coverage.gaps.length?"Years with data":"Continuous annual data")}: {coverage.ranges.map(rangeText).join("; ")}{coverage.gaps.length?<span className="counter-missing-summary"><i aria-hidden="true"/>{t("No data")}: {coverage.gaps.map(rangeText).join("; ")}</span>:null}</p>
    <div ref={host} className="counter-chart-host"/>
    {error?<p role="alert">{error}</p>:null}
  </div>;
}
