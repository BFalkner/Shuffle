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

const WIDTH = 440

export default function LineChart({ series, height = 190, xmin, xmax, ymin, ymax, hlines = [], ytop, ybot, xlabL, xlabR }: Props) {
  const plotHeight = height
  const x = (value: number) => ((value - xmin) / (xmax - xmin)) * (WIDTH - 46) + 38
  const y = (value: number) => plotHeight - 20 - ((value - ymin) / (ymax - ymin)) * (plotHeight - 34)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${plotHeight}`} fontFamily="DM Mono,monospace" fontSize="9">
      <line x1="38" y1={plotHeight - 20} x2={WIDTH - 8} y2={plotHeight - 20} stroke="#ccc3b4" strokeWidth="1" />
      <line x1="38" y1="14" x2="38" y2={plotHeight - 20} stroke="#ccc3b4" strokeWidth="1" />
      {hlines.map((line, index) => {
        const lineY = y(line.y).toFixed(1)
        return (
          <g key={index}>
            <line x1="38" y1={lineY} x2={WIDTH - 8} y2={lineY} stroke={line.color ?? '#7fae8f'} strokeWidth="1" strokeDasharray="4 3" />
            {line.label && (
              <text x={WIDTH - 9} y={(y(line.y) - 3).toFixed(1)} textAnchor="end" fill="#7fae8f">
                {line.label}
              </text>
            )}
          </g>
        )
      })}
      {series.map((curve) => (
        <path
          key={curve.key}
          d={curve.pts.map((point, index) => `${index ? 'L' : 'M'}${x(point[0]).toFixed(1)},${y(point[1]).toFixed(1)}`).join('')}
          fill="none"
          stroke={curve.color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      <text x="36" y="12" textAnchor="end" fill="#8a7f72">
        {ytop ?? ymax}
      </text>
      <text x="36" y={plotHeight - 22} textAnchor="end" fill="#8a7f72">
        {ybot ?? ymin}
      </text>
      <text x="40" y={plotHeight - 8} fill="#8a7f72">
        {xlabL}
      </text>
      <text x={WIDTH - 8} y={plotHeight - 8} textAnchor="end" fill="#8a7f72">
        {xlabR}
      </text>
    </svg>
  )
}
