import { useEffect, useId, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import notices from "../data/translationNotices.json";

export default function TranslationNotice({ language = "en" }) {
  const notice=notices[language] || notices.en;
  const [open,setOpen]=useState(false);
  const dialog=useRef(null),trigger=useRef(null);
  const titleId=useId(),textId=useId();
  useEffect(()=>{
    if(!open)return;
    const element=dialog.current;
    element.showModal();
    return()=>{
      if(element.open)element.close();
      trigger.current?.focus();
    };
  },[open]);
  return <>
    <button ref={trigger} type="button" className="translation-notice-trigger" onClick={()=>setOpen(true)}
      title={notice.title} aria-haspopup="dialog"><Info size={13} aria-hidden="true"/><span>{notice.title}</span></button>
    <dialog ref={dialog} className="translation-notice-dialog" aria-labelledby={titleId} aria-describedby={textId}
      onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <div className="translation-notice-body">
        <div className="translation-notice-heading"><h2 id={titleId}>{notice.title}</h2>
          <button type="button" className="icon-button" title={notice.close} aria-label={notice.close} onClick={()=>setOpen(false)}><X size={18}/></button>
        </div>
        <p id={textId}>{notice.general}</p>
      </div>
    </dialog>
  </>;
}
