import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "./Preferences";
import { rankTransitBays } from "../services/rankingMap.js";

export default function TransitMemberStops({group,measure,selection,onSelect,columns,number,signed}) {
  const {t}=usePreferences();
  const [open,setOpen]=useState(Boolean(selection));
  const members=useMemo(()=>{
    const ranked=rankTransitBays(group.members,measure);
    const ranks=new Map(ranked.map(member=>[member.objectId,member]));
    return group.members.map(member=>ranks.get(member.objectId) || member)
      .sort((a,b)=>(a.rank ?? Infinity)-(b.rank ?? Infinity) || a.objectId-b.objectId);
  },[group,measure]);
  const selected=members.find(member=>member.objectId===selection?.objectId);
  useEffect(()=>{setOpen(Boolean(selection && group.objectIds.includes(selection.objectId)));},[selection,group.objectId]);
  return <details className="transit-group-members" open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{t("Member stops")} ({group.members.length})</summary>
    {selected?<section className="transit-member-detail" aria-label={t("Selected member stop")} aria-live="polite">
      <h5>{selected.name}</h5>
      <p>{t("Stop")} {selected.code} · {selected.service==="Metro"?t("Fixed Route Bus"):selected.service}</p>
      <p>{t("Rank within location")}: {selected.rank?`#${selected.rank}`:t("Not reported")}</p>
      <strong>{measure==="change"?signed(selected.change):number(selected.activity,true)}</strong>
      <p>{t(measure==="change"?"Change per 100 visits":"Avg activity per 100 visits")}</p>
      <dl>{columns.map(([key,label])=><div key={key}><dt>{t(label)}</dt><dd>{measure==="change"?signed(selected[key]):number(selected[key])}</dd></div>)}
        {measure==="change"?<>
          <div><dt>{t("2022 activity per 100 scheduled visits")}</dt><dd>{number(selected.baselineActivity,true)}</dd></div>
          <div><dt>{t("2022 scheduled visits")}</dt><dd>{number(selected.baselineVisits)}</dd></div>
          <div><dt>{t("2025 activity per 100 scheduled visits")}</dt><dd>{number(selected.activity,true)}</dd></div>
          <div><dt>{t("2025 scheduled visits")}</dt><dd>{number(selected.visits)}</dd></div>
        </>:null}
      </dl>
    </section>:null}
    <ul>{members.map(member=><li key={member.objectId}>
      <button className="transit-member-button" type="button" onClick={()=>onSelect(member.objectId)} aria-pressed={member.objectId===selected?.objectId}>
        <span>{member.rank?`${group.rank}.${member.rank} · `:""}{member.name}<small>{t("Stop")} {member.code}</small></span>
        <strong>{measure==="change"?signed(member.change):number(member.activity,true)}</strong>
      </button>
    </li>)}</ul>
  </details>;
}
