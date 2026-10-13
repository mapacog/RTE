from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"

SOURCE_PATHS = {
    "regional": Path(r"C:\Users\Ayodele\Downloads\Regional-Traffic-Patterns-2022 (1).pdf"),
    "intersections": Path(r"C:\Users\Ayodele\Downloads\Top-Traffic-Intersections-2022.pdf"),
    "interchanges": Path(r"C:\Users\Ayodele\Downloads\Top-Traffic-Interchanges-2022.pdf"),
    "brand": Path(r"C:\Users\Ayodele\Documents\MAPA_GIS\MAPA Brand\MAPA_Brand Identity Guide.pdf"),
}


def number(value: str) -> int:
    return int(value.replace(",", ""))


def tidy(text: str) -> str:
    replacements = {
        "\ufb00": "ff",
        "\ufb01": "fi",
        "\ufb02": "fl",
        "\ufb03": "ffi",
        "\ufb04": "ffl",
        "\u2019": "'",
        "\u2013": "-",
        "\u2014": "-",
        "\u00a0": " ",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s*&\s*", " & ", text)
    text = re.sub(r"\s*/\s*", " / ", text)
    text = re.sub(r"\b([A-Z])St\b", r"\1 St", text)
    text = re.sub(r"\b([A-Z])Ave\b", r"\1 Ave", text)
    text = re.sub(r"\b([A-Z])Rd\b", r"\1 Rd", text)
    text = re.sub(r"\b(I-\d+)([A-Z]{2})\b", r"\1 \2", text)
    text = text.replace("StHwy", "State Hwy")
    text = text.replace("Frwy", "Freeway")
    text = text.replace("Expwy", "Expressway")
    text = text.replace("Pkwy", "Parkway")
    text = text.replace("Conn", "Connector")
    text = text.replace("Ent/Ex", "Entrance/Exit")
    return text


def percent_marker(index: int, count: int, band: int) -> dict[str, float]:
    # Placeholder map placement only. Replace with hosted GIS geometry when layer URLs are connected.
    columns = 8
    row = index // columns
    col = index % columns
    jitter = (index * 17 + band * 11) % 9
    max_rows = max(1, (count + columns - 1) // columns)
    return {
        "x": round(12 + col * (76 / max(1, columns - 1)) + jitter * 0.25, 2),
        "y": round(18 + row * (62 / max(1, max_rows - 1)) + ((jitter % 4) * 0.6), 2),
    }


def parse_intersections() -> list[dict]:
    reader = PdfReader(str(SOURCE_PATHS["intersections"]))
    rows = []
    county = None
    row_pattern = re.compile(
        r"^\s*(\d+)\s+(.+?)\s+([\d,]+|0)\s+([\d,]+|0)\s+([\d,]+|0)\s+([\d,]+|0)\s+([\d,]+)\s+(\d+)\s*$"
    )

    for page_index in range(6, len(reader.pages)):
        text = reader.pages[page_index].extract_text(extraction_mode="layout") or ""
        for line in text.splitlines():
            if "Douglas" in line and "Rank" not in line:
                county = "Douglas"
            if "Sarpy" in line and "Rank" not in line:
                county = "Sarpy"
            if "Pott" in line and "Rank" not in line:
                county = "Pottawattamie"

            match = row_pattern.match(line)
            if not match:
                continue

            county_rank, name, north, east, south, west, total, regional_rank = match.groups()
            rows.append(
                {
                    "id": f"intersection-{len(rows) + 1}",
                    "regionalRank": int(regional_rank),
                    "countyRank": int(county_rank),
                    "county": county,
                    "name": tidy(name),
                    "aadt": number(total),
                    "legs": {
                        "north": number(north),
                        "east": number(east),
                        "south": number(south),
                        "west": number(west),
                    },
                    "source": "Top Traffic Intersections 2021-2022, Table 1-3",
                    "geometryStatus": "sample data pending source GIS layer/table",
                    "mapPosition": percent_marker(len(rows), 527, 1),
                }
            )

    return sorted(rows, key=lambda item: (item["regionalRank"], item["county"], item["countyRank"]))


def parse_interchanges() -> list[dict]:
    reader = PdfReader(str(SOURCE_PATHS["interchanges"]))
    rows = []
    row_pattern = re.compile(
        r"^\s*(\d+)\s+(.+?)\s+([\d,]+(?:\.\d+)?|0)\s+([\d,]+(?:\.\d+)?|0)\s+([\d,]+(?:\.\d+)?|0)\s+([\d,]+(?:\.\d+)?|0)\s+([\d,]+(?:\.\d+)?)\s*$"
    )

    for page_index in range(4, len(reader.pages)):
        text = reader.pages[page_index].extract_text(extraction_mode="layout") or ""
        for line in text.splitlines():
            match = row_pattern.match(line)
            if not match:
                continue

            rank, name, north, east, south, west, total = match.groups()
            rows.append(
                {
                    "id": f"interchange-{len(rows) + 1}",
                    "regionalRank": int(rank),
                    "name": tidy(name),
                    "aadt": number(total),
                    "legs": {
                        "north": number(north),
                        "east": number(east),
                        "south": number(south),
                        "west": number(west),
                    },
                    "source": "Top Traffic Interchanges 2021-2022, Table 1",
                    "geometryStatus": "sample data pending source GIS layer/table",
                    "mapPosition": percent_marker(len(rows), 90, 2),
                }
            )

    return sorted(rows, key=lambda item: item["regionalRank"])


def brand_tokens() -> dict:
    return {
        "source": "MAPA Brand Identity Guide, pages 14-27",
        "notes": [
            "Logo should not be distorted, recolored, slanted, shadowed, or placed on competing backgrounds.",
            "Maintain clear space around the logo; the brand guide defines minimum space by the swoosh height.",
            "Roboto is the primary typeface for long copy. Oswald is the secondary typeface for all-caps headlines and subheads.",
            "Landscape graphics and arrow motifs should stay in approved MAPA colors and should not be stretched or recolored.",
        ],
        "colors": {
            "mapaBlue": "#007CAB",
            "teal": "#004B58",
            "mapaGrey": "#888C86",
            "darkNeutral": "#4C4C4E",
            "lightNeutral": "#B9B9BA",
            "coral": "#FF4540",
            "yellow": "#FCBD33",
            "mint": "#83C8BB",
            "peach": "#F9AC89",
            "white": "#FFFFFF",
            "paper": "#F7FAFA",
        },
        "typography": {
            "primary": "Roboto",
            "secondary": "Oswald",
            "fallbackSans": "Arial, Helvetica, sans-serif",
            "headlineStyle": "Oswald Light or Regular, all caps where appropriate",
        },
        "spacing": {
            "logoMinWidth": "1.5in in print; use 144px minimum for this web prototype",
            "cardRadius": "8px",
            "sectionGap": "clamp(48px, 7vw, 88px)",
        },
        "graphicStyle": {
            "primary": "landscape/map pattern in MAPA brand colors",
            "secondary": "arrow motif in fixed brand color order",
            "webUse": "subtle map texture, title bars, and restrained multicolor route lines",
        },
    }


def regional_metrics() -> dict:
    return {
        "source": "Regional Traffic Patterns 2021-2022",
        "vmtExplanation": "Vehicle miles traveled estimates how much traffic is moving through an area by combining road length and traffic volume.",
        "headlineMetrics": {
            "regionalVmtChangeSince2020": 13.4,
            "reportedOverallVmtChangeSince2020": 13.0,
            "douglasCountyVmtChange": 13.0,
            "sarpyCountyVmtChange": 15.0,
            "pottawattamieAndMillsCountyVmtChange": 13.0,
            "urbanCoreVmtChange": 10.0,
            "omahaCbdVmtChange": -2.0,
            "vmtDecrease2018To2020": -8.0,
        },
        "trafficAnalysisDistricts": [
            {
                "name": "Urban core",
                "change": 10.0,
                "description": "Traffic rebounded after 2020, but more slowly than outer growth areas.",
                "sourceStatus": "report text value",
            },
            {
                "name": "Omaha central business district",
                "change": -2.0,
                "description": "The report notes a small VMT decline from 2020 to 2022 in the CBD.",
                "sourceStatus": "report text value",
            },
            {
                "name": "Suburban and exurban districts",
                "change": 14.0,
                "description": "Growth districts appear more affected by new development and post-2020 recovery.",
                "sourceStatus": "sample midpoint based on county-level report values; pending TAD GIS table",
            },
        ],
        "countyChanges": [
            {"name": "Douglas County", "change": 13.0},
            {"name": "Sarpy County", "change": 15.0},
            {"name": "Pottawattamie and Mills Counties", "change": 13.0},
        ],
        "federalFunctionalClass": [
            {"className": "Interstate", "centerlineMiles": 189, "change2018_2019": 2.0, "change2019_2020": -16.3, "change2020_2021": 14.9, "change2021_2022": 2.8},
            {"className": "Freeway", "centerlineMiles": 133, "change2018_2019": 2.4, "change2019_2020": -7.3, "change2020_2021": 11.4, "change2021_2022": 6.5},
            {"className": "Principal Arterial", "centerlineMiles": 182, "change2018_2019": 3.1, "change2019_2020": -11.7, "change2020_2021": 7.3, "change2021_2022": 2.3},
            {"className": "Minor Arterial", "centerlineMiles": 391, "change2018_2019": 4.9, "change2019_2020": -9.0, "change2020_2021": 6.8, "change2021_2022": 0.5},
            {"className": "Major Collector", "centerlineMiles": 375, "change2018_2019": 14.8, "change2019_2020": -10.8, "change2020_2021": 8.3, "change2021_2022": -2.2},
            {"className": "Minor Collector", "centerlineMiles": 151, "change2018_2019": 27.2, "change2019_2020": -14.1, "change2020_2021": 8.4, "change2021_2022": 1.7},
            {"className": "Local", "centerlineMiles": 554, "change2018_2019": -3.0, "change2019_2020": -3.3, "change2020_2021": 3.1, "change2021_2022": 1.8},
        ],
        "trafficCounters": {
            "activeRegionalAtrCount": 15,
            "nebraskaAtrCount": 10,
            "iowaAtrCount": 5,
            "activeSince1994": 10,
        },
        "freight": {
            "fafRegion": "Omaha-Council Bluffs-Fremont, NE-IA CFS Area (NE Part), FAF Region 311",
            "truckNetworkFreightThousandTons2017": 3928463,
            "regionalTruckFreightThousandTons2017": 87046,
            "regionalShareOfTruckFreight": 2.2,
            "projectedDailyTruckVolumeGrowthBy2050": 76.0,
        },
        "multimodal": {
            "permanentBikePedCounters": 6,
            "stravaCommuteShare2022": 8.0,
            "orbtShareOfMetroRidership": 20.0,
            "heartlandBikeShareStations2022": 91,
            "eScooterTrips2022": 141673,
        },
        "sampleSeriesNote": "Values in sparkline and map-position series are sample data pending source GIS layer/table when not directly available in extracted PDF text.",
        "districtSeries": [
            {"label": "Urban core", "values": [92, 88, 100, 110]},
            {"label": "Suburban districts", "values": [96, 89, 103, 115]},
            {"label": "Exurban growth areas", "values": [94, 85, 108, 121]},
        ],
        "arcgisLayerPlaceholders": [
            {"name": "Traffic Analysis District layer", "url": "", "status": "pending hosted ArcGIS Feature Layer URL"},
            {"name": "Intersection points layer", "url": "", "status": "pending hosted ArcGIS Feature Layer URL"},
            {"name": "Interchange points layer", "url": "", "status": "pending hosted ArcGIS Feature Layer URL"},
            {"name": "Traffic flow/AADT layer", "url": "", "status": "pending hosted ArcGIS Feature Layer URL"},
            {"name": "Heat map layer", "url": "", "status": "pending hosted ArcGIS Feature Layer URL"},
        ],
    }


def dashboard_cards(intersections: list[dict], interchanges: list[dict]) -> dict:
    busiest_intersection = intersections[0]
    busiest_interchange = interchanges[0]
    return {
        "source": "Derived from MAPA traffic reports and Brand Identity Guide",
        "heroMetrics": [
            {
                "label": "Regional VMT change since 2020",
                "value": "+13.4%",
                "detail": "Estimated regional growth from 2020 to 2022.",
                "tone": "blue",
            },
            {
                "label": "Busiest intersection",
                "value": busiest_intersection["name"],
                "detail": f"{busiest_intersection['aadt']:,} AADT",
                "tone": "coral",
            },
            {
                "label": "Busiest interchange",
                "value": busiest_interchange["name"],
                "detail": f"{busiest_interchange['aadt']:,} AADT",
                "tone": "teal",
            },
            {
                "label": "Data categories",
                "value": "6",
                "detail": "Regional patterns, intersections, interchanges, freight, transit, and other modes.",
                "tone": "yellow",
            },
        ],
        "whatThisToolShows": [
            "How daily traffic volumes changed after 2020.",
            "Where the region's busiest intersections and interchanges are concentrated.",
            "How freight, transit, bike, pedestrian, scooter, and bike share activity fit into the larger mobility picture.",
            "How MAPA report data supports local planning and public decisions.",
        ],
        "themes": [
            {"name": "Regional travel", "description": "VMT trends by county, district, and roadway class.", "sourceStatus": "report values"},
            {"name": "Top intersections", "description": "County and regional rankings with directional leg volumes.", "sourceStatus": "parsed report table"},
            {"name": "Top interchanges", "description": "Regional interchange rankings with leg totals.", "sourceStatus": "parsed report table"},
            {"name": "Freight", "description": "FAF truck-flow context and 2050 growth signal.", "sourceStatus": "report values"},
            {"name": "Transit and ORBT", "description": "Ridership context and rapid bus service overview.", "sourceStatus": "report values and summary text"},
            {"name": "Bike, pedestrian, scooter, and bike share", "description": "Activity counters, Strava, bike share, and scooter trip summaries.", "sourceStatus": "report values and summary text"},
        ],
    }


def write_json(name: str, payload: dict | list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / name
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    intersections = parse_intersections()
    interchanges = parse_interchanges()
    write_json("topIntersections.json", intersections)
    write_json("topInterchanges.json", interchanges)
    write_json("regionalMetrics.json", regional_metrics())
    write_json("dashboardCards.json", dashboard_cards(intersections, interchanges))
    write_json("brandTokens.json", brand_tokens())
    print(f"Wrote {len(intersections)} intersections and {len(interchanges)} interchanges.")


if __name__ == "__main__":
    main()
