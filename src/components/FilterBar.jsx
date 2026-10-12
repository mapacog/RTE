import { useId } from "react";
import { usePreferences } from "./Preferences";

export default function FilterBar({ filters }) {
  const prefix = useId();
  const { t } = usePreferences();
  return (
    <div className="filter-bar" aria-label="Data filters">
      {filters.map((filter) => (
        <div className="field" key={filter.id}>
          <label htmlFor={`${prefix}-${filter.id}`}>{t(filter.label)}</label>
          <select id={`${prefix}-${filter.id}`} value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
