import { useEffect, useRef } from 'react'
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

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A campfire on a black ridge just above the footer, and the dark ground below it that the footer stands on. It goes
 * inside the footer, behind its text. It moves at the large embers' speed, nearer than everything but the content, so
 * as the footer comes up the fire sinks into place. The fire throws sparks that rise into the embers above, and its
 * light falls on the ground around it.
 */
export default function Campfire() {
  const layer = useRef<HTMLDivElement>(null)
  const sparks = useRef<HTMLCanvasElement>(null)
  useEffect(() => startFooterParallax(layer.current!, layer.current!.parentElement!, SPEED.largeEmbers), [])
  useEffect(() => (reducedMotion() ? undefined : startSparks(sparks.current!, layer.current!)), [])

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
          <ellipse className="campfire-coals" cx="0" cy="2" rx="52" ry="9" filter="url(#campfire-blur)" />
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
      {/* After the fire, so the sparks fly in front of the flames. */}
      <canvas className="campfire-sparks" ref={sparks} />
    </div>
  )
}

/** sparks thrown a second */
const SPARK_RATE = 22
/** the canvas the sparks fly in, centred over the fire, px */
const SPARK_FIELD = { width: 900, height: 900 }

/**
 * Sparks thrown up from the fire. They rise fast and slow down, drift on the air, and cool from white-gold to red as
 * they climb, then go out. The canvas sits in the campfire's layer, so it moves with the fire, and runs only while it
 * is on screen.
 */
function startSparks(canvas: HTMLCanvasElement, layer: HTMLElement): () => void {
  const context = canvas.getContext('2d')!
  const scale = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = SPARK_FIELD.width * scale
  canvas.height = SPARK_FIELD.height * scale
  context.setTransform(scale, 0, 0, scale, 0, 0)
  const fire = layer.querySelector<SVGElement>('.campfire-fire')!

  // Where the flames are in the canvas: the canvas is placed so its bottom centre is at the fire's base.
  let flameWidth = 40
  let flameHeight = 100
  const place = () => {
    const layerBox = layer.getBoundingClientRect()
    const fireBox = fire.getBoundingClientRect()
    flameWidth = fireBox.width * 0.5
    flameHeight = fireBox.height
    canvas.style.left = `${(fireBox.left - layerBox.left + fireBox.width / 2 - SPARK_FIELD.width / 2).toFixed(0)}px`
    canvas.style.top = `${(fireBox.bottom - layerBox.top - SPARK_FIELD.height).toFixed(0)}px`
  }

  type Spark = { x: number; y: number; velocityX: number; velocityY: number; size: number; age: number; life: number; phase: number }
  let sparks: Spark[] = []
  const throwSpark = (): Spark => {
    const roll = Math.random()
    return {
      x: SPARK_FIELD.width / 2 + (Math.random() - 0.5) * flameWidth,
      y: SPARK_FIELD.height - flameHeight * (0.3 + Math.random() * 0.4),
      velocityX: (Math.random() - 0.5) * 1.2,
      velocityY: -(2 + Math.random() * 3),
      // mostly small sparks, some medium, a few large
      size: roll < 0.6 ? 0.7 + Math.random() * 0.7 : roll < 0.9 ? 1.4 + Math.random() * 0.9 : 2.6 + Math.random() * 1.2,
      age: 0,
      life: 90 + Math.random() * 150,
      phase: Math.random() * Math.PI * 2,
    }
  }

  let frame = 0
  let running = false
  let owed = 0
  let last = 0
  const draw = (time: number) => {
    const elapsed = last ? Math.min(100, time - last) : 16
    last = time
    owed += (SPARK_RATE * elapsed) / 1000
    const due = Math.floor(owed)
    owed -= due
    // Sparks that have burned out or flown off the top are gone.
    sparks = [...sparks.filter((spark) => spark.age < spark.life && spark.y > 0), ...Array.from({ length: due }, throwSpark)]

    context.clearRect(0, 0, SPARK_FIELD.width, SPARK_FIELD.height)
    context.globalCompositeOperation = 'lighter'
    sparks.forEach((spark) => {
      spark.age++
      // The heat's lift dies away, and the air pushes the spark from side to side.
      spark.velocityY *= 0.985
      spark.velocityX += Math.sin(time / 500 + spark.phase) * 0.03
      spark.x += spark.velocityX
      spark.y += spark.velocityY
      const cooled = spark.age / spark.life
      const light = (1 - cooled) * Math.min(1, spark.age / 8)
      const green = Math.round(230 - cooled * 160)
      const blue = Math.round(160 - cooled * 140)
      const reach = spark.size * 3.5
      const gradient = context.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, reach)
      gradient.addColorStop(0, `rgba(255, ${green}, ${blue}, ${light})`)
      gradient.addColorStop(0.3, `rgba(255, ${green - 60}, ${Math.max(0, blue - 60)}, ${light * 0.5})`)
      gradient.addColorStop(1, 'rgba(255, 90, 30, 0)')
      context.fillStyle = gradient
      context.fillRect(spark.x - reach, spark.y - reach, reach * 2, reach * 2)
    })
    frame = requestAnimationFrame(draw)
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true
      last = 0
      frame = requestAnimationFrame(draw)
    } else if (!entry.isIntersecting && running) {
      running = false
      cancelAnimationFrame(frame)
    }
  })
  observer.observe(canvas)
  const resize = new ResizeObserver(place)
  resize.observe(layer)
  place()
  return () => {
    observer.disconnect()
    resize.disconnect()
    cancelAnimationFrame(frame)
  }
}
