import { GROUPS, METRICS, type Metric, type MetricKey } from '../../engine/metrics'
import { displayValue, fmtDisplay, passWith } from '../../engine/scoring'
import { useElementWidth } from '../../hooks/useElementWidth'
import MetricChart from './MetricChart'
import type { Series } from './types'

interface Props {
  series: Series[]
  selected: MetricKey | null
  onSelect: (k: MetricKey | null) => void
  step: number | null
}

/** The twelve small charts, grouped; click one to see it large. */
export default function DiagnosticGrid({ series, selected, onSelect, step }: Props) {
  return (
    <div className="charts">
      {GROUPS.map(([group, label]) => {
        const ms = METRICS.filter((m) => m.group === group)
        if (!ms.length) return null
        return [
          <div key={group} className="cgrouph">
            {label}
          </div>,
          ...ms.map((m) => (
            <ChartTile key={m.key} metric={m} series={series} step={step} selected={selected === m.key} onClick={() => onSelect(selected === m.key ? null : m.key)} />
          )),
        ]
      })}
    </div>
  )
}

function ChartTile({ metric: m, series, step, selected, onClick }: { metric: Metric; series: Series[]; step: number | null; selected: boolean; onClick: () => void }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(120)
  const first = series[0]
  const fin = first.avg[m.key][first.moveCount]
  const pass = passWith(m, fin, first.base)
  return (
    <div className={`chart${selected ? ' sel' : ''}`} onClick={onClick}>
      <div className="ctitle">
        <span>{m.title}</span>
        <span className={`cval ${pass ? 'pass' : 'fail'}`}>{fmtDisplay(m, displayValue(m, fin, first.avg, first.base))}</span>
      </div>
      <div ref={ref} className="chart-plot">
        <MetricChart metric={m} series={series} width={width} step={step} />
      </div>
    </div>
  )
}
