import { GROUPS, METRICS, type Metric, type MetricKey } from '../../engine/metrics'
import { displayValue, fmtDisplay, passWith } from '../../engine/scoring'
import { useElementWidth } from '../../hooks/useElementWidth'
import MetricChart from './MetricChart'
import type { Series } from './types'

interface Props {
  series: Series[]
  selected: MetricKey | null
  onSelect: (key: MetricKey | null) => void
  step: number | null
}

/** The twelve small charts, grouped; click one to see it large. */
export default function DiagnosticGrid({ series, selected, onSelect, step }: Props) {
  return (
    <div className="charts">
      {GROUPS.map(([group, label]) => {
        const groupMetrics = METRICS.filter((metric) => metric.group === group)
        if (!groupMetrics.length) return null
        return [
          <div key={group} className="cgrouph">
            {label}
          </div>,
          ...groupMetrics.map((metric) => (
            <ChartTile key={metric.key} metric={metric} series={series} step={step} selected={selected === metric.key} onClick={() => onSelect(selected === metric.key ? null : metric.key)} />
          )),
        ]
      })}
    </div>
  )
}

function ChartTile({ metric, series, step, selected, onClick }: { metric: Metric; series: Series[]; step: number | null; selected: boolean; onClick: () => void }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(120)
  const first = series[0]
  const fin = first.avg[metric.key][first.moveCount]
  const pass = passWith(metric, fin, first.base)
  return (
    <div className={`chart${selected ? ' sel' : ''}`} onClick={onClick}>
      <div className="ctitle">
        <span>{metric.title}</span>
        <span className={`cval ${pass ? 'pass' : 'fail'}`}>{fmtDisplay(metric, displayValue(metric, fin, first.avg, first.base))}</span>
      </div>
      <div ref={ref} className="chart-plot">
        <MetricChart metric={metric} series={series} width={width} step={step} />
      </div>
    </div>
  )
}
