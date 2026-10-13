const functionalClasses = ["Interstate", "Freeway", "Principal Arterial", "Minor Arterial", "Major Collector", "Minor Collector", "Local"];

export function compareReportCells(left, right, tableId, column) {
  if (tableId === "ffc" && column === 0) {
    const position = value => {
      const index = functionalClasses.indexOf(value);
      return index < 0 ? functionalClasses.length : index;
    };
    return position(left) - position(right);
  }
  return typeof left === "number" && typeof right === "number"
    ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
}
