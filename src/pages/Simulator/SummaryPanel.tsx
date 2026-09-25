import { Link } from 'react-router'
import RichText from '../../components/RichText'
import { AREAS, METRICS, metricByKey, type MetricKey } from '../../engine/metrics'
import { compositeScore, displayValue, fmt, fmtDisplay, metricProgress, passWith, worstMetric } from '../../engine/scoring'
import { useElementWidth } from '../../hooks/useElementWidth'
import MetricChart from './MetricChart'
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
    const failing = METRICS.filter((metric) => !passWith(metric, avg[metric.key][moveCount], base))
    const score = Math.round(compositeScore(avg, base) * 100)
    const worst = worstMetric(avg, base)
    // Judge by area: several failing tests in one area are one weakness.
    const areaFails = AREAS.map(([area, label]) => ({ label, tests: failing.filter((metric) => metric.area === area).map((metric) => metric.title) })).filter(
      (entry) => entry.tests.length,
    )
    const areasClear = AREAS.length - areaFails.length
    const catchAll = failing.some((metric) => metric.area === 'holistic')
    const verdict = areaFails.length
      ? `Still short on: ${areaFails.map((entry) => `${entry.label} (${entry.tests.join(', ')})`).join('; ')}.${catchAll ? ' Distinguishability also flags it.' : ''}`
      : catchAll
        ? 'Every area is clear, but distinguishability still tells these decks from random ones.'
        : 'This sequence randomizes the deck: every area reaches random.'
    return (
      <div className="bigchart">
        <div className="bctitle">
          <span>How random is the deck?</span>
        </div>
        <div className={`bcval ${failing.length === 0 ? 'pass' : 'fail'}`}>{score}% randomized</div>
        <div className="bcsub">
          {areasClear} / {AREAS.length} areas clear · limited by {worst.metric.title} ({Math.round(worst.progress * 100)}%). {verdict}
          {' '}Click any diagnostic below for detail, or compare methods further down.
        </div>
        {legend}
      </div>
    )
  }

  const metric = metricByKey(selected)
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
        <RichText text={metric.desc} /> <Link to={metric.writeup.to}>{metric.writeup.label}</Link>. {pct ? 'Shown as % of the way to random' : `Unit: ${metric.unit}`}; random ≈ {rnd}; {rule}. Average at the end:{' '}
        {fmtDisplay(metric, displayValue(metric, fin, avg, base))}.
      </div>
      {legend}
    </div>
  )
}
