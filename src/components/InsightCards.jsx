import { Activity, Car, MapPinned, TrendingUp } from "lucide-react";
import { ListenButton, usePreferences } from "./Preferences";
import insights from "../data/reportInsights.json";
import { insightReadingText, localizedInsightText } from "../utils/insightReading";

export function RegionalHighlights() {
  const { language, t } = usePreferences();
  const icons = { car: Car, growth: TrendingUp, pin: MapPinned, activity: Activity };
  return <div className="report-highlight-metrics">
    {insights.metrics.map(item => {
      const Icon = icons[item.icon];
      return <article className={`report-highlight tone-${item.tone}`} key={item.label}>
        <Icon size={21} aria-hidden="true" />
        <p>{t(item.label)}</p><strong>{item.value}</strong><span>{item.detail[language]}</span>
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
      {card.text?<p>{typeof card.text === "string" ? card.text : card.text[language]}</p>:null}
      {card.context?<p className="insight-card-context">{typeof card.context === "string" ? card.context : card.context[language]}</p>:null}
      {card.items?<ul>{card.items.map(item=><li key={item.label}><strong>{item.label}</strong><span>{item.value}</span></li>)}</ul>:null}
    </article>)}
  </div>;
}
