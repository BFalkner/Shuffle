import { Link } from 'react-router'
import RichText from '../../components/RichText'
import { METRICS, metricByKey, type MetricKey } from '../../engine/metrics'
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
          Overlay one or more methods from the list (pulse icon) to see their diagnostics here.
        </div>
      </div>
    )
  }

  const first = series[0]
  const { avg, base, L } = first
  const legend = series.length > 1 && (
    <div className="oplg">
      {series.map((e) => (
        <span key={e.id}>
          <i style={{ background: e.color }} />
          {e.name}
        </span>
      ))}
      <span className="oplg-clear" onClick={onClearComparison}>
        clear comparison
      </span>
    </div>
  )

  if (!selected) {
    const passes = METRICS.filter((m) => passWith(m, avg[m.k][L], base)).length
    const score = Math.round(compositeScore(avg, base) * 100)
    const worst = worstMetric(avg, base)
    const fails = METRICS.filter((m) => !passWith(m, avg[m.k][L], base)).map((m) => m.title)
    const verdict = fails.length
      ? `Still short on: ${fails.join(', ')}.`
      : 'This sequence randomizes the deck — every diagnostic reaches random.'
    return (
      <div className="bigchart">
        <div className="bctitle">
          <span>How random is the deck?</span>
        </div>
        <div className={`bcval ${passes === METRICS.length ? 'pass' : 'fail'}`}>{score}% randomized</div>
        <div className="bcsub">
          {passes} / {METRICS.length} diagnostics cleared · limited by {worst.m.title} ({Math.round(worst.p * 100)}%). {verdict}
          {' '}· click any diagnostic below, or compare methods at the bottom of this column.
        </div>
        {legend}
      </div>
    )
  }

  const m = metricByKey(selected)
  const b = base[m.k]
  const fin = avg[m.k][L]
  const pct = !m.raw
  const rnd = pct ? '100%' : fmt(b.mean, m.k)
  const thr = pct ? `${Math.round(displayValue(m, b.thr, avg, base))}%` : fmt(b.thr, m.k)
  const rule =
    m.side === 'band'
      ? `pass ${fmt(b.lo!, m.k)} – ${fmt(b.hi!, m.k)} (random ${fmt(b.mean, m.k)})`
      : m.side === 'two'
        ? `pass within ±${fmt(b.thr, m.k)} of random (${fmt(b.mean, m.k)})`
        : `pass ${m.side === 'high' ? '≥' : '≤'} ${thr}`

  return (
    <div className="bigchart">
      <div className="bctitle">
        <span>{m.title}</span>
        <span className="bcval">{Math.round(metricProgress(m, avg, base) * 100)}% randomized</span>
      </div>
      <div ref={ref} className="chart-plot">
        <MetricChart metric={m} series={series} width={width} big step={step} />
      </div>
      <div className="bcsub">
        <RichText text={m.desc} /> <Link to={m.writeup.to}>{m.writeup.label}</Link>. · {pct ? 'shown as % toward random' : `unit: ${m.unit}`}. random ≈ {rnd}, {rule}. Average at the end:{' '}
        {fmtDisplay(m, displayValue(m, fin, avg, base))}.
      </div>
      {legend}
    </div>
  )
}
