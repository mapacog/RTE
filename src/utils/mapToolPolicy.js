export function mapToolPolicy({ rankingKind, fullPage = false, context }) {
  const rankingInset = Boolean(rankingKind) && !fullPage;
  return {
    compass: true,
    navigation: !(rankingInset && rankingKind === "transit"),
    layersAndLegend: !rankingInset && (context !== "orbt" || fullPage),
  };
}
