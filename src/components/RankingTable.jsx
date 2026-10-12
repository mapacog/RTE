import { formatNumber } from "../utils/format";
import { usePreferences } from "./Preferences";

export default function RankingTable({ rows, selectedId, onSelect, title, showCounty = false, showCity = false, showLegs = true, emptyMessage }) {
  const { t } = usePreferences();
  if (!rows.length) {
    return (
      <div className="ranking-shell">
        <article className="empty-state">
          <h3>{t("No ranked locations")}</h3>
          <p>{emptyMessage || "Choose another jurisdiction or a broader rank group."}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="ranking-shell">
      <div className="table-wrap" role="region" aria-label={title} tabIndex={0}>
        <table className="ranking-table">
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{t("Rank")}</th>
              <th scope="col">{t("Location")}</th>
              {showCity ? <th scope="col">{t("City")}</th> : null}
              {showCounty ? <th scope="col">{t("County")}</th> : null}
              <th scope="col">{t("Legs total")}</th>
              {showLegs?<><th scope="col" aria-label={t("North")}>N Leg</th><th scope="col" aria-label={t("East")}>E Leg</th><th scope="col" aria-label={t("South")}>S Leg</th><th scope="col" aria-label={t("West")}>W Leg</th></>:null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.id === selectedId ? "is-selected" : ""}>
                <td>#{row.rank}</td>
                <td>
                  <button type="button" onClick={() => onSelect(row)} aria-pressed={row.id === selectedId}>
                    {row.name}
                  </button>
                </td>
                {showCity ? <td>{row.city || "Unassigned"}</td> : null}
                {showCounty ? <td>{row.county || "Unassigned"}</td> : null}
                <td>{formatNumber(row.aadt)}</td>
                {showLegs?<>
                  <td>{row.legs.north == null ? t("Not reported") : formatNumber(row.legs.north)}</td>
                  <td>{row.legs.east == null ? t("Not reported") : formatNumber(row.legs.east)}</td>
                  <td>{row.legs.south == null ? t("Not reported") : formatNumber(row.legs.south)}</td>
                  <td>{row.legs.west == null ? t("Not reported") : formatNumber(row.legs.west)}</td>
                </>:null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ranking-cards" aria-label={`${title} cards`}>
        {rows.map((row) => (
          <button
            className={`ranking-card ${row.id === selectedId ? "is-selected" : ""}`}
            type="button"
            key={row.id}
            onClick={() => onSelect(row)}
            aria-pressed={row.id === selectedId}
          >
            <span>#{row.rank}</span>
            <strong>{row.name}</strong>
            <em>{formatNumber(row.aadt)} AADT</em>
            {showCity ? <small>{row.city || "City unassigned"}</small> : null}
            {showCounty ? <small>{row.county ? `${row.county} County` : "County unassigned"}</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
