import { formatNumber } from "../utils/format.js";
import { translateText, languageLocale } from "../utils/localization.js";
import { correctedIntersectionCity, fullCityName } from "../utils/locationCorrections.js";
import trailEstimates from "../data/trailCounterEstimates.json" with { type: "json" };
import { counterVolumeRecord } from "../utils/counterVolumes.js";

const present = value => value !== null && value !== undefined && String(value).trim() !== "";
const numeric = value => present(value) && Number.isFinite(Number(value)) ? Number(value) : null;
const change = (current, previous) => {
  const a = numeric(current), b = numeric(previous);
  return a !== null && b !== null && b !== 0 ? (a - b) / b : null;
};
const directions = [["N", "North", "Norte"], ["E", "East", "Este"], ["S", "South", "Sur"], ["W", "West", "Oeste"]];
const roadClasses = ["", "Interstate", "Freeway / expressway", "Principal arterial", "Minor arterial", "Major collector", "Minor collector", "Local street"];

export function popupProfile(layer) {
  const baseUrl = (layer.url || "").replace(/\/$/, "");
  const url = /\/FeatureServer$/i.test(baseUrl) && layer.layerId !== undefined ? `${baseUrl}/${layer.layerId}` : baseUrl;
  if (/Traffic_Flow_System__Public_view\/FeatureServer\/0\/?$/i.test(url)) return "interchange";
  if (/Traffic_Flow_System__Public_view\/FeatureServer\/1\/?$/i.test(url)) return "intersection";
  if (/Traffic_Flow_System__Public_view\/FeatureServer\/2\/?$/i.test(url)) return "road";
  if (/Traffic_Analysis_District\/FeatureServer/i.test(url)) return "district";
  if (/Heartland_BCycle_Stations\/FeatureServer/i.test(url)) return "bike-share";
  if (/Metro_Ridership_Productivity\/FeatureServer/i.test(url)) return "transit";
  if (/MAPA_ATR\/FeatureServer/i.test(url)) return "recorder";
  if (/MAPA_Bike_and_Ped\._Counters_Public_View\/FeatureServer/i.test(url)) return "bike-ped";
  if (/MAPA_Regional_Trails_Edit_View|MAPA_Bikeable_Streets_AGOL/i.test(url)) return "trail";
  if (/Metro_Transit_Routes/i.test(url)) return "route";
  if (/NTAD_National_Highway_System/i.test(url)) return "highway";
  return null;
}

