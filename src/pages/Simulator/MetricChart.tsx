import type { Metric } from '../../engine/metrics'
import { displayValue, fmtDisplay, marginScale, minFloor } from '../../engine/scoring'
import type { Series } from './types'

interface Props {
  metric: Metric
  series: Series[]
  /** drawing width in px (the chart is drawn 1:1, never stretched) */
  width: number
  big?: boolean
  /** step marked with a dot on each line, or null for none */
  step: number | null
}

/** One diagnostic over the course of each overlaid method, with the random baseline dashed. */
export default function MetricChart({ metric, series, width, big = false, step }: Props) {
  const first = series[0]
  const maxL = Math.max(...series.map((entry) => entry.moveCount))
  const pct = !metric.raw

  const plotWidth = Math.round(width)
  const plotHeight = big ? 130 : 46
  const padLeft = big ? 34 : 2
  const padRight = big ? (pct ? 72 : 48) : 2
  const padTop = big ? 10 : 4
  const padBottom = big ? 18 : 4
  const baseY = plotHeight - padBottom
  const plotR = plotWidth - padRight

  const ref = pct ? 100 : first.base[metric.key].mean
  const disp = (entry: Series, index: number) => displayValue(metric, entry.avg[metric.key][index], entry.avg, entry.base)

  // y range: all data plus the reference line, padded, never past the metric's physical limits
  const vals = [ref]
  series.forEach((entry) => {
    for (let index = 0; index <= entry.moveCount; index++) vals.push(disp(entry, index))
  })
  let low = Math.min(...vals)
  let high = Math.max(...vals)
  if (low === high) high = low + 1
  const firstBaseline = first.base[metric.key]
  const floor = metric.raw ? minFloor(metric) : 0
  const ceiling = metric.raw ? Infinity : 100
  if (!metric.raw) {
    // %: 0 is the pass edge; let data below it show
    low = Math.min(low, 0)
    high = Math.max(high, 100)
  } else if (Number.isFinite(firstBaseline.mean)) {
    // raw: pad to the band so noise stays flat, data can exceed it
    const scale = marginScale(metric, firstBaseline) || 1
    low = Math.min(low, firstBaseline.mean - scale)
    high = Math.max(high, firstBaseline.mean + scale)
  }
  const padY = (high - low) * 0.06
  low = Math.max(floor, low - padY)
  high = Math.min(ceiling, high + padY)

  const toX = (index: number) => padLeft + (maxL ? index / maxL : 0) * (plotR - padLeft)
  const toY = (value: number) => padTop + (1 - (value - low) / (high - low || 1)) * (plotHeight - padTop - padBottom)
  const refY = toY(ref).toFixed(1)

  return (
    <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`}>
      <line x1={padLeft} y1={refY} x2={plotR} y2={refY} stroke="#1a6b3a" strokeDasharray="3 3" opacity={0.5} />
      {big && (
        <>
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={baseY} stroke="#cdc3b2" />
          <line x1={padLeft} y1={baseY} x2={plotR} y2={baseY} stroke="#cdc3b2" />
          <text className="bcaxis" x={padLeft - 3} y={padTop + 3} textAnchor="end">
            {fmtDisplay(metric, high)}
          </text>
          <text className="bcaxis" x={padLeft - 3} y={baseY} textAnchor="end">
            {fmtDisplay(metric, low)}
          </text>
          <text className="bcaxis" x={padLeft} y={baseY + 12}>
            start
          </text>
          <text className="bcaxis" x={plotR} y={baseY + 12} textAnchor="end">
            moves
          </text>
          <text className="bcaxis" x={plotR + 2} y={(toY(ref) + 2).toFixed(1)} fill="#1a6b3a">
            random{pct ? ' 100%' : ''}
          </text>
        </>
      )}
      {series.map((entry) => {
        let path = ''
        for (let index = 0; index <= entry.moveCount; index++) path += `${index ? 'L' : 'M'}${toX(index).toFixed(1)},${toY(disp(entry, index)).toFixed(1)} `
        return <path key={entry.id} d={path} fill="none" stroke={entry.color} strokeWidth={big ? 1.5 : 1.3} strokeLinejoin="round" opacity={0.85} />
      })}
      {step !== null &&
        series.map((entry) => {
          const shownStep = Math.min(step, entry.moveCount)
          return (
            <circle
              key={entry.id}
              cx={toX(shownStep).toFixed(1)}
              cy={toY(disp(entry, shownStep)).toFixed(1)}
              r={big ? 3.4 : 2.6}
              fill={entry.color}
              stroke="#fff"
              strokeWidth={big ? 1.4 : 1}
            />
          )
        })}
    </svg>
  )
}
