export function mapToolPolicy({ rankingKind, fullPage = false, context }) {
  const rankingInset = Boolean(rankingKind) && !fullPage;
  const showLayerControls = !rankingInset && (context !== "orbt" || fullPage);
  return {
    compass: true,
    navigation: !(rankingInset && rankingKind === "transit"),
    layerControls: !showLayerControls ? [] : context === "about-mapa"
      ? [{ name: "legend", position: "bottom-right" }]
      : [{ name: "layer-list", position: "top-right" }, { name: "legend", position: "top-right" }],
  };
}
