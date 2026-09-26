import { CATEGORIES, METRICS, metricsIn, type Metric, type MetricKey } from '../../engine/metrics'
import { fmtLevel, level, withinNoise } from '../../engine/scoring'
import { useElementWidth } from '../../hooks/useElementWidth'
import MetricChart from './MetricChart'
import type { Series } from './types'

interface Props {
  series: Series[]
  selected: MetricKey | null
  onSelect: (key: MetricKey | null) => void
  step: number | null
}

/** The small charts, grouped by category, with the catch-all last; click one to see it large. */
export default function DiagnosticGrid({ series, selected, onSelect, step }: Props) {
  const groups: [string, Metric[]][] = [
    ...CATEGORIES.map(({ key, title }): [string, Metric[]] => [title, metricsIn(key)]),
    ['Catch-all', METRICS.filter((metric) => metric.category === null)],
  ]
  return (
    <div className="charts">
      {groups.map(([title, metrics]) => [
        <div key={title} className="cgrouph">
          {title}
        </div>,
        ...metrics.map((metric) => (
          <ChartTile key={metric.key} metric={metric} series={series} step={step} selected={selected === metric.key} onClick={() => onSelect(selected === metric.key ? null : metric.key)} />
        )),
      ])}
    </div>
  )
}

function ChartTile({ metric, series, step, selected, onClick }: { metric: Metric; series: Series[]; step: number | null; selected: boolean; onClick: () => void }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(120)
  const first = series[0]
  const fin = first.avg[metric.key][first.moveCount]
  return (
    <div className={`chart${selected ? ' sel' : ''}`} onClick={onClick}>
      <div className="ctitle">
        <span>{metric.title}</span>
        <span className={`cval ${withinNoise(metric, fin, first.base) ? 'pass' : 'fail'}`}>{fmtLevel(level(metric, fin, first.base))}</span>
      </div>
      <div ref={ref} className="chart-plot">
        <MetricChart metric={metric} series={series} width={width} step={step} />
      </div>
    </div>
  )
}
