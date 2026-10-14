export function fullCityName(value) {
  const city = String(value ?? "").trim();
  if (/^Unincorporated Washington Coun(?:ty)?$/i.test(city)) return "Unincorporated Washington County";
  return /^Unincorporated Pottawattamie C(?:ounty)?$/i.test(city) ? "Unincorporated Pottawattamie County" : city;
}

export function correctedIntersectionCity(attributes) {
  const name = String(attributes.INTERSECTI || "").trim().replace(/\s+/g, " ").toLowerCase();
  return name === "abbott drive & east locust street" && String(attributes.COUNTY || "").trim().toLowerCase() === "pottawattamie"
    ? "Carter Lake" : fullCityName(attributes.CITY);
}
