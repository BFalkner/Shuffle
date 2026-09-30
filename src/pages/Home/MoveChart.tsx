import { useState, type PointerEvent } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import { CHART_MOVES, REPEATS, SERIES, type Reading } from './moveCharts'

const HEIGHT = 150
const PAD_LEFT = 30
const PAD_RIGHT = 58
const PAD_TOP = 8
const PAD_BOTTOM = 24

/** One reading for each move repeated 0–10 times from a sorted deck, on a fixed 0–100% scale. */
export default function MoveChart({ reading, title, desc }: { reading: Reading; title: string; desc: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(260)
  const [hover, setHover] = useState<number | null>(null)
  const toX = (step: number) => PAD_LEFT + (step / REPEATS) * (width - PAD_LEFT - PAD_RIGHT)
  const toY = (percent: number) => PAD_TOP + (1 - percent / 100) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
  const baseY = toY(0)

  // Nudge end labels apart so lines that finish close together stay readable.
  const ends = CHART_MOVES.map(({ op, name }) => ({ op, name, y: toY(SERIES[op][reading][REPEATS]) })).sort((a, b) => a.y - b.y)
  for (let index = 1; index < ends.length; index++) ends[index].y = Math.max(ends[index].y, ends[index - 1].y + 11)

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const x = event.clientX - event.currentTarget.getBoundingClientRect().left
    const step = Math.round(((x - PAD_LEFT) / (width - PAD_LEFT - PAD_RIGHT)) * REPEATS)
    setHover(step >= 0 && step <= REPEATS ? step : null)
  }

  return (
    <div className="opchart">
      <div className="ct">{title}</div>
      <div className="cdesc">{desc}</div>
      <div ref={ref} className="opplot">
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={`${title}: percent left after each repeat`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {[0, 50, 100].map((percent) => (
            <g key={percent}>
              <line x1={PAD_LEFT} y1={toY(percent)} x2={width - PAD_RIGHT} y2={toY(percent)} stroke={percent ? '#e6dcc9' : '#cdc3b2'} strokeWidth="1" />
              <text x={PAD_LEFT - 5} y={toY(percent) + 3} textAnchor="end" className="axis">
                {percent}%
              </text>
            </g>
          ))}
          {[0, 5, 10].map((step) => (
            <text key={step} x={toX(step)} y={baseY + 14} textAnchor="middle" className="axis">
              {step}
            </text>
          ))}
          {hover !== null && <line x1={toX(hover)} y1={PAD_TOP} x2={toX(hover)} y2={baseY} stroke="#b9ad99" strokeWidth="1" strokeDasharray="3 3" />}
          {CHART_MOVES.map(({ op, color }) => {
            const values = SERIES[op][reading]
            const path = values.map((percent, step) => `${step ? 'L' : 'M'}${toX(step).toFixed(1)},${toY(percent).toFixed(1)}`).join(' ')
            const marked = hover ?? REPEATS
            return (
              <g key={op}>
                <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                <circle cx={toX(marked)} cy={toY(values[marked])} r="4" fill={color} stroke="#fffdf9" strokeWidth="2" />
              </g>
            )
          })}
          {ends.map(({ op, name, y }) => (
            <text key={op} x={width - PAD_RIGHT + 8} y={y + 3} className="endlabel">
              {name}
            </text>
          ))}
        </svg>
        {hover !== null && (
          <div className="optip" style={{ left: Math.min(toX(hover) + 8, width - 110) }}>
            <b>
              {hover} {hover === 1 ? 'repeat' : 'repeats'}
            </b>
            {CHART_MOVES.map(({ op, name, color }) => (
              <span key={op}>
                <i style={{ background: color }} />
                {name} {SERIES[op][reading][hover].toFixed(0)}%
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="opx">repeats of the move</div>
    </div>
  )
}

/** The numbers behind the charts, for anyone who can't see the lines. */
export function MoveTable({ readings }: { readings: { reading: Reading; title: string }[] }) {
  return (
    <details className="optable">
      <summary>Show the numbers</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">Move</th>
            <th scope="col">Reading</th>
            {Array.from({ length: REPEATS + 1 }, (_, step) => (
              <th key={step} scope="col">
                {step}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CHART_MOVES.flatMap(({ op, name }) =>
            readings.map(({ reading, title }) => (
              <tr key={op + reading}>
                <th scope="row">{name}</th>
                <td>{title}</td>
                {SERIES[op][reading].map((percent, step) => (
                  <td key={step}>{percent.toFixed(0)}%</td>
                ))}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </details>
  )
}
