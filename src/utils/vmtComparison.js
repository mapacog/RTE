export function harmonizedVmtChange(districts) {
  if (!districts.length) return null;
  let baseline = 0, current = 0;
  for (const district of districts) {
    const previous = district.SUM_VMT_2022_HARM, latest = district.SUM_VMT_25;
    if (typeof previous !== "number" || !Number.isFinite(previous) || previous <= 0 ||
        typeof latest !== "number" || !Number.isFinite(latest) || latest < 0) return null;
    baseline += previous;
    current += latest;
  }
  return { baseline, current, change: current / baseline - 1 };
}