export function popupModel(layer, attributes, language = "en") {
  const type = popupProfile(layer);
  if (!type || type === "highway") return null;
  const a = attributes || {};
  const es = language === "es";
  const text = (en, translated) => es ? translated : translateText(en,language);
  const missing = text("Not reported", "No reportado");
  const number = value => numeric(value) === null ? missing : formatNumber(Number(value), languageLocale(language));
  const decimal = value => numeric(value) === null ? missing : new Intl.NumberFormat(languageLocale(language), { maximumFractionDigits: 1 }).format(Number(value));
  const percent = value => numeric(value) === null ? missing : new Intl.NumberFormat(languageLocale(language), { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(Number(value));
  const domain = (field, value) => layer.fields?.find(item => item.name === field)?.domain?.codedValues?.find(item => String(item.code) === String(value))?.name || value;
  const model = { type, rows: [], history: [], legs: [], missing, historyLabel: text("Recent years", "Años recientes"), methodLabel: text("How this is measured", "Cómo se mide"), noteLabel: text("About this measure", "Sobre esta medida") };
  const compare = (value, label) => {
    if (numeric(value) !== null) model.comparison = { value: percent(value), label, tone: value > 0 ? "increase" : value < 0 ? "decrease" : "neutral" };
  };
  const row = (label, value, format = "text") => {
    if (present(value)) model.rows.push({ label, value: format === "number" ? number(value) : format === "decimal" ? decimal(value) : String(value) });
  };
  const history = (year, value, format = number) => {
    if (numeric(value) !== null) model.history.push({ label: String(year), value: format(value) });
  };
  const location = (city, county) => [city, county && `${county} ${text("County", "condado")}`].filter(present).join(" · ");

  if (type === "intersection" || type === "interchange") {
    model.title = String(a.INTERSECTI || a.NAME || text("Traffic location", "Ubicación de tráfico"));
    model.subtitle = location(type === "intersection" ? correctedIntersectionCity(a) : fullCityName(a.CITY), a.COUNTY);
    model.category = text(type === "intersection" ? "Intersection" : "Interchange", type === "intersection" ? "Intersección" : "Intercambio");
    model.value = number(a.Total_25);
    model.label = "2025 AADT";
    model.rank = numeric(a.Rank_25) > 0 ? `#${number(a.Rank_25)}` : null;
    model.rankLabel = text("Regional rank", "Puesto regional");
    compare(change(a.Total_25, a.Total_24), text("since 2024", "desde 2024"));
    model.legs = directions.map(([key, en, translated]) => ({ label: text(`${en} leg`, `Tramo ${translated.toLowerCase()}`), value: number(a[`${key}_LEGSUM_25`]), amount: numeric(a[`${key}_LEGSUM_25`]) }));
    model.legsLabel = text("Directional traffic · 2025", "Tráfico por dirección · 2025");
    for (const year of [2023, 2024, 2025]) history(year, a[`Total_${String(year).slice(2)}`]);
    model.historyUnit = "AADT";
    model.note = text("AADT is the annual average number of vehicles per day. Directional leg volumes are shown separately; they should not be added to the AADT above.", "AADT es el promedio anual de vehículos por día. Los volúmenes de los tramos se muestran por separado; no deben sumarse al AADT.");
  } else if (type === "district") {
    const regional = /Regional Percent/i.test(layer.title || "");
    const percentView = /Percent Change/i.test(layer.title || "");
    const areaNames = { UC: text("Urban Core", "Núcleo urbano"), OUT: text("Outer Douglas", "Douglas exterior"), SRP: "Sarpy", IA: "Pottawattamie" };
    model.title = regional ? String(a.RegionalDistrict || areaNames[a.COUNTYFP10] || text("Regional area", "Área regional")) : "TAD";
    model.category = text(regional ? "Regional travel" : "TAD", regional ? "Viajes regionales" : "TAD");
    model.subtitle = regional ? text("Regional comparison · 2022–2025", "Comparación regional · 2022–2025") : a.TAD_Label || "";
    const growth = regional ? a.REG_Change22H_25 : a.VMT_Change_22H_25;
    const volume = regional ? a.REG_SUM_VMT_25 : a.SUM_VMT_25;
    model.value = percentView ? percent(growth) : number(volume);
    model.label = percentView ? text("VMT change · 2022–2025", "Cambio de VMT · 2022–2025") : text("Daily vehicle miles · 2025", "Millas-vehículo diarias · 2025");
    if (!percentView) compare(growth, text("since 2022", "desde 2022"));
    else row(text("Daily vehicle miles · 2025", "Millas-vehículo diarias · 2025"), volume, "number");
    if (!regional) {
      history("2022", a.SUM_VMT_2022_HARM);
      history("2023", a.SUM_VMT_23);
      history("2024", a.SUM_VMT_24);
      history("2025", a.SUM_VMT_25);
      model.historyUnit = text("Daily vehicle miles; comparable 2022 baseline", "Millas-vehículo diarias; base comparable de 2022");
    }
    model.note = text("Vehicle miles traveled combines road length and traffic volume. It measures travel, not congestion.", "Las millas-vehículo combinan la longitud vial y el volumen de tráfico. Miden viajes, no congestión.");
    if (regional) row(text("2022 baseline", "Base de 2022"), text("Comparable regional baseline", "Base regional comparable"));
    else if (present(a.VMT22_HARM_FLAG)) row(text("2022 baseline", "Base de 2022"), a.VMT22_HARM_FLAG === "Adjusted" ? text("Adjusted for comparability", "Ajustada para comparar") : a.VMT22_HARM_FLAG);
    if (!regional && present(a.VMT22_HARM_METHOD)) model.method = String(a.VMT22_HARM_METHOD);
  } else if (type === "road" || type === "highway") {
    const isRoad = type === "road";
    model.title = String(a.street_name || a.LNAME || a.SIGN1 || text("Road segment", "Tramo vial"));
    model.subtitle = location(a.city_name, a.county_text);
    model.category = text("Road traffic", "Tráfico vial");
    model.value = number(isRoad ? a.ADJ_AADT2025 : a.AADT);
    model.label = `${isRoad ? "2025" : a.YEAR || ""} AADT`.trim();
    const code = numeric(isRoad ? a.HPMS_F_SYSTEM : a.FCLASS);
    row(text("Roadway class", "Clase vial"), domain("HPMS_F_SYSTEM", isRoad ? a.HPMS_F_SYSTEM : null) || roadClasses[code] || (code === 99 ? "Ramps / roundabouts" : null));
    // Domain text takes priority; do not present an undecoded numeric class.
    const classRow = model.rows[model.rows.length - 1];
    if (classRow && numeric(classRow.value) !== null) classRow.value = roadClasses[code] || text("Ramps / roundabouts", "Rampas / rotondas");
    row(text("Setting", "Entorno"), a.URBAN_RURAL);
    row(text("Posted speed", "Velocidad señalada"), present(a.maxspeed) ? `${a.maxspeed}${/mph/i.test(String(a.maxspeed)) ? "" : " mph"}` : present(a.SPEED_LIMI) ? `${number(a.SPEED_LIMI)} mph` : null);
    if (isRoad) {
      compare(change(a.ADJ_AADT2025, a.ADJ_AADT2024), text("since 2024", "desde 2024"));
      row(text("Volume type", "Tipo de volumen"), a.AADT_2025_Type);
      for (const year of [2023, 2024, 2025]) history(year, a[`ADJ_AADT${year}`]);
      model.historyUnit = "AADT";
    }
    model.note = text("AADT is the annual average number of vehicles per day, not the traffic volume at this moment.", "AADT es el promedio anual de vehículos por día, no el tráfico en este momento.");
  } else if (type === "bike-share") {
    model.title = String(a.data__stations__name || text("Bike share station", "Estación de bicicletas"));
    model.subtitle = a.data__stations__address || "";
    model.category = text("Heartland Bike Share", "Heartland Bike Share");
    model.value = number(a.C_2025);
    model.label = text("Station checkouts · 2025", "Salidas de la estación · 2025");
    model.rank = numeric(a.Rank_2025) > 0 ? `#${number(a.Rank_2025)}` : null;
    model.rankLabel = text("Checkout rank", "Puesto por salidas");
    compare(change(a.C_2025, a.C_2024), text("since 2024", "desde 2024"));
    for (const year of [2022, 2023, 2024, 2025]) history(year, a[`C_${year}`]);
    model.historyUnit = text("Annual station checkouts", "Salidas anuales de la estación");
    model.note = text("Annual checkouts show station use. They do not indicate how many bikes are available now.", "Las salidas anuales muestran el uso de la estación, no las bicicletas disponibles ahora.");
  } else if (type === "transit") {
    const serviceLabel = a.ServiceType === "Metro" ? text("Fixed Route Bus", "Autobús de ruta fija") : a.ServiceType;
    model.title = String(a.StopName || text("Transit stop", "Parada de transporte"));
    model.category = text("Metro transit · April 2025", "Metro · abril de 2025");
    model.subtitle = [serviceLabel, present(a.StopCode) ? `${text("Stop", "Parada")} ${a.StopCode}` : null].filter(present).join(" · ");
    model.value = decimal(a.Act100Vis);
    model.label = text("Boardings + alightings per 100 scheduled visits", "Subidas + bajadas por 100 visitas programadas");
    const difference = numeric(a.Act100Vis) !== null && numeric(a.Act100Vis_2022) !== null ? Number(a.Act100Vis) - Number(a.Act100Vis_2022) : null;
    if (difference !== null) model.comparison = { value: `${difference > 0 ? "+" : ""}${decimal(difference)}`, label: text("points since April 2022", "puntos desde abril de 2022"), tone: difference > 0 ? "increase" : difference < 0 ? "decrease" : "neutral" };
    row(text("Boardings", "Subidas"), a.Board_Coun, "number");
    row(text("Alightings", "Bajadas"), a.Alight_Cou, "number");
    row(text("Scheduled visits", "Visitas programadas"), a.MonVisits, "number");
    row(text("Service days", "Días de servicio"), a.service_days, typeof a.service_days === "string" && /^\d+-\d+$/.test(a.service_days) ? "text" : "number");
    history("2022", a.Act100Vis_2022, decimal);
    history("2025", a.Act100Vis, decimal);
    model.historyUnit = text("Activity per 100 scheduled visits · April", "Actividad por 100 visitas programadas · abril");
    model.note = text("Stop productivity compares passenger activity with scheduled service. It is not a count of unique riders or regional ridership.", "La productividad compara actividad de pasajeros y servicio programado. No cuenta personas únicas ni viajes regionales.");
    if(a._groupedStops){
      model.label=text("Avg activity per 100 visits","Actividad promedio por 100 visitas");
      model.subtitle=`${a._groupedStops} ${text("stops","paradas")} · ${serviceLabel || text("Fixed Route Bus", "Autobús de ruta fija")}`;
      model.note=text("Grouped productivity uses the calculated average across member stops. Boardings, alightings and scheduled visits are combined totals; service days show the member-stop range.","La productividad agrupada usa el promedio calculado entre las paradas del grupo. Las subidas, bajadas y visitas programadas son totales combinados; los días de servicio muestran el intervalo entre paradas.");
    }
  } else if (type === "recorder") {
    const record=counterVolumeRecord(a);
    const years=record?Object.keys(record.history).map(Number).sort((a,b)=>a-b):[];
    const latest=years.at(-1);
    model.title = `${text("Traffic counter", "Contador de tráfico")} ${record?.station || a.Name || a.Station_Id || ""}`.trim();
    model.category = text("Continuous traffic monitoring", "Monitoreo continuo de tráfico");
    model.subtitle = a.state || "";
    row(text("Station", "Estación"), record?.station || a.Name || a.Station_Id);
    row(text("Status", "Estado"), a.Status === "Old" ? text("Historical station", "Estación histórica") : a.Status);
    row(text("Roadway class", "Clase vial"), record?.roadwayClass || roadClasses[Number(a.F_System)]);
    row(text("Route", "Ruta"),record?.route);
    row(text("Location", "Ubicación"),record?.location);
    if(latest){
      model.value=number(record.history[latest]);model.label=`${latest} AADT`;
      compare(change(record.history[latest],record.history[latest-1]),text(`since ${latest-1}`,`desde ${latest-1}`));
      years.forEach(year=>history(year,record.history[year]));model.historyUnit="AADT";
      model.historyLabel=text("Annual values","Valores anuales");
      model.chartLabel=text("AADT by year","AADT por año");
      model.missingYearsLabel=text("No data","Sin datos");
      model.chartSeries=years.map(year=>({year,amount:record.history[year],value:number(record.history[year])}));
      model.chartNumber=number;
      model.note=text("Annual average daily traffic from Nebraska DOT's Continuous Traffic Count Data and Traffic Characteristics on Nebraska Streets and Highways and Iowa DOT's Automatic Traffic Recorder Reports.","Tráfico diario promedio anual de Continuous Traffic Count Data and Traffic Characteristics on Nebraska Streets and Highways del DOT de Nebraska y Automatic Traffic Recorder Reports del DOT de Iowa.");
    }else{
      row("2025 AADT",missing);
      model.note=text("No annual value for this station is provided in the supplied ATR workbook.","El libro ATR proporcionado no incluye un valor anual para esta estación.");
    }
  } else if (type === "bike-ped") {
    model.title = String(a.site_name || text("Trail counter", "Contador de sendero"));
    model.category = text("Walking & cycling", "Caminatas y ciclismo");
    model.subtitle = a.domain_name || "";
    const modes = String(a.travel_modes || "").split(",").map(mode => mode.trim()).filter(Boolean).map(mode => mode === "pedestrian" ? text("Walking", "Caminatas") : mode === "bike" ? text("Cycling", "Ciclismo") : mode);
    row(text("Activity counted", "Actividad contada"), modes.join(" · "));
    const estimates = a.domain_name === "City of Omaha" ? trailEstimates.sites[a.site_name] : null;
    if (estimates) {
      row(text("Estimated average daily pedestrians · 2025", "Peatones diarios promedio estimados · 2025"), estimates.pedestrian, "number");
      row(text("Estimated average daily bicycles · 2025", "Bicicletas diarias promedio estimadas · 2025"), estimates.bicycle, "number");
      model.note = text("2025 annual average daily estimates from the published pedestrian and bicycle charts, adjusted for counter failures and weather. These values describe this monitored site, not the entire trail network.", "Estimaciones del promedio diario anual de 2025 de los gráficos publicados, ajustadas por fallas de los contadores y el clima. Describen este sitio, no toda la red de senderos.");
    } else {
      row(text("2025 annual average daily estimate", "Promedio diario anual estimado de 2025"), missing);
      model.note = text("The published annual estimates cover the five City of Omaha sites only. No estimate from another site is assigned to this location.", "Las estimaciones anuales publicadas cubren solo los cinco sitios de la Ciudad de Omaha. No se asigna a esta ubicación una estimación de otro sitio.");
    }
  } else {
    model.title = String(a.Route_Name || a.RouteName || a.NAME || layer.title || text("Transportation network", "Red de transporte"));
    model.category = text(type === "route" ? "Transit route" : "Walking & cycling network", type === "route" ? "Ruta de transporte" : "Red peatonal y ciclista");
    row(text("Network", "Red"), a.Trail_Type);
    row(text("Status", "Estado"), a.STATUS);
    model.note = text("Network context for the surrounding activity. Traffic counts are reported separately.", "Contexto de la red para la actividad cercana. Los conteos se reportan por separado.");
  }
  return model;
}

export function createPopupContent(model, doc = document, styles = "") {
  const node = (tag, className, text) => {
    const element = doc.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const root = node("article", "traffic-popup");
  // ArcGIS mounts custom content in shadow DOM, beyond the app stylesheet.
  if (styles) root.append(node("style", "", styles));
  const metadata = node("div", "traffic-popup-meta");
  metadata.append(node("span", "traffic-popup-category", model.category));
  if (model.rank) {
    const rank = node("span", "traffic-popup-rank", model.rank);
    rank.setAttribute("aria-label", `${model.rankLabel} ${model.rank}`);
    rank.title = model.rankLabel;
    metadata.append(rank);
  }
  root.append(metadata);
  if (model.subtitle) root.append(node("p", "traffic-popup-location", model.subtitle));
  const summary = node("div", "traffic-popup-summary");
  if (model.value) {
    const metric = node("div", "traffic-popup-metric");
    metric.append(node("strong", "", model.value), node("span", "", model.label));
    summary.append(metric);
  }
  if (model.comparison) {
    const comparison = node("p", `traffic-popup-change change-${model.comparison.tone}`);
    comparison.append(node("strong", "", model.comparison.value), node("span", "", model.comparison.label));
    summary.append(comparison);
  }
  if (summary.children.length) root.append(summary);
  if (model.legs.length) {
    root.append(node("h4", "traffic-popup-subheading", model.legsLabel));
    const list = node("dl", "traffic-popup-legs");
    const max = Math.max(...model.legs.map(leg => leg.amount || 0), 1);
    for (const leg of model.legs) {
      const row = node("div", "traffic-popup-leg");
      row.append(node("dt", "", leg.label));
      const track = node("div", "traffic-popup-track");
      track.setAttribute("aria-hidden", "true");
      const bar = node("i", "");
      bar.style.width = `${leg.amount === null ? 0 : Math.max(0, leg.amount) / max * 100}%`;
      track.append(bar);
      row.append(track, node("dd", "", leg.value));
      list.append(row);
    }
    root.append(list);
  }
  const rows = items => {
    const list = node("dl", "traffic-popup-rows");
    for (const item of items) {
      const row = node("div", "");
      row.append(node("dt", "", item.label), node("dd", "", item.value));
      list.append(row);
    }
    return list;
  };
  if (model.rows.length) root.append(rows(model.rows));
  if (model.history.length > 1) {
    const details = node("details", "traffic-popup-history");
    details.append(node("summary", "", model.historyLabel));
    if (model.historyUnit) details.append(node("p", "traffic-popup-history-unit", model.historyUnit));
    details.append(rows(model.history));
    root.append(details);
  }
  if (model.method) {
    const details = node("details", "traffic-popup-history");
    details.append(node("summary", "", model.methodLabel), node("p", "traffic-popup-note", model.method));
    root.append(details);
  }
  if (model.note) {
    if (model.value) {
      const details = node("details", "traffic-popup-history");
      details.append(node("summary", "", model.noteLabel), node("p", "traffic-popup-note", model.note));
      root.append(details);
    } else root.append(node("p", "traffic-popup-note", model.note));
  }
  return root;
}

export async function configureMapPopups(map, getLanguage, isCancelled = () => false, styles = "", getRankContext = () => null, preserveProfiles = [], allowedProfiles = null) {
  const [PopupTemplate, CustomContent] = await Promise.all([
    window.$arcgis.import("@arcgis/core/PopupTemplate.js"),
    window.$arcgis.import("@arcgis/core/popup/content/CustomContent.js"),
  ]);
  await Promise.all(map.allLayers.toArray().map(async layer => {
    const profile=popupProfile(layer);
    if (profile === "highway" || allowedProfiles && !allowedProfiles.includes(profile)) {
      layer.popupEnabled = false;
      layer.popupTemplate = null;
      return;
    }
    if (/MAPA_Proposed_TMA_Boundary/i.test(layer.url || "") || /BSC Label/i.test(layer.title || "")) {
      layer.popupEnabled = false;
      return;
    }
    if (!profile) return; // Keep authored content for unrecognized layers.
    try {
      await layer.load();
      if (isCancelled()) return;
      if (preserveProfiles.includes(popupProfile(layer))) return;
      const model = attributes => {
        const context = getRankContext(layer, attributes);
        const group=context?.group;
        const grouped=group?.members?.length>1?{...attributes,StopName:group.name,StopCode:null,Act100Vis:group.activity,Act100Vis_2022:group.baselineActivity,
          Board_Coun:group.boardings,Alight_Cou:group.alightings,MonVisits:group.visits,service_days:group.days,_groupedStops:group.members.length}:attributes;
        const result = popupModel(layer, grouped, getLanguage());
        if (context) {
          result.rank = `#${context.rank}`;
          result.rankLabel = `${getLanguage() === "es" ? "Puesto en" : translateText("Rank within",getLanguage())} ${translateText(context.locale,getLanguage())}`;
        }
        return result;
      };
      layer.popupTemplate = new PopupTemplate({
        title: event => model(event.graphic.attributes).title,
        outFields: ["*"],
        content: [new CustomContent({
          outFields: ["*"],
          creator: event => createPopupContent(model(event.graphic.attributes), document, styles),
        })],
      });
      layer.popupEnabled = true;
    } catch {
      // A context-layer failure must not prevent the main map from loading.
    }
  }));
}
