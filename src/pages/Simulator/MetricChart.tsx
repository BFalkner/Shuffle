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
export default function MetricChart({ metric: m, series, width, big = false, step }: Props) {
  const first = series[0]
  const maxL = Math.max(...series.map((e) => e.moveCount))
  const pct = !m.raw

  const W = Math.round(width)
  const H = big ? 130 : 46
  const PL = big ? 34 : 2
  const PR = big ? (pct ? 72 : 48) : 2
  const PT = big ? 10 : 4
  const PB = big ? 18 : 4
  const baseY = H - PB
  const plotR = W - PR

  const ref = pct ? 100 : first.base[m.key].mean
  const disp = (e: Series, i: number) => displayValue(m, e.avg[m.key][i], e.avg, e.base)

  // y range: all data plus the reference line, padded, never past the metric's physical limits
  const vals = [ref]
  series.forEach((e) => {
    for (let i = 0; i <= e.moveCount; i++) vals.push(disp(e, i))
  })
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (lo === hi) hi = lo + 1
  const b0 = first.base[m.key]
  const floor = m.raw ? minFloor(m) : 0
  const ceiling = m.raw ? Infinity : 100
  if (!m.raw) {
    // %: 0 is the pass edge; let data below it show
    lo = Math.min(lo, 0)
    hi = Math.max(hi, 100)
  } else if (Number.isFinite(b0.mean)) {
    // raw: pad to the band so noise stays flat, data can exceed it
    const S = marginScale(m, b0) || 1
    lo = Math.min(lo, b0.mean - S)
    hi = Math.max(hi, b0.mean + S)
  }
  const padY = (hi - lo) * 0.06
  lo = Math.max(floor, lo - padY)
  hi = Math.min(ceiling, hi + padY)

  const X = (i: number) => PL + (maxL ? i / maxL : 0) * (plotR - PL)
  const Y = (v: number) => PT + (1 - (v - lo) / (hi - lo || 1)) * (H - PT - PB)
  const refY = Y(ref).toFixed(1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <line x1={PL} y1={refY} x2={plotR} y2={refY} stroke="#1a6b3a" strokeDasharray="3 3" opacity={0.5} />
      {big && (
        <>
          <line x1={PL} y1={PT} x2={PL} y2={baseY} stroke="#cdc3b2" />
          <line x1={PL} y1={baseY} x2={plotR} y2={baseY} stroke="#cdc3b2" />
          <text className="bcaxis" x={PL - 3} y={PT + 3} textAnchor="end">
            {fmtDisplay(m, hi)}
          </text>
          <text className="bcaxis" x={PL - 3} y={baseY} textAnchor="end">
            {fmtDisplay(m, lo)}
          </text>
          <text className="bcaxis" x={PL} y={baseY + 12}>
            start
          </text>
          <text className="bcaxis" x={plotR} y={baseY + 12} textAnchor="end">
            moves
          </text>
          <text className="bcaxis" x={plotR + 2} y={(Y(ref) + 2).toFixed(1)} fill="#1a6b3a">
            random{pct ? ' 100%' : ''}
          </text>
        </>
      )}
      {series.map((e) => {
        let d = ''
        for (let i = 0; i <= e.moveCount; i++) d += `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(disp(e, i)).toFixed(1)} `
        return <path key={e.id} d={d} fill="none" stroke={e.color} strokeWidth={big ? 1.5 : 1.3} strokeLinejoin="round" opacity={0.85} />
      })}
      {step !== null &&
        series.map((e) => {
          const s = Math.min(step, e.moveCount)
          return (
            <circle
              key={e.id}
              cx={X(s).toFixed(1)}
              cy={Y(disp(e, s)).toFixed(1)}
              r={big ? 3.4 : 2.6}
              fill={e.color}
              stroke="#fff"
              strokeWidth={big ? 1.4 : 1}
            />
          )
        })}
    </svg>
  )
}
