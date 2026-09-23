// Simple multi-line chart used on the sticky-ends page. Drawn in a fixed
// 440-wide coordinate space and scaled proportionally (never stretched).

export interface ChartSeries {
  key: string
  color: string
  pts: [number, number][]
}

export interface HLine {
  y: number
  label?: string
  color?: string
}

interface Props {
  series: ChartSeries[]
  height?: number
  xmin: number
  xmax: number
  ymin: number
  ymax: number
  hlines?: HLine[]
  ytop?: string | number
  ybot?: string | number
  xlabL: string
  xlabR: string
}

const W = 440

export default function LineChart({ series, height = 190, xmin, xmax, ymin, ymax, hlines = [], ytop, ybot, xlabL, xlabR }: Props) {
  const H = height
  const x = (v: number) => ((v - xmin) / (xmax - xmin)) * (W - 46) + 38
  const y = (v: number) => H - 20 - ((v - ymin) / (ymax - ymin)) * (H - 34)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} fontFamily="DM Mono,monospace" fontSize="9">
      <line x1="38" y1={H - 20} x2={W - 8} y2={H - 20} stroke="#ccc3b4" strokeWidth="1" />
      <line x1="38" y1="14" x2="38" y2={H - 20} stroke="#ccc3b4" strokeWidth="1" />
      {hlines.map((hl, i) => {
        const yy = y(hl.y).toFixed(1)
        return (
          <g key={i}>
            <line x1="38" y1={yy} x2={W - 8} y2={yy} stroke={hl.color ?? '#7fae8f'} strokeWidth="1" strokeDasharray="4 3" />
            {hl.label && (
              <text x={W - 9} y={(y(hl.y) - 3).toFixed(1)} textAnchor="end" fill="#7fae8f">
                {hl.label}
              </text>
            )}
          </g>
        )
      })}
      {series.map((s) => (
        <path
          key={s.key}
          d={s.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')}
          fill="none"
          stroke={s.color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      <text x="36" y="12" textAnchor="end" fill="#8a7f72">
        {ytop ?? ymax}
      </text>
      <text x="36" y={H - 22} textAnchor="end" fill="#8a7f72">
        {ybot ?? ymin}
      </text>
      <text x="40" y={H - 8} fill="#8a7f72">
        {xlabL}
      </text>
      <text x={W - 8} y={H - 8} textAnchor="end" fill="#8a7f72">
        {xlabR}
      </text>
    </svg>
  )
}
