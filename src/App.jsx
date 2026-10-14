import { translateText } from "./utils/localization.js";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bike, ExternalLink, ListOrdered, Map, MapPinned, Route, Truck } from "lucide-react";
import BrandHeader from "./components/BrandHeader";
import LiveRankingsSection from "./components/LiveRankingsSection";
import LiveOverview from "./components/LiveOverview";
import ReportWorkspace, { useReportTables } from "./components/ReportWorkspace";
import { usePreferences } from "./components/Preferences";
import ReportDownload from "./components/ReportDownload";
import photos from "./data/metroPhotos";
import DestinationPhotos from "./components/DestinationPhotos";
import AboutMapaCard from "./components/AboutMapaCard";
import RetainedView from "./components/RetainedView";

const portal = "https://experience.arcgis.com/experience/8a9b3260cb234d4aa2f121059b1d5204";
const freightPlan = "https://engage.mapacog.org/regional-freight-plan";
const pages = {
  Home: "Home",
  "regional-patterns": "Regional Patterns",
  multimodal: "Multimodal",
  intersections: "Intersections",
  interchanges: "Interchanges",
};

function readRoute() {
  const [hashPage, topic] = window.location.hash.slice(1).split("/");
  const page = hashPage === "overview" ? "Home" : hashPage;
  return Object.hasOwn(pages, page) ? { page, topic: page==="multimodal" && topic==="orbt"?"transit":topic } : null;
}

const destinations = [
  { page: "regional-patterns", icon: Map, label: "Regional Patterns", tone: "blue",
    description: ["How travel has changed across the metro, from daily traffic to seasonal trends.", "Cómo han cambiado los viajes regionales, desde el tráfico diario hasta las tendencias estacionales."],
    links: [["Change in VMT", "change-vmt"], ["Seasonal variation", "seasonal"], ["Regional VMT by year", "regional-vmt"]] },
  { page: "intersections", icon: MapPinned, label: "Intersections", tone: "coral",
    description: ["Compare the busiest intersections in your city, county, or the entire region.", "Compare las intersecciones más transitadas de su ciudad, condado o región."],
    links: [["Top Intersections", ""]] },
  { page: "interchanges", icon: Route, label: "Interchanges", tone: "teal",
    description: ["See where major highways meet and how much daily traffic they carry.", "Vea dónde se conectan las principales autopistas y cuánto tráfico diario transportan."],
    links: [["Top Interchanges", ""]] },
  { page: "multimodal", icon: Bike, label: "Multimodal", tone: "mint",
    description: ["Walking, cycling, transit, and shared mobility across the metro.", "Caminatas, ciclismo, transporte público y movilidad compartida en el área metropolitana."],
    links: [["Bicycle and pedestrian activity", "bike-ped"], ["Transit", "transit"], ["Heartland Bike Share", "bike-share"]] },
];

