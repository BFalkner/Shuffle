import { useEffect, useRef, type CSSProperties } from 'react'
import { kindle } from './embers/field'
import { SPEED, startFooterParallax } from './parallax'

const W = 1600
const H = 220
/** where the fire sits: on a low knoll, just above the footer */
const FIRE = { x: 1230, y: 210 }

/** A teardrop of flame standing on its base at 0,0, `height` tall and about twice `width` wide. */
const flame = (height: number, width: number) =>
  `M0,0 C${-width},-${height * 0.08} ${-width * 1.1},-${height * 0.45} ${-width * 0.35},-${height * 0.7} C${-width * 0.1},-${height * 0.82} 0,-${height * 0.92} 0,-${height} C${width * 0.3},-${height * 0.8} ${width * 1.15},-${height * 0.6} ${width},-${height * 0.3} C${width * 0.9},-${height * 0.1} ${width * 0.5},0 0,0 Z`

/**
 * The tongues of flame, back to front: where each stands, how tall and wide it is, its colour, and whether it is in
 * front of the embers.
 */
const TONGUES = [
  { x: 0, height: 112, width: 30, className: 'tongue-outer', front: false },
  { x: -24, height: 70, width: 18, className: 'tongue-side', front: false },
  { x: 22, height: 82, width: 20, className: 'tongue-side', front: false },
  { x: 2, height: 66, width: 17, className: 'tongue-middle', front: true },
  { x: -2, height: 40, width: 10, className: 'tongue-inner', front: true },
]

/** The tongues in front of the embers, or those behind them. */
function Flames({ front }: { front: boolean }) {
  // The tongues stand on the fire's base, 4 units above its middle. `--s` is the pictures' scale, px a unit: the
  // pictures cover the box and keep their bottom right corner, as `xMaxYMax slice` does.
  return (
    <div
      className="campfire-flames"
      style={
        {
          '--s': `max(var(--campfire-height) / ${H}, 100cqw / ${W})`,
          left: `calc(100% - ${W - FIRE.x} * var(--s))`,
          top: `calc(100% - ${H - FIRE.y + 4} * var(--s))`,
        } as CSSProperties
      }
    >
      {TONGUES.map(
        (tongue, index) =>
          tongue.front === front && (
            <svg
              key={index}
              className={`campfire-flame ${tongue.className}`}
              viewBox={`${-1.2 * tongue.width} ${-tongue.height} ${2.4 * tongue.width} ${tongue.height}`}
              style={{
                left: `calc(${tongue.x - 1.2 * tongue.width} * var(--s))`,
                width: `calc(${2.4 * tongue.width} * var(--s))`,
                height: `calc(${tongue.height} * var(--s))`,
                animationDelay: `${-index * 0.17}s`,
              }}
            >
              <path d={flame(tongue.height, tongue.width)} />
            </svg>
          ),
      )}
    </div>
  )
}

/**
 * A campfire on a black ridge just above the footer, and the dark ground below it that the footer stands on. It goes
 * inside the footer, behind its text. It is a little farther away than the content, so it scrolls a little slower, and
 * as the footer comes up the fire sinks into place. Its light falls on the ground around it, and it throws the embers
 * that rise up the whole page.
 *
 * The embers rise from the middle of the coals. The inner tongues and the log across the front are a second layer in
 * front of the embers, so the embers first show between the tongues instead of at one point.
 */
export default function Campfire() {
  const layer = useRef<HTMLDivElement>(null)
  const front = useRef<HTMLDivElement>(null)
  const coals = useRef<SVGEllipseElement>(null)
  useEffect(() => startFooterParallax(layer.current!, layer.current!.parentElement!, SPEED.campfire), [])
  useEffect(() => startFooterParallax(front.current!, front.current!.parentElement!, SPEED.campfire), [])
  // The fire's base is the middle of its coals. The parallax lifts the layer until the page reaches the bottom, so take
  // the lift back off to find where it rests.
  useEffect(
    () =>
      kindle({
        depth: SPEED.campfire,
        base: () => {
          const box = coals.current!.getBoundingClientRect()
          const lift = new DOMMatrixReadOnly(getComputedStyle(layer.current!).transform).m42
          return {
            x: box.left + box.width / 2 + window.scrollX,
            y: box.top + box.height / 2 - lift + window.scrollY,
          }
        },
      }),
    [],
  )

  // Each part is a picture of its own, all in the same units and stacked in the same box, so the parts that change can
  // change on the compositor without the rest being painted again: the light fades as a whole picture, and each tongue
  // of flame moves as a whole picture.
  const picture = { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMaxYMax slice' }
  return (
    <>
      <div className="campfire" ref={layer} aria-hidden="true">
        <div className="campfire-scene">
          {/* Wider and taller than the glow, so it fades out before any edge. The picture lets it spill past its own
            edges. */}
          <svg className="campfire-glow" {...picture}>
            <defs>
              <radialGradient id="campfire-sky" cx={FIRE.x} cy={FIRE.y - 30} r="560" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#ffb35c" stopOpacity="0.55" />
                <stop offset="0.3" stopColor="#f07a2a" stopOpacity="0.2" />
                <stop offset="1" stopColor="#f07a2a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x={FIRE.x - 600} y={FIRE.y - 660} width="1200" height={H - FIRE.y + 660} fill="url(#campfire-sky)" />
          </svg>
          {/* The ridge reaches a little below the picture, so it covers the edge of the glow behind it. */}
          <svg {...picture}>
            <path
              className="campfire-ridge"
              d={`M0,196 Q300,184 600,190 T1000,176 Q1100,160 1170,151 Q${FIRE.x},144 1290,152 Q1380,164 1460,180 Q1530,190 ${W},186 L${W},${H + 2} L0,${H + 2} Z`}
            />
          </svg>
          <svg className="campfire-glow" {...picture}>
            <defs>
              <radialGradient id="campfire-ground">
                <stop offset="0" stopColor="#ff9a40" stopOpacity="0.6" />
                <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx={FIRE.x} cy={FIRE.y + 8} rx="320" ry="44" fill="url(#campfire-ground)" />
          </svg>
          {/* The coals and the two crossed logs, behind the tongues. */}
          <svg {...picture}>
            <defs>
              <filter id="campfire-blur" x="-50%" y="-200%" width="200%" height="500%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <g transform={`translate(${FIRE.x},${FIRE.y})`}>
              <ellipse className="campfire-coals" ref={coals} cx="0" cy="2" rx="52" ry="9" filter="url(#campfire-blur)" />
              <g className="campfire-logs">
                <rect x="-56" y="-9" width="112" height="16" rx="7" transform="rotate(-13)" />
                <rect x="-56" y="-9" width="112" height="16" rx="7" transform="rotate(15)" />
              </g>
            </g>
          </svg>
          <Flames front={false} />
        </div>
        <div className="campfire-foot" />
      </div>
      <div className="campfire front" ref={front} aria-hidden="true">
        <div className="campfire-scene">
          <Flames front />
          {/* The log across the front, in front of everything. */}
          <svg {...picture}>
            <g className="campfire-logs" transform={`translate(${FIRE.x},${FIRE.y})`}>
              <rect x="-40" y="-4" width="80" height="13" rx="6" />
            </g>
          </svg>
        </div>
      </div>
    </>
  )
}
