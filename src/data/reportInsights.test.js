import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expandLanguages } from "../utils/localization.js";

const insights = JSON.parse(readFileSync(new URL("./reportInsights.json", import.meta.url), "utf8"));
const sources = JSON.parse(readFileSync(new URL("./visualSources.json", import.meta.url), "utf8"));
const topics = JSON.parse(readFileSync(new URL("./reportTopics.json", import.meta.url), "utf8"));

test("every published chart has bilingual observations and report-page provenance", () => {
  for (const chart of sources.charts) {
    const cards = insights.chartContexts[chart.id];
    assert.ok(cards?.length, `Missing observations for chart ${chart.id}`);
    assert.ok(insights.chartSourcePages[chart.id]?.length, `Missing source pages for chart ${chart.id}`);
    for (const card of cards) {
      assert.ok(card.title.en && card.title.es && card.text.en && card.text.es);
    }
  }
  for (const topic of topics.filter(topic => topic.charts.length)) {
    assert.ok(insights.chartSummaries[topic.id]?.en && insights.chartSummaries[topic.id]?.es,
      `Missing chart-specific introduction for ${topic.id}`);
  }
});

test("seasonal charts describe the reported locations, periods, and changes", () => {
  const text = id => insights.chartContexts[id].map(card => card.text.en).join(" ");
  assert.match(text("8"), /2025.*February and March.*Gretna.*US 6.*August 2024/);
  assert.doesNotMatch(text("8"), /Combined counts do not establish/);
  assert.match(text("9"), /16th Street.*Council Bluffs.*August 2023.*2024 and 2025.*returning to I-29/);
  assert.match(text("10"), /I-80 west of the Gretna interchange.*May through October.*changed little since 2022/);
  assert.match(text("11"), /I-80, I-680, and I-480.*June and October/);
  assert.match(text("12"), /December 2025.*1.2%.*Nebraska.*0.19%.*Iowa.*January.*February/);
  assert.match(text("13"), /ten counters.*1994.*2020.*pre-2020 peak by 2025/);
  assert.match(text("14"), /0.6% growth from 2022 to 2025.*earlier 1%.*2026-2028.*0.6% annual rate/);
});

test("Strava and shared-mode charts use specific reported peaks and scope", () => {
  const text = id => insights.chartContexts[id].map(card => card.text.en).join(" ");
  assert.match(text("19"), /73,000.*August 2025.*55,000.*September 2024.*15%/);
  assert.match(text("20"), /20,000.*July 2020.*15,000-16,000/);
  assert.match(text("21"), /59,000.*August 2025/);
  assert.match(text("22"), /21,000.*August 2025.*Gretna Crossing Park/);
  assert.match(text("23"), /7,400.*September 2025.*FIRST AVE/);
  for (const id of ["21", "22", "23"]) {
    assert.doesNotMatch(text(id), /Growth in Strava participation|contribution to the recorded/);
  }
  assert.match(text("29"), /2011.*pandemic.*2025/);
  assert.doesNotMatch(text("29"), /2026|free-rides|80 stations/);
  assert.match(insights.contexts["bike-share"][0].text.en, /80 stations.*Bob Kerrey.*Downtown.*Chalco Hills.*Twin Creek/);
  assert.match(text("30"), /373,541.*2025.*June.*July through September.*June 13-23.*cannot be measured/);
});

test("ORBT is a distinct map option under Transit, not a separate topic", () => {
  assert.ok(!topics.some(topic => topic.id === "orbt"));
  assert.ok(topics.find(topic => topic.id === "transit").maps.includes("orbt"));
  const map = sources.maps.find(map => map.id === "orbt");
  assert.equal(map.webmapId, "9cb9e8555b954ac9abee3313f8ec7d8e");
  assert.equal(map.context, "orbt");
  assert.match(insights.contexts.orbt[0].text.en, /Westroads.*downtown Omaha.*10 minutes/);
});

test("fixed-route stops have two distinct context cards without changing productivity observations", () => {
  assert.equal(sources.maps.find(map=>map.id==="fixed-transit").context,"fixed-transit");
  const cards=insights.contexts["fixed-transit"];
  assert.equal(cards.length,2);
  assert.match(cards[0].text.en,/Council Bluffs.*Bellevue.*ORBT is excluded/);
  assert.match(cards[1].text.en,/not a passenger total.*bays.*grouped/);
  assert.equal(insights.contexts.transit.length,3);
  assert.ok(cards.every(card=>card.text.es && card.title.es));
});

