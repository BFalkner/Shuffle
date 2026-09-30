import { Button } from 'react-aria-components'
import { Link } from 'react-router'
import RichText from '../../components/RichText'
import { metricByKey, type MetricKey } from '../../engine/metrics'
import { fmtLevel, level, noiseLevel } from '../../engine/scoring'
import { useElementWidth } from '../../hooks/useElementWidth'
import MetricChart from './MetricChart'
import { METRIC_TEXT } from './metricText'
import type { Series } from './types'

interface Props {
  metricKey: MetricKey
  /** the active method first, then the others on the charts */
  series: Series[]
  step: number | null
  onClose: () => void
}

/** One metric drawn large, with what it measures and where random decks read. */
export default function MetricDetail({ metricKey, series, step, onClose }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>(260)
  const metric = metricByKey(metricKey)
  const text = METRIC_TEXT[metric.key]
  const first = series[0]
  const final = level(metric, first.avg[metric.key][first.moveCount], first.base)

  return (
    <section className="detail" aria-label={metric.title}>
      <div className="detail-head">
        <h2>{metric.title}</h2>
        <span className="detail-value">{fmtLevel(final)}</span>
        <Button className="textbtn" onPress={onClose}>
          Close
        </Button>
      </div>
      <div ref={ref} className="chart-plot">
        <MetricChart metric={metric} series={series} width={width} big step={step} />
      </div>
      <p className="detail-text">
        <RichText text={text.desc} /> <Link to={text.writeup.to}>{text.writeup.label}</Link>. A random deck reads up to {fmtLevel(noiseLevel(metric, first.base))}, and a
        sorted deck that was never shuffled reads 1.
      </p>
      {series.length > 1 && (
        <ul className="legend">
          {series.map((entry) => (
            <li key={entry.id}>
              <i style={{ background: entry.color }} />
              {entry.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
