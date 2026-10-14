export function chartLayout(chart, availableWidth, fullSize = false) {
  const nativeWidth = chart.width || 600;
  const nativeHeight = chart.height || 400;
  const width = fullSize ? nativeWidth : Math.min(nativeWidth, Math.max(1, availableWidth));
  const scale = width / nativeWidth;
  return { nativeWidth, nativeHeight, scale,
    width, height: Math.ceil(nativeHeight * scale) };
}
