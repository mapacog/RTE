import { formatNumber } from "../utils/format";
import { usePreferences } from "./Preferences";

const directions = [
  ["north", "North"],
  ["east", "East"],
  ["south", "South"],
  ["west", "West"],
];

export default function DetailCard({ item, label }) {
  const { t } = usePreferences();
  if (!item) {
    return (
      <article className="detail-card empty-state">
        <h3>Select a location</h3>
        <p>Choose a ranked location from the table to view directional traffic volumes.</p>
      </article>
    );
  }

  const maxLeg = Math.max(...directions.map(([key]) => item.legs?.[key] ?? 0), 1);

  return (
    <article className="detail-card">
      <div className="detail-rank">#{item.rank}</div>
      <p className="eyebrow">{label}</p>
      <h3>{item.name}</h3>
      <div className="detail-total">
        <strong>{formatNumber(item.aadt)}</strong>
        <span>AADT</span>
      </div>

      <div className="leg-bars" aria-label="Directional leg volumes">
        {directions.map(([key, direction]) => {
          const value = item.legs?.[key];
          return (
            <div className="leg-row" key={key}>
              <span>{t(direction)}</span>
              <div className="leg-track">
                <i style={{ width: `${value == null ? 0 : (value / maxLeg) * 100}%` }} />
              </div>
              <strong>{value == null ? t("Not reported") : formatNumber(value)}</strong>
            </div>
          );
        })}
      </div>

    </article>
  );
}
