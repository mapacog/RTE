import json
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl

source = Path(sys.argv[1])
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
sheet = workbook["Ranked Stops"]
rows = sheet.iter_rows(values_only=True)
headers = next(rows)
grouped = defaultdict(list)
for values in rows:
    row = dict(zip(headers, values))
    if row.get("StopName"):
        grouped[row["RankLocation"]].append(row)

groups = []
for name, members in grouped.items():
    if len(members) <= 1:
        continue
    rates = {float(member["RankActVisit"]) for member in members}
    if len(rates) != 1:
        raise ValueError(f"Inconsistent calculated group average: {name}")
    groups.append({"name": name, "stopCodes": [str(member["StopCode"]).strip() for member in members],
                   "averageActivity2025": rates.pop() * 100})

result = {"source": source.name, "sheet": sheet.title, "groupField": "RankLocation", "averageField": "RankActVisit",
          "units": "RankActVisit multiplied by 100: passenger activity per 100 scheduled visits", "groups": groups}
target = Path(__file__).resolve().parents[1] / "src" / "data" / "transitGroups.json"
target.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(f"Prepared {len(groups)} groups from the workbook's calculated averages; the workbook is unchanged.")
