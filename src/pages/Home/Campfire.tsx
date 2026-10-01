import { useEffect, useRef } from 'react'
import { kindle } from './embers/field'
import { SPEED, startFooterParallax } from './parallax'

const W = 1600
const H = 220
/** where the fire sits: on a low knoll, just above the footer */
const FIRE = { x: 1230, y: 210 }

/** A teardrop of flame standing on its base at 0,0, `height` tall and about twice `width` wide. */
const flame = (height: number, width: number) =>
  `M0,0 C${-width},-${height * 0.08} ${-width * 1.1},-${height * 0.45} ${-width * 0.35},-${height * 0.7} C${-width * 0.1},-${height * 0.82} 0,-${height * 0.92} 0,-${height} C${width * 0.3},-${height * 0.8} ${width * 1.15},-${height * 0.6} ${width},-${height * 0.3} C${width * 0.9},-${height * 0.1} ${width * 0.5},0 0,0 Z`

/** The tongues of flame, back to front: where each stands, how tall and wide it is, and its colour. */
const TONGUES = [
  { x: 0, height: 112, width: 30, className: 'outer' },
  { x: -24, height: 70, width: 18, className: 'side' },
  { x: 22, height: 82, width: 20, className: 'side' },
  { x: 2, height: 66, width: 17, className: 'middle' },
  { x: -2, height: 40, width: 10, className: 'inner' },
]

/**
 * A campfire on a black ridge just above the footer, and the dark ground below it that the footer stands on. It goes
 * inside the footer, behind its text. It is a little farther away than the content, so it scrolls a little slower, and
 * as the footer comes up the fire sinks into place. Its light falls on the ground around it, and it throws the embers
 * that rise up the whole page.
 */
export default function Campfire() {
  const layer = useRef<HTMLDivElement>(null)
  const coals = useRef<SVGEllipseElement>(null)
  useEffect(() => startFooterParallax(layer.current!, layer.current!.parentElement!, SPEED.campfire), [])
  // The fire's base is the middle of its coals. The parallax lifts the layer until the page reaches the bottom, so take
  // the lift back off to find where it rests.
  useEffect(
    () =>
      kindle({
        depth: SPEED.campfire,
        base: () => {
          const box = coals.current!.getBoundingClientRect()
          const lift = new DOMMatrixReadOnly(getComputedStyle(layer.current!).transform).m42
          return { x: box.left + box.width / 2 + window.scrollX, y: box.top + box.height / 2 - lift + window.scrollY }
        },
      }),
    [],
  )

  return (
    <div className="campfire" ref={layer} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMaxYMax slice">
        <defs>
          <radialGradient id="campfire-sky" cx={FIRE.x} cy={FIRE.y - 30} r="560" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffb35c" stopOpacity="0.55" />
            <stop offset="0.3" stopColor="#f07a2a" stopOpacity="0.2" />
            <stop offset="1" stopColor="#f07a2a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="campfire-ground">
            <stop offset="0" stopColor="#ff9a40" stopOpacity="0.6" />
            <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
          </radialGradient>
          <filter id="campfire-blur" x="-50%" y="-200%" width="200%" height="500%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {/* Wider and taller than the glow, so it fades out before any edge. The picture lets it spill past its own
            edges. */}
        <rect className="campfire-glow" x={FIRE.x - 600} y={FIRE.y - 660} width="1200" height={H - FIRE.y + 660} fill="url(#campfire-sky)" />
        <path className="campfire-ridge" d={`M0,196 Q300,184 600,190 T1000,176 Q1100,160 1170,151 Q${FIRE.x},144 1290,152 Q1380,164 1460,180 Q1530,190 ${W},186 L${W},${H} L0,${H} Z`} />
        <ellipse className="campfire-glow" cx={FIRE.x} cy={FIRE.y + 8} rx="320" ry="44" fill="url(#campfire-ground)" />
        <g className="campfire-fire" transform={`translate(${FIRE.x},${FIRE.y})`}>
          <ellipse className="campfire-coals" ref={coals} cx="0" cy="2" rx="52" ry="9" filter="url(#campfire-blur)" />
          <g className="campfire-logs">
            <rect x="-56" y="-9" width="112" height="16" rx="7" transform="rotate(-13)" />
            <rect x="-56" y="-9" width="112" height="16" rx="7" transform="rotate(15)" />
            <rect x="-40" y="-4" width="80" height="13" rx="6" />
          </g>
          {TONGUES.map((tongue, index) => (
            <path key={index} className={`campfire-flame ${tongue.className}`} transform={`translate(${tongue.x},-4)`} d={flame(tongue.height, tongue.width)} style={{ animationDelay: `${-index * 0.17}s` }} />
          ))}
        </g>
      </svg>
      <div className="campfire-foot" />
    </div>
  )
}
