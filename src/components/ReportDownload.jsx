import { ExternalLink, FileText } from "lucide-react";
import { usePreferences } from "./Preferences";
import downloads from "../data/reportDownloads.json";

export default function ReportDownload({ report }) {
  const { language } = usePreferences();
  const document = downloads[report];
  if (!document) return null;
  return <a className="report-download" href={document.url} target="_blank" rel="noopener noreferrer"
    title={document.label[language]} aria-label={`${language==="es"?"Abrir":"Open"} ${document.label[language]} (PDF; ${language==="es"?"se abre en una pestaña nueva":"opens in a new tab"})`}>
    <FileText size={17} aria-hidden="true" />
    <span>{document.label[language]}</span><small>PDF</small><ExternalLink size={14} aria-hidden="true"/>
  </a>;
}
