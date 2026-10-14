import { Activity, Car, MapPinned, TrendingUp } from "lucide-react";
import { ListenButton, usePreferences } from "./Preferences";
import insights from "../data/reportInsights";
import { insightReadingText, localizedInsightText } from "../utils/insightReading";
import ruralVmt from "../data/ruralVmt.json";
import { harmonizedVmtChange } from "../utils/vmtComparison";
import { languageLocale } from "../utils/localization";

export function RegionalHighlights() {
  const { language, t } = usePreferences();
  const icons = { car: Car, growth: TrendingUp, pin: MapPinned, activity: Activity };
  return <div className="report-highlight-metrics">
    {insights.metrics.map(item => {
      const Icon = icons[item.icon];
      return <article className={`report-highlight tone-${item.tone}`} key={item.label}>
        <Icon size={21} aria-hidden="true" />
        <p>{t(item.label)}</p><strong>{item.measure === "total" ? new Intl.NumberFormat(languageLocale(language)).format(19502609) :
          item.measure === "rural" ? new Intl.NumberFormat(languageLocale(language), {style:"percent",maximumFractionDigits:1,signDisplay:"exceptZero"}).format(harmonizedVmtChange(ruralVmt.districts).change) : item.value}</strong><span>{item.detail[language]}</span>
      </article>;
    })}
  </div>;
}

export default function InsightCards({ cards = [] }) {
  const { language } = usePreferences();
  return <div className="insight-cards">
    {cards.map((card, index) => <article className="insight-card" key={index}>
      <div className="insight-card-heading">
        <h4>{localizedInsightText(card.title, language)}</h4>
        <ListenButton text={insightReadingText(card, language)} subject={localizedInsightText(card.title, language)}/>
      </div>
      {card.text?<p>{localizedInsightText(card.text,language)}</p>:null}
      {card.context?<p className="insight-card-context">{localizedInsightText(card.context,language)}</p>:null}
      {card.items?<ul>{card.items.map(item=><li key={item.label}><strong>{localizedInsightText(item.label,language)}</strong><span>{localizedInsightText(item.value,language)}</span></li>)}</ul>:null}
    </article>)}
  </div>;
}
