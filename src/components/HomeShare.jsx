import { translateText } from "../utils/localization.js";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Facebook, Linkedin, Mail, MessageCircle, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { usePreferences } from "./Preferences";
import { homeShareUrl, shareLinks } from "../utils/shareLinks";

export default function HomeShare() {
  const { language, t } = usePreferences();
  const es = language === "es";
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");
  const [qrError, setQrError] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialog = useRef(null);
  const linkField = useRef(null);
  const trigger = useRef(null);
  const url = homeShareUrl(window.location.href);
  const title = t("Regional Traffic Explorer");
  const links = shareLinks(url, title);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    setStatus("");
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      trigger.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQr(""); setQrError(false);
    QRCode.toDataURL(url, { width: 240, margin: 4, errorCorrectionLevel: "M", color: { dark: "#004b58", light: "#ffffff" } })
      .then(image => { if (!cancelled) setQr(image); })
      .catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [open, url, retry]);

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        linkField.current.select();
        if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
      }
      setStatus("copied");
    } catch {
      linkField.current.focus(); linkField.current.select(); setStatus("copy-error");
    }
  };
  const nativeShare = async () => {
    try { await navigator.share({ title, url }); }
    catch (error) { if (error.name !== "AbortError") setStatus("share-error"); }
  };

  return <>
    <button ref={trigger} type="button" className="icon-button home-share-trigger" onClick={() => setOpen(true)} aria-label={es ? "Compartir" : translateText("Share",language)} title={es ? "Compartir" : translateText("Share",language)}>
      <Share2 size={19} aria-hidden="true"/>
    </button>
    <dialog ref={dialog} className="home-share-dialog" aria-labelledby="home-share-title"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll("button:not(:disabled), a[href], input")];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="home-share-panel">
        <div className="home-share-heading">
          <h2 id="home-share-title">{es ? "Compartir" : translateText("Share",language)} {title}</h2>
          <button className="icon-button" type="button" onClick={() => setOpen(false)} title={es ? "Cerrar" : translateText("Close",language)} aria-label={es ? "Cerrar" : translateText("Close share dialog",language)}><X size={20} aria-hidden="true"/></button>
        </div>
        <div className="home-share-content">
          <div className="home-share-qr">
            <div className="share-qr-image">
              {qr ? <img src={qr} width="240" height="240" alt={es ? "Código QR del Explorador de tráfico regional" : translateText("Regional Traffic Explorer QR code",language)}/>
                : <div role={qrError ? "alert" : "status"}>{qrError ? (es ? "Código QR no disponible" : translateText("QR code unavailable",language)) : t("Loading")}</div>}
            </div>
            {qr ? <a className="share-qr-download" href={qr} download="regional-traffic-explorer-qr.png"><Download size={16} aria-hidden="true"/>{es ? "Descargar QR" : translateText("Download QR",language)}</a>
              : qrError ? <button type="button" className="button-secondary" onClick={() => setRetry(value => value + 1)}>{t("Retry")}</button> : null}
          </div>
          <div className="home-share-options">
            <a className="share-option" href={links.facebook} target="_blank" rel="noopener noreferrer"><Facebook size={20} aria-hidden="true"/>Facebook</a>
            <a className="share-option" href={links.email}><Mail size={20} aria-hidden="true"/>{es ? "Correo" : translateText("Email",language)}</a>
            <a className="share-option" href={links.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} aria-hidden="true"/>WhatsApp</a>
            <a className="share-option" href={links.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={20} aria-hidden="true"/>LinkedIn</a>
            {navigator.share ? <button className="share-option share-native" type="button" onClick={nativeShare}><Share2 size={20} aria-hidden="true"/>{es ? "Más opciones" : translateText("More options",language)}</button> : null}
          </div>
        </div>
        <div className="share-url-row">
          <input ref={linkField} value={url} readOnly aria-label={es ? "Enlace para compartir" : translateText("Share link",language)}/>
          <button className="icon-button" type="button" onClick={copyLink} aria-label={es ? "Copiar enlace" : translateText("Copy link",language)} title={es ? "Copiar enlace" : translateText("Copy link",language)}>
            {status === "copied" ? <Check size={19} aria-hidden="true"/> : <Copy size={19} aria-hidden="true"/>}
          </button>
        </div>
        <p className="share-feedback" role="status">{status === "copied" ? (es ? "Enlace copiado" : translateText("Link copied",language))
          : status === "copy-error" ? (es ? "No se pudo copiar el enlace" : translateText("Unable to copy link",language))
          : status === "share-error" ? (es ? "No se pudo compartir el enlace" : translateText("Unable to share link",language)) : ""}</p>
      </div>
    </dialog>
  </>;
}