test("roadway-class map retains its cards and the table has a separate rebound observation", () => {
  assert.equal(insights.contexts["roadway-classes"].length, 2);
  const cards = insights.tableContexts["roadway-classes"];
  assert.equal(cards.length, 1);
  assert.match(cards[0].text.en, /Six of seven.*2024-2025.*8.3%.*5.1%.*1.9%.*0.1%.*1.5%/);
  assert.ok(cards[0].text.es);
});

test("continuous-counter table has historical context instead of the generic map cards", () => {
  assert.equal(insights.contexts.counters.length, 1);
  assert.ok(!insights.contexts.counters.some(card=>card.title.en==="Location matters"));
  assert.match(insights.contexts.counters[0].text.en, /Ten.*1994/);
  assert.equal(insights.tableContexts.counters.length, 1);
  assert.equal(insights.tableContexts.counters[0].title.en, "Counting since 1994");
  assert.match(insights.tableContexts.counters[0].text.en, /Iowa 914.*A-56/);
});

test("Sarpy's annual gains appear in the chart, not the regional change map", () => {
  assert.ok(!insights.contexts["change-vmt"].some(card => card.title.en === "Sarpy's steady gains"));
  assert.equal(insights.chartContexts["5"][0].title.en, "Sarpy's steady gains");
});

test("district growth appears only in the district VMT change context", () => {
  const growthCards = Object.entries(insights.contexts).flatMap(([context, cards]) =>
    cards.filter(card => card.title.en === "Growth isn't uniform").map(card => ({ context, card })));
  assert.equal(growthCards.length, 1);
  assert.equal(growthCards[0].context, "district-change");
  assert.match(growthCards[0].card.text.en, /2022 and 2025/);
  assert.ok(!insights.contexts["district-change"].some(card => card.title.en === "Faster-growing districts"));
});

test("TAD context explains all-road coverage, calibration, and consistency checks", () => {
  const cards = insights.contexts.districts;
  assert.match(cards[0].text.en, /^Traffic Analysis Districts \(TAD\) are/);
  assert.match(cards[0].text.es, /tráfico \(TAD\) son/);
  assert.deepEqual(cards.map(card => card.title.en), [
    "Small areas, clearer patterns", "Every road included",
    "Adjusted with traffic counts", "Checked along each corridor",
  ]);
  assert.match(cards[1].text.en, /For the first time.*all roads.*StreetLight Insight/);
  assert.match(cards[2].text.en, /short-duration and continuous/);
  assert.match(cards[2].text.en, /Federal Functional Classification \(FFC\) within a TAD/);
  assert.match(cards[2].text.en, /Regional factors/);
  assert.match(cards[3].text.en, /across years.*travel direction.*divided roadways.*intersections/);
  assert.match(cards[3].text.en, /Observed counts took priority/);
  for (const card of cards) {
    for (const language of ["en", "es"]) {
      assert.ok(card.title[language]);
      assert.ok(card.text[language]);
    }
  }
});

test("pedestrian statistics belong to the pedestrian chart, not the counter map", () => {
  const mapCards = insights.contexts["bike-ped"];
  assert.ok(!mapCards.some(card => card.title.en === "Activity at monitored sites"));
  assert.ok(!mapCards.some(card => /1,607|2,443/.test(card.text.en)));
  const chartCards = insights.chartContexts["16"];
  assert.equal(chartCards.length, 2);
  assert.equal(chartCards[0].title.en, "Activity at monitored sites");
  assert.match(chartCards[0].text.en, /2,443.*2020.*1,607.*2025.*34%/);
  assert.match(chartCards[1].text.en, /western approach.*Bob Kerrey Pedestrian Bridge.*2020.*2025/);
});

test("counter map describes partners, continuous monitoring, and the analysis scope", () => {
  const cards = insights.contexts["bike-ped"];
  assert.match(cards[0].text.en, /MAPA.*City of Omaha.*THOR \(Trails Have Our Respect\).*Fontenelle Forest/);
  assert.match(cards[1].text.en, /Permanent counters.*2016.*expanded/);
  assert.match(cards[2].text.en, /Eco-Counter.*City of Omaha locations only.*counter failures and weather/);
  for (const card of cards) {
    for (const language of ["en", "es"]) {
      assert.ok(card.title[language]);
      assert.ok(card.text[language]);
    }
  }
});

