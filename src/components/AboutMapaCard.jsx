import { translateText } from "../utils/localization.js";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPinned } from "lucide-react";
import MapExplorer from "./MapExplorer";
import { usePreferences } from "./Preferences";
import about from "../data/aboutMapa";

const mapSource = { maps: [{ id: about.map.id, title: about.map.title }] };

export default function AboutMapaCard() {
  const { language, t } = usePreferences();
  const mapHost = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!window.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(mapHost.current);
    return () => observer.disconnect();
  }, []);

  return <article className="home-destination destination-about">
    <a className="destination-heading" href={about.website} target="_blank" rel="noopener noreferrer">
      <MapPinned size={24} aria-hidden="true"/>
      <h3>{language === "es" ? "¿Qué es MAPA?" : translateText("What is MAPA?",language)}</h3>
      <ExternalLink size={21} aria-hidden="true"/>
      <span className="sr-only">{language === "es" ? "Se abre en una pestaña nueva" : translateText("Opens in a new tab",language)}</span>
    </a>
    <div className="about-mapa-map" ref={mapHost}>
      {visible ? <MapExplorer sources={mapSource} initialMapId={about.map.id} showOpenMap={false} fitLayerTitle="COG Counties" summaryId="about-mapa-summary"/>
        : <div className="about-map-placeholder" role="status">{t("Loading")}</div>}
    </div>
    <p id="about-mapa-summary" tabIndex={-1}>{about.description[language]}</p>
    <p>{about.purpose[language]}</p>
    <div className="destination-links">
      <a href={about.website} target="_blank" rel="noopener noreferrer">{language === "es" ? "Sitio web de MAPA" : translateText("MAPA website",language)}<ExternalLink size={14} aria-hidden="true"/><span className="sr-only">{language === "es" ? " (se abre en una pestaña nueva)" : translateText(" (opens in a new tab)",language)}</span></a>
    </div>
  </article>;
}