export default function App() {
  const { t, language } = usePreferences();
  const tableSource = useReportTables();
  const [route, setRoute] = useState(() => readRoute() || { page: "Home" });
  const isHome = route.page === "Home";
  useEffect(() => {
    const navigate = () => {
      const next = readRoute();
      // Skip links target content on the current page, not a new route.
      if (!next) return;
      setRoute(next);
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    document.title = `${t(pages[route.page])} | ${t("Regional Traffic Explorer")} | MAPA`;
  }, [route.page, language]);
  const selectTopic = (topic, { preservePosition = false } = {}) => {
    const hash = `#${route.page}/${topic}`;
    if (preservePosition) {
      if (window.location.hash !== hash) window.history.pushState(null, "", hash);
      setRoute(current => ({ ...current, topic }));
    } else window.location.hash = hash;
  };
  return (
    <>
      <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
      <BrandHeader activePage={route.page} />
      <main id="main-content" tabIndex={-1}>
        <RetainedView active={isHome}>
        <section className="section-wrap compact-overview home-overview" id="Home">
          <div className="overview-intro">
          <div className="overview-copy">
          <div className="overview-heading">
            <div>
              <div className="overview-kicker"><p className="eyebrow">{t("Omaha-Council Bluffs metro")}</p><span>2022–2025</span></div>
              <p className="home-beta">Beta</p>
              <h1 aria-label={t("Regional Traffic Explorer")}>{(language === "es" ? ["Explorador", "de tráfico", "regional"] : language === "en" ? ["Regional", "Traffic", "Explorer"] : [t("Regional Traffic Explorer")]).map(line => <span key={line}>{line}{" "}</span>)}</h1>
              <p>{language === "es" ? "Explore los viajes regionales, las ubicaciones más transitadas y la movilidad cotidiana." : translateText("Explore regional travel, the busiest locations, and everyday mobility.",language)}</p>
            </div>
          </div>
          <div className="overview-action-bar">
            <div className="overview-shortcuts">
              <a className="button-primary" href="#regional-patterns"><Map size={19} aria-hidden="true"/>{t("Regional Patterns")}</a>
              <a className="button-secondary" href="#intersections/rankings"><ListOrdered size={19} aria-hidden="true"/>{language === "es" ? "Ver clasificaciones" : translateText("Explore rankings",language)}</a>
            </div>
          </div>
          </div>
          <LiveOverview tables={tableSource.tables} />
          </div>
          <div className="overview-resources">
            <a className="portal-link" href={portal} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={18} aria-hidden="true" />{t("Traffic data portal")}<span className="sr-only">{language === "es" ? " (se abre en una pestaña nueva)" : translateText(" (opens in a new tab)",language)}</span>
            </a>
            <ReportDownload report="flow"/>
          </div>
          <section className="home-destinations" aria-label={language === "es" ? "Temas de transporte" : translateText("Transportation topics",language)}>
            {destinations.map(({ page, icon: Icon, label, tone, description, links }) => <article key={page} className={`home-destination destination-${tone}`}>
              <a className="destination-heading" href={`#${page}`}>
                <Icon size={24} aria-hidden="true" />
                <h3>{t(label)}</h3>
                <ArrowUpRight size={21} aria-hidden="true" />
              </a>
              <DestinationPhotos photos={photos[page]} label={`${t(label)} ${language === "es" ? "fotos" : translateText("photos",language)}`}/>
              <p>{t(description[language === "es" ? 1 : 0])}</p>
              <div className="destination-links">
                {links.map(([label, topic]) => <a key={label} href={`#${page}${topic ? `/${topic}` : ""}`}>{t(label)}<ArrowUpRight size={14} aria-hidden="true" /></a>)}
              </div>
            </article>)}
            <article className="home-destination destination-freight">
              <a className="destination-heading" href={freightPlan} target="_blank" rel="noreferrer">
                <Truck size={24} aria-hidden="true"/>
                <h3>{language === "es" ? "Carga" : translateText("Freight",language)}</h3>
                <ExternalLink size={21} aria-hidden="true"/>
                <span className="sr-only">{language === "es" ? "Se abre en una pestaña nueva" : translateText("Opens in a new tab",language)}</span>
              </a>
              <DestinationPhotos photos={photos.freight} label={language === "es" ? "Fotos de carga" : translateText("Freight photos",language)}/>
              <p>{language === "es" ? "Para obtener información sobre carga, visite el Plan Regional de Carga, que establecerá una visión regional para mejorar la seguridad y confiabilidad del movimiento de carga dentro de la región." : translateText("For information on Freight, Please Visit the Regional Freight Plan, which will establish a regional vision for freight to improve the safety and reliability of freight movement within the region.",language)}</p>
              <div className="destination-links">
                <a href={freightPlan} target="_blank" rel="noreferrer">{language === "es" ? "Plan Regional de Carga" : translateText("Regional Freight Plan",language)}<ExternalLink size={14} aria-hidden="true"/><span className="sr-only">{language === "es" ? " (se abre en una pestaña nueva)" : translateText(" (opens in a new tab)",language)}</span></a>
              </div>
            </article>
            <AboutMapaCard/>
          </section>
        </section>
        </RetainedView>
        {Object.keys(pages).filter(page => page !== "Home").map(page => <RetainedView key={page} active={route.page === page}>
          <h1 className="sr-only">{t(pages[page])}</h1>
          {page === "regional-patterns" || page === "multimodal" ?
            <ReportWorkspace {...tableSource} section={page === "multimodal" ? "multimodal" : "regional"} initialTopicId={route.topic} onTopicChange={selectTopic} /> :
            <LiveRankingsSection kind={page} navigation={route} />}
        </RetainedView>)}
      </main>
      <footer className="site-footer">
        <div className="footer-content">
          <a href="https://www.mapacog.org" target="_blank" rel="noopener noreferrer" aria-label={language === "es" ? "Sitio web de MAPA (se abre en una pestaña nueva)" : translateText("MAPA website (opens in a new tab)",language)}>
            <img src="./assets/mapa-logo-white-yellow.png" alt="MAPA" />
          </a>
        </div>
      </footer>
    </>
  );
}