test("Transit observations match the productivity, change, and passenger-count views", () => {
  assert.match(insights.contexts.transit[1].text.en, /406.*12 bays.*April 2025/);
  const changes = insights.mapContexts.e2547ddd72254f2ab44c3b4302ebe8e2;
  assert.match(changes[0].text.en, /April 2022.*April 2025/);
  assert.match(changes[1].text.en, /22nd & Cuming.*345.*269.*261/);
  assert.doesNotMatch(changes[1].text.en, /35th.*Broadway/);
  assert.match(insights.contexts.transit[0].text.en, /South Omaha Campus/);
  assert.doesNotMatch(insights.contexts.transit[0].text.en,/Bay 6|266/);
  assert.match(changes[2].text.en, /all stops along Farnam.*streetcar construction/);
  assert.match(insights.chartContexts["26"][0].text.en, /2021.*October 2024.*April 2025.*April 2024/);
  assert.match(insights.chartContexts["26"][1].text.en, /one in six.*April 2025/);
  for (const card of [...insights.contexts.transit, ...changes, ...insights.chartContexts["26"]]) {
    assert.ok(card.title.es);
    assert.ok(card.text.es);
  }
});

test("bicycle chart retains Omaha and national counts without the removed scope card", () => {
  const cards = insights.chartContexts["17"];
  assert.match(cards[0].text.en, /1,122.*2020.*665.*2022.*2023.*2024.*2025.*684.*13%/);
  assert.match(cards[1].text.en, /National.*2023.*2.1%.*recreational.*6.9%.*commuter/);
  assert.equal(cards.length, 2);
  assert.ok(!cards.some(card => card.title.en === "Scope of the counts"));
  for (const card of [...cards, ...insights.chartContexts["16"]]) {
    assert.ok(card.title.es);
    assert.ok(card.text.es);
  }
});
test("VMT total appears in the banner while the side panel explains the harmonized comparison method", () => {
  const cards = insights.contexts["daily-vmt"];
  assert.equal(cards[0].title.en, "Average daily VMT");
  assert.ok(insights.metrics.some(item => item.measure === "total"));
  assert.doesNotMatch(insights.metrics.map(item=>item.detail.en).join(" "), /harmonized|Seven rural TADs/);
  assert.match(cards[0].text.en, /combines.*district values.*thousands/);
  assert.doesNotMatch(cards[0].text.en, /Total average daily VMT in 2025/);
  assert.match(cards[1].text.en, /Traffic Flow.*Metropolitan Area Transportation Systems \(MATS\).*OpenStreetMap \(OSM\)/);
  assert.match(cards[2].text.en, /2022-2025.*2023.*1\.055.*5\.5%.*stable TADs/);
  assert.doesNotMatch(cards[2].text.en, /Traffic Analysis Districts|\(TAD\)/);
  assert.match(cards[2].context.en, /network representation/);
  for (const card of cards) assert.ok(card.title.es && card.text.es);
});

test("FFC context attributes the classifications to FHWA and explains the methodology break", () => {
  const localized=expandLanguages(insights);
  const cards=localized.contexts["roadway-classes"];
  assert.equal(topics.find(topic=>topic.id==="districts").title,"Traffic Analysis Districts");
  assert.equal(topics.find(topic=>topic.id==="roadway-classes").title,"Federal Functional Classification");
  assert.match(cards[0].text.en, /Federal Highway Administration \(FHWA\) defines these classifications/);
  assert.equal(cards[1].title.en,"A change in methodology");
  assert.match(cards[1].text.en,/methodology changed in 2023/);
  assert.match(cards[1].text.en,/not be interpreted as changes in traffic alone/);
  for(const language of ["es","fr","ar","de","zh","ru","ko"]){
    for(const card of cards) assert.ok(card.text[language] && card.text[language]!==card.text.en,language);
    assert.ok(localized.contexts["daily-vmt"][2].text[language]!==localized.contexts["daily-vmt"][2].text.en,language);
  }
});
