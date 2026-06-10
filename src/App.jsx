import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bike,
  Bus,
  Car,
  Database,
  MapPinned,
  Route,
  TrendingUp,
  Truck,
} from "lucide-react";
import BrandHeader from "./components/BrandHeader";
import MetricCard from "./components/MetricCard";
import SectionHeader from "./components/SectionHeader";
import ResponsiveMapPanel from "./components/ResponsiveMapPanel";
import RankingTable from "./components/RankingTable";
import FilterBar from "./components/FilterBar";
import MobileFilterDrawer, { MobileFilterButton } from "./components/MobileFilterDrawer";
import DetailCard from "./components/DetailCard";
import FigureGallery from "./components/FigureGallery";
import ReportStoryPanel from "./components/ReportStoryPanel";
import { BarChartCard, SparklineCard } from "./components/ChartCard";
import { formatNumber, formatPercent, rankGroupLimit } from "./utils/format";
import dashboardCards from "./data/dashboardCards.json";
import regionalMetrics from "./data/regionalMetrics.json";
import reportFigures from "./data/reportFigures.json";
import reportNarrative from "./data/reportNarrative.json";
import topIntersections from "./data/topIntersections.json";
import topInterchanges from "./data/topInterchanges.json";

const metricIcons = [TrendingUp, MapPinned, Route, BarChart3];

const rankOptions = [
  { value: "Top 10", label: "Top 10" },
  { value: "Top 50", label: "Top 50" },
  { value: "Top 500", label: "Top 500" },
];

const countyOptions = [
  { value: "All", label: "All counties" },
  { value: "Douglas", label: "Douglas" },
  { value: "Sarpy", label: "Sarpy" },
  { value: "Pottawattamie", label: "Pottawattamie" },
];

function DataCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  return (
    <article className={`data-card tone-${tone}`}>
      <Icon size={22} aria-hidden="true" />
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function App() {
  const [intersectionRankGroup, setIntersectionRankGroup] = useState("Top 10");
  const [intersectionCounty, setIntersectionCounty] = useState("All");
  const [interchangeRankGroup, setInterchangeRankGroup] = useState("Top 10");
  const [selectedIntersection, setSelectedIntersection] = useState(topIntersections[0]);
  const [selectedInterchange, setSelectedInterchange] = useState(topInterchanges[0]);
  const [intersectionDrawerOpen, setIntersectionDrawerOpen] = useState(false);
  const [interchangeDrawerOpen, setInterchangeDrawerOpen] = useState(false);

  const filteredIntersections = useMemo(() => {
    const limit = rankGroupLimit(intersectionRankGroup);
    return topIntersections.filter((row) => {
      const countyMatch = intersectionCounty === "All" || row.county === intersectionCounty;
      return countyMatch && row.regionalRank <= limit;
    });
  }, [intersectionCounty, intersectionRankGroup]);

  const filteredInterchanges = useMemo(() => {
    const limit = rankGroupLimit(interchangeRankGroup);
    return topInterchanges.filter((row) => row.regionalRank <= limit);
  }, [interchangeRankGroup]);

  useEffect(() => {
    if (!filteredIntersections.some((row) => row.id === selectedIntersection?.id)) {
      setSelectedIntersection(filteredIntersections[0] ?? null);
    }
  }, [filteredIntersections, selectedIntersection?.id]);

  useEffect(() => {
    if (!filteredInterchanges.some((row) => row.id === selectedInterchange?.id)) {
      setSelectedInterchange(filteredInterchanges[0] ?? null);
    }
  }, [filteredInterchanges, selectedInterchange?.id]);

  const intersectionFilters = [
    {
      id: "intersection-rank",
      label: "Rank group",
      value: intersectionRankGroup,
      onChange: setIntersectionRankGroup,
      options: rankOptions,
    },
    {
      id: "intersection-county",
      label: "County",
      value: intersectionCounty,
      onChange: setIntersectionCounty,
      options: countyOptions,
    },
  ];

  const interchangeFilters = [
    {
      id: "interchange-rank",
      label: "Rank group",
      value: interchangeRankGroup,
      onChange: setInterchangeRankGroup,
      options: rankOptions,
    },
  ];

  const countyChangeRows = regionalMetrics.countyChanges.map((row) => ({
    label: row.name.replace("Pottawattamie and Mills Counties", "Pott. + Mills"),
    value: row.change,
  }));
  const ffcChangeRows = regionalMetrics.federalFunctionalClass.map((row) => ({
    label: row.className,
    value: row.change2021_2022,
  }));

  const regionalFigures = reportFigures.filter((figure) => figure.category === "Regional Patterns");
  const intersectionFigures = reportFigures.filter((figure) => figure.category === "Intersections");
  const modeFigures = reportFigures.filter((figure) => ["Freight", "Transit", "Multimodal"].includes(figure.category));
  const figureById = Object.fromEntries(reportFigures.map((figure) => [figure.id, figure]));
  const figureContext = {
    "regional-figure-01":
      "Traffic counts are summarized to Traffic Analysis Districts, which are small areas bounded by major roadways. This should become an interactive district map with selectable VMT change and traffic-volume attributes.",
    "regional-figure-13":
      "The report uses monthly ATR data from NDOT and Iowa DOT through October 2023 to compare monthly and cumulative statewide traffic changes. This should become a filterable trend chart.",
    "regional-figure-14":
      "Ten of the region's fifteen active continuous counters have counted since 1994. This long-term view should become an interactive annual traffic trend chart.",
    "regional-figure-21":
      "Permanent bicycle and pedestrian counters are used to estimate average daily pedestrian activity at trail locations. This should become a selectable counter-location chart.",
    "regional-figure-32":
      "Heartland Bike Share has operated since 2011, with ridership growth continuing after a pandemic-era boost. This should become a year-by-year bike share trend chart.",
  };

  return (
    <>
      <BrandHeader />
      <main>
        <section className="hero section-band" id="overview">
          <div className="hero-copy">
            <p className="eyebrow">Omaha-Council Bluffs metro</p>
            <h1>Regional Traffic Explorer</h1>
            <p>
              Explore traffic volumes, travel patterns, top intersections, and major interchange activity across the
              Omaha-Council Bluffs metro.
            </p>
            <div className="hero-actions" aria-label="Primary actions">
              <a className="button-primary" href="#intersections">
                Explore rankings
              </a>
              <a className="button-secondary" href="#regional-patterns">
                View regional patterns
              </a>
            </div>
          </div>

          <div className="hero-dashboard" aria-label="Dashboard summary">
            <div className="brand-title-bar" aria-hidden="true" />
            <div className="metric-grid">
              {dashboardCards.heroMetrics.map((card, index) => (
                <MetricCard key={card.label} {...card} icon={metricIcons[index]} />
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap overview-grid" aria-labelledby="what-this-tool-shows">
          <div>
            <p className="eyebrow">Public data tool</p>
            <h2 id="what-this-tool-shows">What this tool shows</h2>
          </div>
          <div className="tool-list">
            {dashboardCards.whatThisToolShows.map((item) => (
              <article key={item}>
                <span aria-hidden="true" />
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-wrap" id="regional-patterns">
          <SectionHeader
            eyebrow="Regional Traffic Patterns 2021-2022"
            title="Regional Patterns"
          >
            Vehicle miles traveled estimates how much traffic is moving through an area by combining road length and
            traffic volume.
          </SectionHeader>

          <div className="data-grid five">
            <DataCard
              icon={Car}
              label="Regional VMT"
              value={formatPercent(regionalMetrics.headlineMetrics.regionalVmtChangeSince2020)}
              detail="Estimated increase from 2020 to 2022."
              tone="blue"
            />
            <DataCard
              icon={TrendingUp}
              label="Fastest county growth"
              value="Sarpy +15%"
              detail="County-level VMT change from the report."
              tone="teal"
            />
            <DataCard
              icon={MapPinned}
              label="Urban core"
              value="+10%"
              detail="Traffic recovered, but more slowly than outer districts."
              tone="mint"
            />
            <DataCard
              icon={Activity}
              label="CBD signal"
              value="-2%"
              detail="Omaha CBD VMT change from 2020 to 2022."
              tone="coral"
            />
            <DataCard
              icon={Database}
              label="Traffic counters"
              value="15"
              detail="Active regional counters: 10 in Nebraska and 5 in Iowa."
              tone="yellow"
            />
          </div>

          <div className="report-story-grid ffc-wide">
            <ReportStoryPanel
              eyebrow="Report findings"
              title="What the regional report says"
              items={reportNarrative.regional}
            />
            <div className="ffc-table-card feature-card">
              <p className="eyebrow">Federal Functional Classification</p>
              <h3>Annual VMT Change by Roadway Class</h3>
              <div className="mini-table-wrap">
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>2018-19</th>
                      <th>2019-20</th>
                      <th>2020-21</th>
                      <th>2021-22</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionalMetrics.federalFunctionalClass.map((row) => (
                      <tr key={row.className}>
                        <td>{row.className}</td>
                        <td>{formatPercent(row.change2018_2019)}</td>
                        <td>{formatPercent(row.change2019_2020)}</td>
                        <td>{formatPercent(row.change2020_2021)}</td>
                        <td>{formatPercent(row.change2021_2022)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="regional-layout">
            <ResponsiveMapPanel
              title="Traffic Analysis Districts and traffic activity"
              description="This static report map holds the space for a future interactive Traffic Analysis District web map."
              items={topIntersections.slice(0, 36)}
              selectedId={selectedIntersection?.id}
              onSelect={setSelectedIntersection}
              staticFigure={figureById["regional-figure-01"]}
              context={reportNarrative.regional.slice(0, 3)}
            />

            <div className="side-stack">
              <BarChartCard
                eyebrow="County-level VMT"
                title="Change since 2020"
                data={countyChangeRows}
                description="Sarpy County showed the strongest VMT growth in the report period."
              />
              <BarChartCard
                eyebrow="Roadway classes"
                title="2021-2022 VMT change"
                data={ffcChangeRows}
                description="Freeways and interstates continued to rebound; major collectors softened."
              />
            </div>
          </div>

          <article className="experience-embed">
            <div>
              <p className="eyebrow">Interactive draft</p>
              <h3>Regional traffic web experience</h3>
              <p>
                This embedded ArcGIS Experience can become the live map companion for Traffic Analysis Districts,
                traffic flows, and future report-year layers.
              </p>
            </div>
            <iframe
              title="ArcGIS regional traffic experience draft"
              src="https://experience.arcgis.com/experience/c3c2d2c5f588490bbb955c03def44596/?draft=true"
              loading="lazy"
              allowFullScreen
            />
          </article>

          <div className="spark-grid">
            {regionalMetrics.districtSeries.map((series, index) => (
              <SparklineCard
                key={series.label}
                title={series.label}
                value={series.values.at(-1).toString()}
                label="Indexed VMT trend"
                series={series.values}
                tone={["blue", "teal", "yellow"][index]}
              />
            ))}
          </div>

          <FigureGallery
            figures={regionalFigures}
            title="Regional map and chart placeholders"
            intro="These static report visuals are placeholders for future interactive web maps and charts. The report context above explains what each view should communicate."
            contextByFigure={figureContext}
          />
        </section>

        <section className="section-wrap" id="intersections">
          <SectionHeader
            eyebrow="Top Traffic Intersections 2021-2022"
            title="Top Intersections"
            action={<MobileFilterButton onClick={() => setIntersectionDrawerOpen(true)} />}
          >
            The busiest intersection is 90th Street & West Dodge Road. Rankings use Annual Average Daily Traffic.
          </SectionHeader>

          <div className="desktop-filter-row">
            <FilterBar filters={intersectionFilters} />
            <p>
              Showing <strong>{filteredIntersections.length}</strong> ranked locations.
            </p>
          </div>

          <MobileFilterDrawer
            open={intersectionDrawerOpen}
            title="Intersection filters"
            onClose={() => setIntersectionDrawerOpen(false)}
          >
            <FilterBar filters={intersectionFilters} />
          </MobileFilterDrawer>

          <div className="ranking-layout">
            <ResponsiveMapPanel
              title="Ranked intersection points"
              description="This static rank map holds the place for an interactive intersection web map connected to the ranking table."
              items={filteredIntersections}
              selectedId={selectedIntersection?.id}
              onSelect={setSelectedIntersection}
              staticFigure={figureById["intersections-figure-02"]}
              context={reportNarrative.intersections}
            />
            <DetailCard item={selectedIntersection} label="Selected intersection" />
          </div>

          <RankingTable
            title="Top intersection rankings"
            rows={filteredIntersections}
            selectedId={selectedIntersection?.id}
            onSelect={setSelectedIntersection}
            showCounty
          />

          <div className="report-story-grid">
            <ReportStoryPanel
              eyebrow="Report findings"
              title="Intersection report takeaways"
              items={reportNarrative.intersections}
            />
          </div>

          <FigureGallery
            figures={intersectionFigures}
            title="Intersection map placeholders"
            intro="These static maps identify the views that should become interactive intersection web maps."
            contextByFigure={figureContext}
          />
        </section>

        <section className="section-wrap" id="interchanges">
          <SectionHeader
            eyebrow="Top Traffic Interchanges 2021-2022"
            title="Top Interchanges"
            action={<MobileFilterButton onClick={() => setInterchangeDrawerOpen(true)} />}
          >
            Interchange volumes are highest along the I-80/I-680 loop. The busiest interchange is I-680 & I-80.
          </SectionHeader>

          <div className="desktop-filter-row">
            <FilterBar filters={interchangeFilters} />
            <p>
              Showing <strong>{filteredInterchanges.length}</strong> ranked interchanges.
            </p>
          </div>

          <MobileFilterDrawer
            open={interchangeDrawerOpen}
            title="Interchange filters"
            onClose={() => setInterchangeDrawerOpen(false)}
          >
            <FilterBar filters={interchangeFilters} />
          </MobileFilterDrawer>

          <div className="ranking-layout">
            <ResponsiveMapPanel
              title="Regional interchange ranking"
              description="This static rank map holds the place for an interactive interchange web map connected to interchange details."
              items={filteredInterchanges}
              selectedId={selectedInterchange?.id}
              onSelect={setSelectedInterchange}
              staticFigure={figureById["interchanges-figure-01"]}
              context={reportNarrative.interchanges}
            />
            <DetailCard item={selectedInterchange} label="Selected interchange" />
          </div>

          <RankingTable
            title="Top interchange rankings"
            rows={filteredInterchanges}
            selectedId={selectedInterchange?.id}
            onSelect={setSelectedInterchange}
          />

          <div className="report-story-grid">
            <ReportStoryPanel
              eyebrow="Report findings"
              title="Interchange report takeaways"
              items={reportNarrative.interchanges}
            />
          </div>

        </section>

        <section className="section-wrap" id="multimodal">
          <SectionHeader eyebrow="Multimodal, freight, and other modes" title="Beyond Daily Traffic">
            The regional report also tracks freight movement, bicycle and pedestrian activity, transit, bike share,
            scooters, and ride-hailing.
          </SectionHeader>

          <div className="data-grid multimodal-grid">
            <DataCard
              icon={Truck}
              label="Truck volume growth by 2050"
              value="+76%"
              detail="FAF 311 daily truck model projection."
              tone="teal"
            />
            <DataCard
              icon={Truck}
              label="Regional truck freight share"
              value="2.2%"
              detail="Originating, ending, or staying within the FAF region."
              tone="blue"
            />
            <DataCard
              icon={Bike}
              label="Bike/ped counters"
              value={formatNumber(regionalMetrics.multimodal.permanentBikePedCounters)}
              detail="Permanent automated count locations."
              tone="mint"
            />
            <DataCard
              icon={Route}
              label="Strava commute share"
              value="8%"
              detail="Approximate share of 2022 regional activities."
              tone="yellow"
            />
            <DataCard
              icon={Bus}
              label="ORBT ridership role"
              value="1/5"
              detail="Approximate share of all Metro ridership."
              tone="coral"
            />
            <DataCard
              icon={Bike}
              label="Bike share stations"
              value={formatNumber(regionalMetrics.multimodal.heartlandBikeShareStations2022)}
              detail="Heartland Bike Share stations in 2022."
              tone="blue"
            />
          </div>

          <div className="mode-layout">
            <article className="feature-card freight-card">
              <p className="eyebrow">Freight</p>
              <h3>Most modeled truck freight is passing through the network.</h3>
              <p>
                The report notes {formatNumber(regionalMetrics.freight.truckNetworkFreightThousandTons2017)} thousand
                tons across FAF 311 network roads in 2017, with {formatNumber(regionalMetrics.freight.regionalTruckFreightThousandTons2017)}{" "}
                thousand tons tied directly to the region.
              </p>
            </article>

            <BarChartCard
              eyebrow="Other modes"
              title="Report values at a glance"
              valueSuffix=""
              data={[
                { label: "Bike share stations", value: regionalMetrics.multimodal.heartlandBikeShareStations2022 },
                { label: "Scooter trips, 2022", value: regionalMetrics.multimodal.eScooterTrips2022 },
                { label: "Bike/ped counters", value: regionalMetrics.multimodal.permanentBikePedCounters },
              ]}
              description="Scooter and bike share activity are concentrated in central Omaha activity nodes."
            />
          </div>

          <div className="report-story-grid two">
            <ReportStoryPanel eyebrow="Freight" title="Freight findings" items={reportNarrative.freight} />
            <ReportStoryPanel eyebrow="Other modes" title="Multimodal findings" items={reportNarrative.multimodal} />
          </div>

          <FigureGallery
            figures={modeFigures}
            title="Freight, transit, and multimodal placeholders"
            intro="These static maps and charts show the views that should become interactive freight, transit, bike/ped, scooter, bike share, and TNC charts or web maps."
            contextByFigure={figureContext}
          />
        </section>

      </main>

      <footer className="site-footer">
        <img src="./assets/mapa-logo-white-yellow.png" alt="MAPA logo" />
        <p>
          Dashboard based on MAPA traffic reports for 2021-2022. Static maps and charts mark views intended for future
          interactive web maps and charts.
        </p>
      </footer>
    </>
  );
}

export default App;
