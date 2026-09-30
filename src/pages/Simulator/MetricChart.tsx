import type { Metric } from '../../engine/metrics'
import { level } from '../../engine/scoring'
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

/** One metric's level over the course of each overlaid method, with random (level 0) dashed. */
export default function MetricChart({ metric, series, width, big = false, step }: Props) {
  const maxL = Math.max(...series.map((entry) => entry.moveCount))

  const plotWidth = Math.round(width)
  const plotHeight = big ? 130 : 46
  const padLeft = big ? 34 : 2
  const padRight = big ? 48 : 2
  const padTop = big ? 10 : 4
  const padBottom = big ? 18 : 4
  const baseY = plotHeight - padBottom
  const plotR = plotWidth - padRight

  const disp = (entry: Series, index: number) => level(metric, entry.avg[metric.key][index], entry.base)

  // y range: all data and the random line, padded, and at least 0 to 0.1 so noise near random stays flat
  const vals = [0, 0.1]
  series.forEach((entry) => {
    for (let index = 0; index <= entry.moveCount; index++) vals.push(disp(entry, index))
  })
  let low = Math.min(...vals)
  let high = Math.max(...vals)
  const padY = (high - low) * 0.06
  low -= padY
  high += padY

  const toX = (index: number) => padLeft + (maxL ? index / maxL : 0) * (plotR - padLeft)
  const toY = (value: number) => padTop + (1 - (value - low) / (high - low)) * (plotHeight - padTop - padBottom)
  const refY = toY(0).toFixed(1)

  return (
    <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`}>
      <line x1={padLeft} y1={refY} x2={plotR} y2={refY} stroke="#1a6b3a" strokeDasharray="3 3" opacity={0.5} />
      {big && (
        <>
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={baseY} stroke="#cdc3b2" />
          <line x1={padLeft} y1={baseY} x2={plotR} y2={baseY} stroke="#cdc3b2" />
          <text className="bcaxis" x={padLeft - 3} y={padTop + 3} textAnchor="end">
            {high.toFixed(2)}
          </text>
          <text className="bcaxis" x={padLeft - 3} y={baseY} textAnchor="end">
            {low.toFixed(2)}
          </text>
          <text className="bcaxis" x={padLeft} y={baseY + 12}>
            start
          </text>
          <text className="bcaxis" x={plotR} y={baseY + 12} textAnchor="end">
            moves
          </text>
          <text className="bcaxis" x={plotR + 2} y={(toY(0) + 2).toFixed(1)} fill="#1a6b3a">
            random
          </text>
        </>
      )}
      {/* The first series is the method being edited: drawn last, so it sits on top, and heavier than the rest. */}
      {series
        .map((entry, index) => ({ entry, emphasis: index === 0 }))
        .reverse()
        .map(({ entry, emphasis }) => {
          const path = Array.from({ length: entry.moveCount + 1 }, (_, index) => `${index ? 'L' : 'M'}${toX(index).toFixed(1)},${toY(disp(entry, index)).toFixed(1)}`).join(' ')
          const width = (big ? 1.5 : 1.3) * (emphasis ? 1.6 : 1)
          return <path key={entry.id} d={path} fill="none" stroke={entry.color} strokeWidth={width} strokeLinejoin="round" opacity={entry.stale ? 0.35 : emphasis ? 1 : 0.6} />
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
