import test from "node:test";
import assert from "node:assert/strict";
import { counterChartGeometry,createCounterChart,counterDataCoverage,counterExportBounds,counterExportLabels } from "./counterChart.js";
import { popupModel,createPopupContent } from "./mapPopups.js";
const layer={url:"https://example.com/MAPA_ATR/FeatureServer/0"};

test("chart exports add equal outer padding without moving the on-screen plot",()=>{
  for(const viewBox of [{x:0,y:0,width:760,height:310},{x:0,y:0,width:360,height:250}]){
    const bounds=counterExportBounds(viewBox);
    assert.equal(bounds.x,-32);assert.equal(bounds.y,-32);
    assert.equal(bounds.width,viewBox.width+64);assert.equal(bounds.height,viewBox.height+64);
    assert.equal(bounds.x+bounds.width-viewBox.width,32);
    assert.equal(bounds.y+bounds.height-viewBox.height,32);
    assert.equal(viewBox.x,0);assert.equal(viewBox.y,0);
  }
});

test("download labels include every reported value without overlapping on the full-history chart",()=>{
  const model=popupModel(layer,{state:"NE",Name:"A-17"});
  const labels=counterExportLabels(model.chartSeries);
  assert.equal(labels.length,32);assert.equal(labels[0].text,"39,684");assert.equal(labels.at(-1).text,"81,322");
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
    const a=labels[i].box,b=labels[j].box;
    assert.ok(!(a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top),`Years ${labels[i].year} and ${labels[j].year} overlap`);
  }
});

test("counter charts retain available years, real zeros, and gaps without fabricating values",()=>{
  const result=counterChartGeometry([{year:2025,amount:96224},{year:2022,amount:0},{year:2024,amount:95982}]);
  assert.deepEqual(result.points.map(point=>point.year),[2022,2024,2025]);
  assert.equal(result.points[0].y,174);
  assert.deepEqual(result.segments.map(points=>points.length),[1,2]);
  assert.equal(result.ceiling,100000);
  assert.equal(counterChartGeometry([]),null);
  assert.equal(counterChartGeometry([{year:2025,amount:1}]).points[0].x,182);
  assert.deepEqual(counterDataCoverage([{year:2022,amount:0},{year:2024,amount:5},{year:2025,amount:6}]),{ranges:[{first:2022,last:2022},{first:2024,last:2025}],gaps:[{first:2023,last:2023}]});
  const iowa=popupModel(layer,{state:"IA",Station_Id:"102"});
  assert.deepEqual(counterDataCoverage(iowa.chartSeries),{ranges:[{first:1994,last:2018},{first:2020,last:2025}],gaps:[{first:2019,last:2019}]});
  assert.equal(counterChartGeometry(iowa.chartSeries).gaps.length,1);
});

test("every year in the station record renders a labeled, focusable chart point",()=>{
  const doc={createElement:tag=>({tag,children:[],attributes:{},append(...items){this.children.push(...items);},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){}})};
  doc.createElementNS=(_,tag)=>doc.createElement(tag);
  const model=popupModel(layer,{state:"NE",Name:"A-17"});
  const chart=createCounterChart(model,doc),circles=chart.children[1].children.filter(node=>node.tag==="circle");
  assert.equal(circles.length,32);
  assert.equal(circles[0].attributes["aria-label"],"1994: 39,684 AADT");
  assert.equal(circles.at(-1).attributes.tabindex,"0");
  assert.equal(circles.at(-1).attributes["aria-label"],"2025: 81,322 AADT");
  assert.equal(popupModel(layer,{state:"NE",Name:"A-17"},"fr").chartLabel,"AADT par année");
  const popup=createPopupContent(model,doc);
  assert.ok(!popup.children.some(node=>node.className==="traffic-popup-chart"));
  const exported=createCounterChart(model,doc,{width:760,height:310,dataLabels:true});
  assert.equal(exported.children[1].children.filter(node=>node.attributes.class==="counter-export-label").length,32);
  assert.equal(chart.children[1].children.filter(node=>node.attributes.class==="counter-export-label").length,0);
});
