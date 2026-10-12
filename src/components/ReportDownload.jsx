import { Download } from "lucide-react";
import { usePreferences } from "./Preferences";
import downloads from "../data/reportDownloads.json";

export default function ReportDownload({ report }) {
  const { language } = usePreferences();
  const document = downloads[report];
  if (!document) return null;
  return <a className="report-download" href={`${import.meta.env.BASE_URL}reports/${document.file}`} download={document.file}
    title={document.label[language]} aria-label={`${language==="es"?"Descargar":"Download"} ${document.label[language]} (PDF)`}>
    <Download size={17} aria-hidden="true" />
    <span>{document.label[language]}</span><small>PDF</small>
  </a>;
}
