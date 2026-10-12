export default function MetricCard({ icon: Icon, label, value, valueLabel, detail, tone = "blue", href, className = "" }) {
  const Element = href ? "a" : "article";
  return (
    <Element href={href} className={`metric-card tone-${tone} ${className}`}>
      <div className="metric-icon" aria-hidden="true">
        {Icon ? <Icon size={21} strokeWidth={2.2} /> : null}
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {valueLabel ? <small className="metric-value-label">{valueLabel}</small> : null}
        <span>{detail}</span>
      </div>
    </Element>
  );
}
