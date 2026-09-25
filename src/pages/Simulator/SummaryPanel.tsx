import { Link } from 'react-router'
import RichText from '../../components/RichText'
import { METRICS, metricByKey, type MetricKey } from '../../engine/metrics'
import { compositeScore, displayValue, fmt, fmtDisplay, metricProgress, passWith, worstMetric } from '../../engine/scoring'
import { useElementWidth } from '../../hooks/useElementWidth'
import MetricChart from './MetricChart'
import { METRIC_TEXT } from './metricText'
import type { Series } from './types'

interface Props {
  series: Series[]
  selected: MetricKey | null
  step: number | null
  onClearComparison: () => void
}

/** The sticky panel above the charts: an overall verdict, or the selected diagnostic drawn large. */
export default function SummaryPanel({ series, selected, step, onClearComparison }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>(260)

  if (!series.length) {
    return (
      <div className="bigchart">
        <div className="bcsub" style={{ padding: '1rem 0.4rem' }}>
          Overlay one or more methods from the list (the pulse icon) to see their diagnostics here.
        </div>
      </div>
    )
  }

  const first = series[0]
  const { avg, base, moveCount } = first
  const legend = series.length > 1 && (
    <div className="oplg">
      {series.map((entry) => (
        <span key={entry.id}>
          <i style={{ background: entry.color }} />
          {entry.name}
        </span>
      ))}
      <span className="oplg-clear" onClick={onClearComparison}>
        clear comparison
      </span>
    </div>
  )

  if (!selected) {
    const passes = METRICS.filter((metric) => passWith(metric, avg[metric.key][moveCount], base)).length
    const score = Math.round(compositeScore(avg, base) * 100)
    const worst = worstMetric(avg, base)
    const fails = METRICS.filter((metric) => !passWith(metric, avg[metric.key][moveCount], base)).map((metric) => metric.title)
    const verdict = fails.length
      ? `Still short on: ${fails.join(', ')}.`
      : 'This sequence randomizes the deck: every diagnostic reaches random.'
    return (
      <div className="bigchart">
        <div className="bctitle">
          <span>How random is the deck?</span>
        </div>
        <div className={`bcval ${passes === METRICS.length ? 'pass' : 'fail'}`}>{score}% randomized</div>
        <div className="bcsub">
          {passes} / {METRICS.length} diagnostics cleared · limited by {worst.metric.title} ({Math.round(worst.progress * 100)}%). {verdict}
          {' '}Click any diagnostic below for detail, or compare methods further down.
        </div>
        {legend}
      </div>
    )
  }

  const metric = metricByKey(selected)
  const text = METRIC_TEXT[metric.key]
  const baseline = base[metric.key]
  const fin = avg[metric.key][moveCount]
  const pct = !metric.raw
  const rnd = pct ? '100%' : fmt(baseline.mean, metric.key)
  const thr = pct ? `${Math.round(displayValue(metric, baseline.threshold, avg, base))}%` : fmt(baseline.threshold, metric.key)
  const rule =
    metric.side === 'band'
      ? `pass ${fmt(baseline.low!, metric.key)} – ${fmt(baseline.high!, metric.key)} (random ${fmt(baseline.mean, metric.key)})`
      : metric.side === 'two'
        ? `pass within ±${fmt(baseline.threshold, metric.key)} of random (${fmt(baseline.mean, metric.key)})`
        : `pass ${metric.side === 'high' ? '≥' : '≤'} ${thr}`

  return (
    <div className="bigchart">
      <div className="bctitle">
        <span>{metric.title}</span>
        <span className="bcval">{Math.round(metricProgress(metric, avg, base) * 100)}% randomized</span>
      </div>
      <div ref={ref} className="chart-plot">
        <MetricChart metric={metric} series={series} width={width} big step={step} />
      </div>
      <div className="bcsub">
        <RichText text={text.desc} /> <Link to={text.writeup.to}>{text.writeup.label}</Link>. {pct ? 'Shown as % of the way to random' : `Unit: ${metric.unit}`}; random ≈ {rnd}; {rule}. Average at the end:{' '}
        {fmtDisplay(metric, displayValue(metric, fin, avg, base))}.
      </div>
      {legend}
    </div>
  )
}
