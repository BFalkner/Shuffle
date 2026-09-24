import { useElementWidth } from '../../hooks/useElementWidth'
import { MOVES, MOVE_COLORS, OPS, type Config } from './opsCharts'

const HEIGHT = 140
const PADL = 6
const PADR = 6
const PADT = 10
const PADB = 22

/** One property, each move repeated 0–10 times; drawn at its real width. */
export default function OpsChart({ cfg }: { cfg: Config }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(220)
  const plotWidth = width
  const baseY = HEIGHT - PADB
  // Position: the pile is deterministic and far off-scale, so it's left off this chart.
  const moves = MOVES.filter((op) => !(cfg.key === 'chi' && op === 'pile'))

  const all = [cfg.target]
  moves.forEach((op) => OPS.series[op][cfg.key].forEach((value) => value !== null && all.push(value)))
  const low = Math.min(...all)
  const high = Math.max(...all)
  const toY = (value: number) => {
    if (cfg.log) {
      const logValue = Math.log10(Math.max(value, 1))
      const llo = Math.log10(Math.max(low, 1))
      const lhi = Math.log10(Math.max(high, 1))
      return PADT + (1 - (logValue - llo) / (lhi - llo || 1)) * (HEIGHT - PADT - PADB)
    }
    return PADT + (1 - (value - low) / (high - low || 1)) * (HEIGHT - PADT - PADB)
  }
  const steps = OPS.k
  const toX = (index: number) => PADL + (index / (steps.length - 1)) * (plotWidth - PADL - PADR)
  const targetY = toY(cfg.target).toFixed(1)

  return (
    <div className="opchart">
      <div className="ct">{cfg.title}</div>
      <div className="cdesc">{cfg.desc}</div>
      <div className="cs">{cfg.sub}</div>
      <div ref={ref}>
        <svg viewBox={`0 0 ${plotWidth} ${HEIGHT}`}>
          <line x1={PADL} y1={targetY} x2={plotWidth - PADR} y2={targetY} stroke="#b9ad99" strokeWidth="1" strokeDasharray="4 3" />
          {moves.map((op) => {
            const arr = OPS.series[op][cfg.key]
            const pts = arr.map((value, index) => (value === null ? null : ([toX(index), toY(value)] as const))).filter((point) => point !== null)
            const path = pts.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ')
            const end = pts[pts.length - 1]
            return (
              <g key={op}>
                <path d={path} fill="none" stroke={MOVE_COLORS[op]} strokeWidth="2" strokeLinejoin="round" />
                <circle cx={end[0].toFixed(1)} cy={end[1].toFixed(1)} r="2.6" fill={MOVE_COLORS[op]} />
              </g>
            )
          })}
          <line x1={PADL} y1={baseY} x2={plotWidth - PADR} y2={baseY} stroke="#cdc3b2" strokeWidth="1" />
          {Array.from({ length: 11 }, (_, index) => {
            const x = (PADL + (index / 10) * (plotWidth - PADL - PADR)).toFixed(1)
            const major = index === 0 || index === 5 || index === 10
            return <line key={index} x1={x} y1={baseY} x2={x} y2={baseY + (major ? 5 : 3)} stroke="#b9ad99" strokeWidth="1" />
          })}
          {(
            [
              [0, 'start'],
              [5, 'middle'],
              [10, 'end'],
            ] as const
          ).map(([index, anchor]) => (
            <text key={index} x={(PADL + (index / 10) * (plotWidth - PADL - PADR)).toFixed(1)} y={baseY + 13} fontFamily="DM Mono,monospace" fontSize="8" fill="#b9ad99" textAnchor={anchor}>
              {index}
            </text>
          ))}
        </svg>
      </div>
      <div className="oplg">
        <span>
          <i style={{ background: MOVE_COLORS.mash }} />
          Mash
        </span>
        <span>
          <i style={{ background: MOVE_COLORS.overhand }} />
          Overhand
        </span>
        {cfg.key === 'chi' ? (
          <span style={{ opacity: 0.7 }}>
            <i style={{ background: MOVE_COLORS.pile }} />
            Pile — deterministic, off-scale
          </span>
        ) : (
          <span>
            <i style={{ background: MOVE_COLORS.pile }} />
            Pile
          </span>
        )}
        <span>
          <i style={{ background: MOVE_COLORS.ohr }} />
          Half Overhand
        </span>
      </div>
    </div>
  )
}
