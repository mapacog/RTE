import json
import math
import sys
from pathlib import Path

import openpyxl

source = Path(sys.argv[1])
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
sheet = workbook["Annual ATR Records"]
rows = sheet.iter_rows(values_only=True)
headers = next(rows)
years = [(index, int(value)) for index, value in enumerate(headers)
         if isinstance(value, (int, float)) and 1994 <= value <= 2025]
stations = {}
for row_number, row in enumerate(rows, 2):
    if len(row) > 1 and row[1] == "MAP_ID":
        break
    if len(row) < 8 or row[2] not in ("Iowa", "Nebraska"):
        continue
    state = "IA" if row[2] == "Iowa" else "NE"
    station = str(int(row[1])) if isinstance(row[1], (int, float)) else str(row[1]).removeprefix("A-")
    if not station.isdigit():
        continue
    key = f"{state}-{int(station)}"
    history = {str(year): row[index] for index, year in years if index < len(row)
               and isinstance(row[index], (int, float)) and math.isfinite(row[index]) and row[index] >= 0}
    if key in stations:
        raise ValueError(f"Duplicate annual station: {key}")
    stations[key] = {"station": str(int(row[1])) if isinstance(row[1], (int, float)) else str(row[1]), "state": row[2], "route": row[5], "roadwayClass": row[6],
                     "location": row[7], "history": history, "sourceRow": row_number}

# Use the NDOT summary-table value requested for A-40; preserve workbook provenance.
stations["NE-40"]["history"]["2025"] = 96224
stations["NE-40"]["reportOverride"] = {
    "year": 2025, "value": 96224, "workbookValue": 96808,
    "source": "2025 Continuous Traffic Count Data and Traffic Characteristics on Nebraska Streets and Highways",
    "page": 3, "url": "https://govdocs.nebraska.gov/epubs/R6000/S009-2025.pdf",
    "reason": "User selected the NDOT annual summary-table value; the detailed station sheet lists 96808."
}

target = Path(__file__).resolve().parents[1] / "src" / "data" / "counterVolumes.json"
target.write_text(json.dumps({"source": source.name, "sheet": sheet.title, "measure": "Annual average daily traffic",
                             "stations": stations}, indent=2) + "\n", encoding="utf-8")
print(f"Prepared annual records for {len(stations)} stations, including {sum('2025' in s['history'] for s in stations.values())} with 2025 AADT. Source workbook unchanged.")
