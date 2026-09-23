import { useElementWidth } from '../../hooks/useElementWidth'
import { MOVES, MOVE_COLORS, OPS, type Config } from './opsCharts'

const H = 140
const PADL = 6
const PADR = 6
const PADT = 10
const PADB = 22

/** One property, each move repeated 0–10 times; drawn at its real width. */
export default function OpsChart({ cfg }: { cfg: Config }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(220)
  const W = width
  const baseY = H - PADB
  // Position: the pile is deterministic and far off-scale, so it's left off this chart.
  const moves = MOVES.filter((op) => !(cfg.key === 'chi' && op === 'pile'))

  const all = [cfg.target]
  moves.forEach((op) => OPS.series[op][cfg.key].forEach((v) => v !== null && all.push(v)))
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const tY = (v: number) => {
    if (cfg.log) {
      const l = Math.log10(Math.max(v, 1))
      const llo = Math.log10(Math.max(lo, 1))
      const lhi = Math.log10(Math.max(hi, 1))
      return PADT + (1 - (l - llo) / (lhi - llo || 1)) * (H - PADT - PADB)
    }
    return PADT + (1 - (v - lo) / (hi - lo || 1)) * (H - PADT - PADB)
  }
  const K = OPS.k
  const tX = (i: number) => PADL + (i / (K.length - 1)) * (W - PADL - PADR)
  const ty = tY(cfg.target).toFixed(1)

  return (
    <div className="opchart">
      <div className="ct">{cfg.title}</div>
      <div className="cdesc">{cfg.desc}</div>
      <div className="cs">{cfg.sub}</div>
      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`}>
          <line x1={PADL} y1={ty} x2={W - PADR} y2={ty} stroke="#b9ad99" strokeWidth="1" strokeDasharray="4 3" />
          {moves.map((op) => {
            const arr = OPS.series[op][cfg.key]
            const pts = arr.map((v, i) => (v === null ? null : ([tX(i), tY(v)] as const))).filter((p) => p !== null)
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
            const end = pts[pts.length - 1]
            return (
              <g key={op}>
                <path d={d} fill="none" stroke={MOVE_COLORS[op]} strokeWidth="2" strokeLinejoin="round" />
                <circle cx={end[0].toFixed(1)} cy={end[1].toFixed(1)} r="2.6" fill={MOVE_COLORS[op]} />
              </g>
            )
          })}
          <line x1={PADL} y1={baseY} x2={W - PADR} y2={baseY} stroke="#cdc3b2" strokeWidth="1" />
          {Array.from({ length: 11 }, (_, i) => {
            const x = (PADL + (i / 10) * (W - PADL - PADR)).toFixed(1)
            const major = i === 0 || i === 5 || i === 10
            return <line key={i} x1={x} y1={baseY} x2={x} y2={baseY + (major ? 5 : 3)} stroke="#b9ad99" strokeWidth="1" />
          })}
          {(
            [
              [0, 'start'],
              [5, 'middle'],
              [10, 'end'],
            ] as const
          ).map(([i, anchor]) => (
            <text key={i} x={(PADL + (i / 10) * (W - PADL - PADR)).toFixed(1)} y={baseY + 13} fontFamily="DM Mono,monospace" fontSize="8" fill="#b9ad99" textAnchor={anchor}>
              {i}
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
