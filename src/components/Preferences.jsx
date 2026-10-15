import { translateText, languages, validLanguage } from "../utils/localization.js";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Accessibility, Square, Volume2 } from "lucide-react";
import { createSpeechReader } from "../services/speechReader";
import { cardReading } from "../utils/translatedReading";
import { dismissDetails } from "../utils/dismissDetails.js";
import TranslationNotice from "./TranslationNotice";
import translationNotices from "../data/translationNotices.json";

const translations = {
  "Legs total":"Total de tramos",
  "District VMT change":"Cambio de VMT por distrito", "Regional VMT change":"Cambio de VMT regional",
  "Local street growth":"Crecimiento de calles locales", "Topics":"Temas", "Activate map":"Activar mapa", "Deactivate map":"Desactivar mapa",
  "Rankings":"Clasificaciones",
  "Regional VMT":"VMT regional", "Douglas County":"Condado de Douglas", "Urban core":"Centro urbano", "Outer Douglas":"Douglas periférico",
  "Traffic Analysis Districts":"Distritos de análisis de tráfico", "Average daily VMT":"VMT diario promedio", "Change in VMT":"Cambio de VMT",
  "Roadway classification":"Clasificación vial", "Continuous traffic counts":"Conteos continuos de tráfico", "Seasonal variation":"Variación estacional",
  "Long-term trends":"Tendencias a largo plazo", "Regional VMT by year":"VMT regional por año", "Bicycle and pedestrian activity":"Actividad ciclista y peatonal",
  "Strava activity":"Actividad de Strava", "Omaha Rapid Bus Transit":"Transporte rápido de Omaha", "Heartland Bike Share":"Heartland Bike Share",
  "Micromobility / scooters":"Micromovilidad / scooters", "Report topics":"Temas del informe", "Regional traffic patterns":"Patrones de tráfico regional",
  "Multimodal transportation":"Transporte multimodal", "Intersection maps":"Mapas de intersecciones", "Interchange map":"Mapa de intercambios",
  "Home":"Inicio", "Explore":"Explorar", "Regional Patterns":"Patrones regionales", "Intersections":"Intersecciones",
  "Interchanges":"Intercambios", "Multimodal":"Multimodal", "Regional Traffic Explorer":"Explorador de tráfico regional",
  "Omaha-Council Bluffs metro":"Área metropolitana de Omaha-Council Bluffs", "Traffic Data Portal":"Portal de datos de tráfico",
  "Maps":"Mapas", "Charts":"Gráficos", "Tables":"Tablas", "Web map":"Mapa web", "Chart":"Gráfico", "Topic":"Tema",
  "Regional travel":"Viajes regionales", "Walking & cycling":"Caminatas y ciclismo", "Transit":"Transporte público",
  "Bike share & scooters":"Bicicletas compartidas y scooters", "Open source":"Abrir fuente", "Open map":"Abrir mapa",
  "Open chart":"Abrir gráfico", "Loading":"Cargando", "Retry":"Reintentar", "View unavailable":"Vista no disponible",
  "Layers":"Capas", "Legend":"Leyenda", "Table":"Tabla", "Search table":"Buscar en la tabla", "Download CSV":"Descargar CSV",
  "All":"Todos", "State":"Estado", "Roadway class":"Clase de carretera", "Year":"Año", "Series":"Serie",
  "Measured":"Medido", "Estimated":"Estimado", "Methodology":"Metodología", "Source note":"Nota de la fuente",
  "Rank within":"Clasificar dentro de", "Region":"Región", "County":"Condado", "City":"Ciudad", "Show":"Mostrar",
  "Choose a city":"Elija una ciudad", "Choose a county":"Elija un condado", "All locations":"Todas las ubicaciones",
  "Top 10":"Primeros 10", "Top 50":"Primeros 50", "Top 500":"Primeros 500", "Filters":"Filtros",
  "Rank":"Puesto", "Location":"Ubicación", "Total AADT":"AADT total", "North":"Norte", "East":"Este", "South":"Sur", "West":"Oeste",
  "Not reported":"No reportado", "Unassigned":"Sin asignar", "No ranked locations":"No hay ubicaciones clasificadas",
  "Traffic data unavailable":"Datos de tráfico no disponibles", "Top Intersections":"Principales intersecciones",
  "Top Interchanges":"Principales intercambios", "Traffic and travel patterns":"Tráfico y patrones de viaje",
  "Daily mobility beyond driving":"Movilidad diaria más allá del automóvil", "Accessibility":"Accesibilidad",
  "Text size":"Tamaño de texto", "High contrast":"Alto contraste", "Reduced motion":"Movimiento reducido",
  "Listen to summary":"Escuchar resumen", "Stop reading":"Detener lectura", "Skip to content":"Saltar al contenido", "Counter ID":"ID del contador",
  "Route":"Ruta", "VMT change by roadway class":"Cambio de VMT por clase de carretera",
  "Regional continuous traffic counters":"Contadores regionales continuos",
  "Regional growth":"Crecimiento regional", "Continuous counters":"Contadores continuos", "Busiest intersection":"Intersección más transitada",
  "Busiest interchange":"Intercambio más transitado", "About these data":"Acerca de estos datos", "Beta":"Beta",
};
const PreferencesContext = createContext({ language: "en", t: value => value });

