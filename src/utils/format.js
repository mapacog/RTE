export function formatNumber(value, locale = "en-US") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value, options = {}) {
  const sign = value > 0 ? "+" : "";
  const digits = options.digits ?? 1;
  return `${sign}${value.toFixed(digits)}%`;
}

export function rankGroupLimit(group) {
  if (group === "Top 10") return 10;
  if (group === "Top 50") return 50;
  return 500;
}
