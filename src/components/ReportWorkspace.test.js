import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("regional map groups render with a unique summary target", async () => {
  const server = await createServer({
    configFile: false,
    esbuild: { jsx: "automatic" },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const previousWindow = global.window;
  try {
    const { default: ReportWorkspace } = await server.ssrLoadModule("/src/components/ReportWorkspace.jsx");
    global.window = {};
    const markup = renderToStaticMarkup(createElement(ReportWorkspace, { tables: [], section: "regional" }));
    assert.match(markup, /chapter-summary-regional/);
    assert.match(markup, /Traffic Analysis Districts/);
    assert.doesNotMatch(markup,/aria-label="Seasonal charts"/);
    const seasonalMarkup=renderToStaticMarkup(createElement(ReportWorkspace,{tables:[],section:"regional",initialTopicId:"seasonal"}));
    assert.match(seasonalMarkup,/aria-label="Seasonal charts"/);
    for(const name of ["Principal arterials","Municipal streets","Rural interstate","Urban interstate","Statewide traffic change"])assert.ok(seasonalMarkup.includes(name));
    const transitWorkspace=renderToStaticMarkup(createElement(ReportWorkspace,{tables:[],section:"multimodal",initialTopicId:"transit"}));
    assert.match(transitWorkspace,/aria-label="Transit maps"/);
    assert.match(transitWorkspace,/report-toc-caption">Ranking measure/);
    assert.match(transitWorkspace,/April 2025 average productivity/);
    assert.match(transitWorkspace,/Change since April 2022/);
    const otherMultimodal=renderToStaticMarkup(createElement(ReportWorkspace,{tables:[],section:"multimodal",initialTopicId:"bike-share"}));
    assert.doesNotMatch(otherMultimodal,/aria-label="Transit maps"|report-toc-caption/);
    const countersWorkspace=renderToStaticMarkup(createElement(ReportWorkspace,{tables:[],section:"regional",initialTopicId:"counters"}));
    assert.match(countersWorkspace,/tab-regional-Charts/);
    assert.ok(countersWorkspace.indexOf('id="tab-regional-Tables"')<countersWorkspace.indexOf('id="tab-regional-Charts"'));
    const {default:CounterCharts}=await server.ssrLoadModule("/src/components/CounterCharts.jsx");
    const counterChartsMarkup=renderToStaticMarkup(createElement(CounterCharts));
    assert.match(counterChartsMarkup,/Counter location/);
    assert.match(counterChartsMarkup,/81,322/);
    assert.match(counterChartsMarkup,/Download chart/);
    assert.match(counterChartsMarkup,/PNG/);
    assert.doesNotMatch(counterChartsMarkup,/Annual values|source-note|counter-chart-readout/);
    assert.equal((counterChartsMarkup.match(/<option value="(?:NE|IA)-/g) || []).length,17);
    const { default: InteractiveReportTable } = await server.ssrLoadModule("/src/components/InteractiveReportTable.jsx");
    const { default: insights } = await server.ssrLoadModule("/src/data/reportInsights.json");
    const { default: tables } = await server.ssrLoadModule("/public/data/reportTables.json");
    const tableMarkup = renderToStaticMarkup(createElement(InteractiveReportTable, {
      tables: tables.filter(table => table.id === "ffc"),
      contextCards: insights.tableContexts["roadway-classes"],
    }));
    const filters = tableMarkup.indexOf('class="workspace-toolbar"');
    const observation = tableMarkup.indexOf("A broader rebound in 2025");
    const methodology = tableMarkup.indexOf("The 2022-2023 methodology break separates");
    const table = tableMarkup.indexOf('class="interactive-table-scroll"');
    assert.ok(filters >= 0 && methodology > filters && observation > methodology && table > observation);
    assert.match(tableMarkup, /Principal arterials returned to growth/);
    assert.doesNotMatch(tableMarkup, /Moving through or arriving|A change in the road network/);
    const counterMarkup = renderToStaticMarkup(createElement(InteractiveReportTable, {
      tables: tables.filter(table => table.id === "atr"),
      contextCards: insights.tableContexts.counters,
    }));
    assert.equal((counterMarkup.match(/class="historical-counter"/g) || []).length, 10);
    assert.equal((counterMarkup.match(/Since 1994/g) || []).length, 10);
    assert.doesNotMatch(counterMarkup, /source discrepancy|supplied workbook lists|requires review/);
    assert.match(counterMarkup, /914<small class="counter-history-label">Since 1994/);
    assert.match(counterMarkup, /A-56<small class="counter-history-label">Since 1994/);
    assert.doesNotMatch(counterMarkup, /(?:100|102|124|A-70|A-78)<small class="counter-history-label">/);
    const { default: ChartExplorer } = await server.ssrLoadModule("/src/components/ChartExplorer.jsx");
    const { default: sources } = await server.ssrLoadModule("/src/data/visualSources.json");
    const controlledChart=renderToStaticMarkup(createElement(ChartExplorer,{charts:sources.charts.filter(chart=>["8","9","10","11","12"].includes(chart.id)),selectedChartId:"12"}));
    assert.match(controlledChart,/<option value="12" selected=""/);
    const {default:TransitRankings}=await server.ssrLoadModule("/src/components/TransitRankings.jsx");
    const controlledRanking=renderToStaticMarkup(createElement(TransitRankings,{selectedMeasure:"change"}));
    assert.match(controlledRanking,/<option value="change" selected=""/);
    assert.match(controlledRanking,/<option value="10" selected="">Top 10/);
    assert.doesNotMatch(controlledRanking,/Service-day change/);
    assert.match(controlledRanking,/Matched Metro and ORBT stops/);
    assert.doesNotMatch(controlledRanking,/excluding ORBT/);
    assert.equal(sources.maps.find(map=>map.id==="transit-rankings").webmapId,"9cb9e8555b954ac9abee3313f8ec7d8e");
    const chartMarkup = renderToStaticMarkup(createElement(ChartExplorer, {
      charts: sources.charts.filter(chart => chart.id === "8"),
    }));
    const primaryFinding = chartMarkup.indexOf("Most 2025 months led earlier years");
    const supportingRow = chartMarkup.indexOf('class="chart-supporting-insights"');
    const roadwork = chartMarkup.indexOf("US 6 growth and US 75 roadwork");
    assert.ok(primaryFinding >= 0 && supportingRow > primaryFinding && roadwork > supportingRow);
    assert.equal((chartMarkup.match(/aria-label="(?:Listen to summary|Audio unavailable in this browser):/g) || []).length, 2);
    const transitChartMarkup = renderToStaticMarkup(createElement(ChartExplorer, {
      charts: sources.charts.filter(chart => chart.id === "26"),
    }));
    assert.match(transitChartMarkup, /ORBT in April 2025/);
    assert.doesNotMatch(transitChartMarkup, /chart-supporting-insights/);
    const scooterChartMarkup = renderToStaticMarkup(createElement(ChartExplorer, {
      charts: sources.charts.filter(chart => chart.id === "30"),
    }));
    assert.match(scooterChartMarkup, /June and the College World Series/);
    assert.doesNotMatch(scooterChartMarkup, /chart-supporting-insights/);
    const stravaChartMarkup = renderToStaticMarkup(createElement(ChartExplorer, {
      charts: sources.charts.filter(chart => chart.id === "19"),
    }));
    assert.match(stravaChartMarkup, /A predominantly recreational sample/);
    assert.doesNotMatch(stravaChartMarkup, /chart-supporting-insights/);
    const pedestrianChartMarkup = renderToStaticMarkup(createElement(ChartExplorer, {
      charts: sources.charts.filter(chart => chart.id === "16"),
    }));
    assert.match(pedestrianChartMarkup, /Bob Kerrey Bridge led throughout/);
    assert.doesNotMatch(pedestrianChartMarkup, /chart-supporting-insights/);
    const bicycleChartMarkup = renderToStaticMarkup(createElement(ChartExplorer, {
      charts: sources.charts.filter(chart => chart.id === "17"),
    }));
    assert.match(bicycleChartMarkup, /chart-sidebar-compact/);
    assert.match(bicycleChartMarkup, /National cycling, 2023/);
    assert.doesNotMatch(bicycleChartMarkup, /Scope of the counts/);
    assert.doesNotMatch(bicycleChartMarkup, /chart-supporting-insights/);
    const { default: MapExplorer } = await server.ssrLoadModule("/src/components/MapExplorer.jsx");
    const controlledMap=renderToStaticMarkup(createElement(MapExplorer,{sources:{maps:sources.maps.filter(map=>["9cb9e8555b954ac9abee3313f8ec7d8e","orbt"].includes(map.id))},selectedMapId:"orbt"}));
    assert.match(controlledMap,/map-orbt/);
    const intersectionSources = { maps: sources.maps.filter(map => map.id === "9d5d2824442b453abfbfcd95f2e8421b") };
    const sidePanelMarkup = renderToStaticMarkup(createElement(MapExplorer, { sources: intersectionSources, popupInSidePanel: true }));
    assert.match(sidePanelMarkup, /popup-side-layout/);
    assert.match(sidePanelMarkup, /aria-label="Intersection details"/);
    assert.match(sidePanelMarkup, /No intersection selected/);
    const standardMarkup = renderToStaticMarkup(createElement(MapExplorer, { sources: intersectionSources }));
    assert.doesNotMatch(standardMarkup, /intersection-popup-panel/);
    const { default: IntersectionPopupPanel } = await server.ssrLoadModule("/src/components/IntersectionPopupPanel.jsx");
    const selection = { layer: { url: "https://services.arcgis.com/example/arcgis/rest/services/Traffic_Flow_System__Public_view/FeatureServer/1" }, attributes: { INTERSECTI: "90th & Dodge" } };
    const panelMarkup = renderToStaticMarkup(createElement(IntersectionPopupPanel, { features: [selection, selection] }));
    assert.match(panelMarkup, /Intersection details/);
    assert.match(panelMarkup, /Clear selection/);
    assert.match(panelMarkup, /Next intersection/);
    assert.doesNotMatch(panelMarkup, /arcgis-legend/);
    assert.doesNotMatch(panelMarkup, /arcgis-feature|shadowroot|iframe/);
    assert.match(panelMarkup, /intersection-details/);
    assert.match(panelMarkup, /2025 AVERAGE ANNUAL DAILY TRAFFIC/);
    assert.match(panelMarkup, /2025 traffic by intersection leg/);
    assert.match(panelMarkup, /Road context/);
    assert.match(panelMarkup, /AADT 2020 - 2025/);
    const { default: IntersectionDetails } = await server.ssrLoadModule("/src/components/IntersectionDetails.jsx");
    const escapedMarkup = renderToStaticMarkup(createElement(IntersectionDetails, { attributes: { INTERSECTI: "<script>unsafe</script>", Total_25: 80679, Total_24: 78406, Rank_25: 2 } }));
    assert.match(escapedMarkup, /80,679/);
    assert.match(escapedMarkup, /2\.9% from 2024/);
    assert.match(escapedMarkup, /&lt;script&gt;unsafe&lt;\/script&gt;/);
    const { default: LiveRankingsSection } = await server.ssrLoadModule("/src/components/LiveRankingsSection.jsx");
    global.window = { location: { hash: "#intersections" } };
    const heatMapMarkup = renderToStaticMarkup(createElement(LiveRankingsSection, { kind: "intersections" }));
    assert.match(heatMapMarkup, /Traffic intensity/);
    assert.match(heatMapMarkup, /Volume isn&#x27;t congestion/);
    assert.doesNotMatch(heatMapMarkup, /intersection-popup-panel|popup-side-layout/);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    await server.close();
  }
});
