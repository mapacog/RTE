import test from "node:test";
import assert from "node:assert/strict";
import { correctedIntersectionCity, fullCityName } from "./locationCorrections.js";
import { normalizeFeature } from "../services/trafficRankings.js";
import { intersectionDetails } from "./intersectionDetails.js";
import { rankingMapWhere } from "../services/rankingMap.js";

test("the full unincorporated county name is used in rankings and details without breaking map filters",()=>{
  const attributes={OBJECTID:43,INTERSECTI:"Highway 92 & County Road",NAME:"Highway interchange",CITY:"Unincorporated Pottawattamie C",COUNTY:"Pottawattamie",Total_25:1000};
  const full="Unincorporated Pottawattamie County";
  assert.equal(fullCityName(attributes.CITY),full);
  assert.equal(fullCityName(full),full);
  for(const kind of ["intersections","interchanges"])assert.equal(normalizeFeature(attributes,kind).city,full);
  assert.equal(intersectionDetails(attributes).location,`${full} · Pottawattamie`);
  assert.ok(rankingMapWhere([{objectId:43}],"city",full,"all").includes("CITY IN ('Unincorporated Pottawattamie C', 'Unincorporated Pottawattamie County')"));
  assert.equal(attributes.CITY,"Unincorporated Pottawattamie C");
});

test("only Abbott Drive & East Locust Street in Pottawattamie is corrected to Carter Lake",()=>{
  const attributes={OBJECTID:42,INTERSECTI:"Abbott Drive & East Locust Street",CITY:"Unincorporated Pottawattamie C",COUNTY:"Pottawattamie",Total_25:50000};
  assert.equal(correctedIntersectionCity(attributes),"Carter Lake");
  assert.equal(normalizeFeature(attributes,"intersections").city,"Carter Lake");
  assert.equal(intersectionDetails(attributes).location,"Carter Lake · Pottawattamie");
  assert.equal(correctedIntersectionCity({...attributes,INTERSECTI:"State Highway 92 & Harry Langdon Boulevard",CITY:"Council Bluffs"}),"Council Bluffs");
  assert.equal(correctedIntersectionCity({...attributes,COUNTY:"Douglas",CITY:"Omaha"}),"Omaha");
});

test("Washington County is written in full while map filters retain the source abbreviation",()=>{
  const attributes={OBJECTID:44,INTERSECTI:"County intersection",NAME:"County interchange",CITY:"Unincorporated Washington Coun",COUNTY:"Washington",Total_25:1000};
  const full="Unincorporated Washington County";
  assert.equal(fullCityName(attributes.CITY),full);
  assert.equal(fullCityName(full),full);
  for(const kind of ["intersections","interchanges"])assert.equal(normalizeFeature(attributes,kind).city,full);
  assert.equal(intersectionDetails(attributes).location,`${full} · Washington`);
  assert.equal(rankingMapWhere([{objectId:44}],"city",full,"all"),"Total_25 >= 0 AND CITY IN ('Unincorporated Washington Coun', 'Unincorporated Washington County')");
  assert.equal(attributes.CITY,"Unincorporated Washington Coun");
});
