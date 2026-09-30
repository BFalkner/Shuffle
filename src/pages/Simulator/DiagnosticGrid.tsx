import { Button } from 'react-aria-components'
import { METRICS, type Metric, type MetricKey } from '../../engine/metrics'
import { fmtLevel, level, withinNoise } from '../../engine/scoring'
import { useElementWidth } from '../../hooks/useElementWidth'
import MetricChart from './MetricChart'
import type { Series } from './types'

interface Props {
  /** the active method first, then the others on the charts */
  series: Series[]
  selected: MetricKey | null
  onSelect: (key: MetricKey | null) => void
  step: number | null
}

/** The small charts, one per metric in display order. Press one to see it large. */
export default function DiagnosticGrid({ series, selected, onSelect, step }: Props) {
  return (
    <div className="charts">
      {METRICS.map((metric) => (
        <ChartTile key={metric.key} metric={metric} series={series} step={step} selected={selected === metric.key} onPress={() => onSelect(selected === metric.key ? null : metric.key)} />
      ))}
    </div>
  )
}

function ChartTile({ metric, series, step, selected, onPress }: { metric: Metric; series: Series[]; step: number | null; selected: boolean; onPress: () => void }) {
  const [ref, width] = useElementWidth<HTMLSpanElement>(120)
  const first = series[0]
  const final = first.avg[metric.key][first.moveCount]
  return (
    <Button className={`chart${selected ? ' sel' : ''}`} aria-pressed={selected} onPress={onPress}>
      <span className="ctitle">
        <span>{metric.title}</span>
        <span className={`cval ${withinNoise(metric, final, first.base) ? 'pass' : 'fail'}`}>{fmtLevel(level(metric, final, first.base))}</span>
      </span>
      <span ref={ref} className="chart-plot">
        <MetricChart metric={metric} series={series} width={width} step={step} />
      </span>
    </Button>
  )
}
