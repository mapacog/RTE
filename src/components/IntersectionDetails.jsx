import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { intersectionDetails } from "../utils/intersectionDetails";

function HistoryChart({ model, text }) {
  const [hovered, setHovered] = useState(null);
  const maximum = Math.max(...model.history.map(item => item.value || 0), 1);
  const step = 10 ** Math.floor(Math.log10(maximum));
  const ceiling = ([1, 2, 5, 10].find(value => value * step >= maximum) || 10) * step;
  return <figure className="intersection-history">
    <figcaption>{text("AADT 2020 - 2025", "AADT 2020 - 2025")}</figcaption>
    <div className="intersection-history-tooltip" role="status">{hovered ? `${hovered.year}: ${model.format(hovered.value)}` : "\u00a0"}</div>
    <div className="intersection-history-plot">
      <div className="intersection-history-axis" aria-hidden="true"><span>{model.format(ceiling)}</span><span>{model.format(ceiling / 2)}</span><span>0</span></div>
      <div className="intersection-history-columns">
        {model.history.map(item => <div className="intersection-history-column" key={item.year}>
          <button type="button" className={`intersection-history-bar${item.value === null ? " is-missing" : ""}`}
            style={{height:item.value === null ? 2 : Math.max(2, item.value / ceiling * 150)}}
            aria-label={`${item.year}: ${model.format(item.value)}`} title={`${item.year}: ${model.format(item.value)}`}
            onMouseEnter={()=>setHovered(item)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(item)} onBlur={()=>setHovered(null)}>
            {item.value === null ? <span aria-hidden="true">-</span> : null}
          </button><span className="intersection-history-year">{item.year}</span>
        </div>)}
      </div>
    </div>
  </figure>;
}

function DetailRows({ rows }) {
  return <dl className="intersection-detail-rows">{rows.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>;
}

export default function IntersectionDetails({ attributes, language = "en" }) {
  const text=(en,es)=>language === "es" ? es : en;
  const model=intersectionDetails(attributes,language);
  return <article className="intersection-details">
    <h4 className="intersection-detail-title">{model.title}</h4>
    <div className="intersection-detail-metric">
      <span>{text("2025 AVERAGE ANNUAL DAILY TRAFFIC", "TRÁFICO DIARIO PROMEDIO ANUAL DE 2025")}</span>
      <strong>{model.value}</strong>
      <span>{text("vehicles per day", "vehículos por día")} · {model.rankText}</span>
    </div>
    <div className="intersection-detail-comparisons">{model.comparisons.map(item=>{
      const Icon=item.tone === "increase" ? ArrowUp : item.tone === "decrease" ? ArrowDown : null;
      return <p className={`comparison-${item.tone}`} key={item.year}>{Icon ? <Icon size={15} aria-hidden="true"/> : null}<span>{item.label}</span></p>;
    })}</div>
    <section className="intersection-detail-summary"><h5>{text("Summary", "Resumen")}</h5><p>{model.summary}</p></section>
    <HistoryChart model={model} text={text}/>
    <section><h5>{text("2025 traffic by intersection leg", "Tráfico por tramo de la intersección en 2025")}</h5><DetailRows rows={model.legs}/></section>
    <section><h5>{text("Road context", "Contexto vial")}</h5><DetailRows rows={model.roads}/></section>
    <p className="intersection-detail-note">{model.location}</p>
    <p className="intersection-detail-note">{text("Intersection AADT = (north + east + south + west leg AADT) / 2. Each leg is bidirectional, so dividing by two avoids counting most trips once entering and again when exiting.", "AADT de la intersección = (AADT norte + este + sur + oeste) / 2. Cada tramo es bidireccional; dividir entre dos evita contar la mayoría de los viajes al entrar y nuevamente al salir.")}</p>
  </article>;
}