export function PreferencesProvider({ children }) {
  const [language, setLanguage] = useState(() => validLanguage(localStorage.getItem("rte-language")));
  const [size, setSize] = useState(() => localStorage.getItem("rte-size") || "100");
  const [contrast, setContrast] = useState(() => localStorage.getItem("rte-contrast") === "true");
  const [motion, setMotion] = useState(() => localStorage.getItem("rte-motion") === "true");
  useEffect(() => {
    document.documentElement.style.fontSize = `${size}%`;
    document.documentElement.classList.toggle("high-contrast", contrast);
    document.documentElement.classList.toggle("reduce-motion", motion);
    for (const [key,value] of Object.entries({language,size,contrast,motion})) localStorage.setItem(`rte-${key}`, String(value));
  }, [language,size,contrast,motion]);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    stopReadingAloud();
  }, [language]);
  const t = value => language === "es" ? translations[value] || translateText(value,language) : translateText(value,language);
  return <PreferencesContext.Provider value={{ language,setLanguage,t,size,setSize,contrast,setContrast,motion,setMotion }}>{children}</PreferencesContext.Provider>;
}
export const usePreferences = () => useContext(PreferencesContext);

export function PreferencesControls() {
  const { t,language,setLanguage,size,setSize,contrast,setContrast,motion,setMotion } = usePreferences();
  const pane=useRef(null);
  useEffect(()=>dismissDetails(pane.current,document),[]);
  return <div className="reader-controls reader-controls-with-notice">
    <div className="language-control">
    <label className="language-field"><span className="sr-only">Language / Idioma</span>
      <select aria-label="Language / Idioma" value={language} onChange={e=>setLanguage(e.target.value)}>
        {languages.map(item=><option key={item.code} value={item.code} lang={item.code}>{item.label}</option>)}
      </select>
    </label>
    <TranslationNotice language={language}/>
    </div>
    <details ref={pane} className="accessibility-controls"><summary aria-label={t("Accessibility")}><Accessibility size={20} aria-hidden="true"/><span>{t("Accessibility")}</span></summary>
      <div className="reader-settings">
        <label>{t("Text size")}<select aria-label={t("Text size")} value={size} onChange={e=>setSize(e.target.value)}>
          {[100,125,150,200].map(n=><option key={n} value={n}>{n}%</option>)}
        </select></label>
        <label><input type="checkbox" checked={contrast} onChange={e=>setContrast(e.target.checked)}/>{t("High contrast")}</label>
        <label><input type="checkbox" checked={motion} onChange={e=>setMotion(e.target.checked)}/>{t("Reduced motion")}</label>
        <div className="google-translation-section">
        <a aria-describedby="google-translation-notice" href={/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?"https://translate.google.com/?sl=auto&tl=es&op=websites":`https://translate.google.com/translate?sl=auto&tl=es&u=${encodeURIComponent(location.href)}`} target="_blank" rel="noreferrer">
          {language==="es"?"Más idiomas / Google Translate":translateText("More languages / Google Translate",language)}
        </a>
        <p id="google-translation-notice" className="google-translation-notice">{(translationNotices[language] || translationNotices.en).google}</p>
        </div>
      </div>
    </details>
  </div>;
}

let speechReader;
export function stopReadingAloud() { speechReader?.stop(); }

export function ListenButton({ text, subject }) {
  const { t,language } = usePreferences();
  const [speaking,setSpeaking]=useState(false);
  const [audioError,setAudioError]=useState("");
  const stopReading=useRef(null);
  useEffect(()=>()=>stopReading.current?.(),[text,language]);
  const supported="speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const action=supported?t(speaking ? "Stop reading" : "Listen to summary"):
    language==="es"?"Audio no disponible en este navegador":translateText("Audio unavailable in this browser",language);
  const label=`${audioError || action}${subject ? `: ${subject}` : ""}`;
  return <><button className="icon-button" type="button" title={label} aria-label={label} aria-pressed={speaking} disabled={!supported}
    onClick={event=>{
      if(speaking){stopReading.current?.();return;}
      setAudioError("");
      speechReader ||= createSpeechReader(window.speechSynthesis, text=>new SpeechSynthesisUtterance(text));
      const reading=cardReading(event.currentTarget,text,language,document);
      stopReading.current=speechReader.speak(reading.text,reading.language,setSpeaking,code=>setAudioError(t(code==="voice-unavailable"?"No voice is available for this language on this device.":"Audio playback is unavailable.")));
    }}>
    {speaking ? <Square size={17} aria-hidden="true"/> : <Volume2 size={19} aria-hidden="true"/>}
  </button>{audioError?<span className="sr-only" role="alert">{audioError}</span>:null}</>;
}
