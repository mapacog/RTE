import volumes from "../data/counterVolumes.json" with {type:"json"};

export function counterVolumeRecord(attributes) {
  const state=String(attributes.state || "").trim().toUpperCase();
  const code=["IA","IOWA"].includes(state) || Number(attributes.State_Code)===19?"IA":
    ["NE","NEBRASKA"].includes(state) || Number(attributes.State_Code)===31?"NE":null;
  const station=String(attributes.Station_Id || attributes.Name || "").trim().replace(/^A-?/i,"");
  if(!code || !/^\d+$/.test(station))return null;
  return volumes.stations[`${code}-${Number(station)}`] || null;
}
