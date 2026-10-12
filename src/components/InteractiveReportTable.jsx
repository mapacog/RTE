import { useMemo,useState } from "react";
import { ArrowDown,ArrowUp,Download } from "lucide-react";
import { usePreferences } from "./Preferences";

export default function InteractiveReportTable({ tables }) {
  const { t,language }=usePreferences();
  const [id,setId]=useState("ffc");
  const [query,setQuery]=useState("");
  const [sort,setSort]=useState({column:0,ascending:true});
  const [filter,setFilter]=useState("");
  const table=tables.find(item=>item.id===id) || tables[0];
  const activeId=table?.id || id;
  const filterColumn=activeId==="atr"?0:activeId==="vmt"?2:null;
  const rows=useMemo(()=>!table?[]:table.rows.filter(row=>
    row.some(cell=>String(cell ?? "").toLowerCase().includes(query.toLowerCase())) &&
    (!filter || row[filterColumn]===filter)).slice().sort((a,b)=>{
      const left=a[sort.column],right=b[sort.column];
      return (typeof left==="number"&&typeof right==="number"?left-right:String(left??"").localeCompare(String(right??"")))*(sort.ascending?1:-1);
    }),[table,query,filter,filterColumn,sort]);
  if(!table)return <p role="status">{t("Loading")}</p>;
  const format=(value,i)=>{
    if(value==null)return t("Not reported");
    if(typeof value!=="number")return t(String(value));
    const type=table.formats[i];
    if(type==="year")return String(value);
    return new Intl.NumberFormat(language==="es"?"es-US":"en-US",type==="percent"?{style:"percent",minimumFractionDigits:1,maximumFractionDigits:1}:{maximumFractionDigits:0}).format(value);
  };
  return <div className="report-table-explorer">
    <div className="workspace-toolbar">
      <label className="field"><span>{t("Table")}</span><select aria-label={t("Table")} value={activeId} onChange={e=>{setId(e.target.value);setQuery("");setFilter("");setSort({column:0,ascending:true});}}>
        {tables.map(item=><option key={item.id} value={item.id}>{t(item.title)}</option>)}
      </select></label>
      <label className="field"><span>{t("Search table")}</span><input aria-label={t("Search table")} type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      {filterColumn!=null?<label className="field"><span>{t(table.columns[filterColumn])}</span><select aria-label={t(table.columns[filterColumn])} value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="">{t("All")}</option>{[...new Set(table.rows.map(row=>row[filterColumn]))].map(value=><option key={value} value={value}>{t(value)}</option>)}
      </select></label>:null}
      <a className="utility-link" href={`${import.meta.env.BASE_URL}data/${activeId}.csv`} download><Download size={17}/>{t("Download CSV")}</a>
    </div>
    <p className="table-methodology">{table.note}</p>
    <div className="interactive-table-scroll" role="region" aria-label={t(table.title)} tabIndex={0}>
      <table className="interactive-report-table"><caption className="sr-only">{t(table.title)} / {table.sourceSheet}</caption>
        <thead><tr>{table.columns.map((column,i)=><th scope="col" key={column} aria-sort={sort.column===i?(sort.ascending?"ascending":"descending"):"none"}>
          <button type="button" onClick={()=>setSort({column:i,ascending:sort.column===i?!sort.ascending:true})}>{t(column)}{sort.column===i?(sort.ascending?<ArrowUp size={14}/>:<ArrowDown size={14}/>):null}</button>
        </th>)}</tr></thead>
        <tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,i)=>i===0?<th scope="row" key={i}>{format(cell,i)}</th>:<td key={i}>{format(cell,i)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p role="status" className="source-note">{rows.length} / {table.rows.length} {language==="es"?"filas":"rows"}</p>
  </div>;
}
