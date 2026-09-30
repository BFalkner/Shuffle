import { Link } from 'react-router'
import RichText from '../../components/RichText'
import { metricByKey, type MetricKey } from '../../engine/metrics'
import { categoryReadings, fmtLevel, level, noiseLevel, totalLevel } from '../../engine/scoring'
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

/** The sticky panel above the charts: how far from random each category ends, or the selected metric drawn large. */
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
    const readings = categoryReadings(avg, base, moveCount)
    const allClear = readings.every((reading) => reading.clear)
    const furthest = readings.reduce((worst, reading) => (reading.level > worst.level ? reading : worst))
    return (
      <div className="bigchart">
        <div className="bctitle">
          <span>How far from random is the deck?</span>
        </div>
        <div className={`bcval ${allClear ? 'pass' : 'fail'}`}>{fmtLevel(totalLevel(readings))} in total</div>
        <div className="bcsub">
          {readings.map((reading) => `${reading.title} ${fmtLevel(reading.level)}`).join(' · ')}.{' '}
          {allClear ? 'Every category is within the noise of a random deck.' : `Furthest from random: ${furthest.title}.`} In each category, 0 is a
          random deck and 1 is a sorted deck that was never shuffled. The total adds up the three. Click any chart below for detail, or compare
          methods further down.
        </div>
        {legend}
      </div>
    )
  }

  const metric = metricByKey(selected)
  const text = METRIC_TEXT[metric.key]
  const fin = level(metric, avg[metric.key][moveCount], base)

  return (
    <div className="bigchart">
      <div className="bctitle">
        <span>{metric.title}</span>
        <span className="bcval">{fmtLevel(fin)}</span>
      </div>
      <div ref={ref} className="chart-plot">
        <MetricChart metric={metric} series={series} width={width} big step={step} />
      </div>
      <div className="bcsub">
        <RichText text={text.desc} /> <Link to={text.writeup.to}>{text.writeup.label}</Link>. A random deck reads up to {fmtLevel(noiseLevel(metric, base))}, and a sorted deck that was never shuffled reads 1.
      </div>
      {legend}
    </div>
  )
}
