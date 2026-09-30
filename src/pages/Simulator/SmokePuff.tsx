import { useState, type CSSProperties } from 'react'

const WISPS = 10

/**
 * Textures for the wisps: fractal noise (SVG feTurbulence), with its alpha stretched so it breaks into clumps and thin
 * patches rather than an even haze. Overlapping wisps average each other out, so a puff reads smoother than one wisp. Used as a mask over each wisp's soft round gradient. Six are made once, from different seeds;
 * each wisp takes one at random, and its own turn and growth keep puffs from looking the same.
 */
const TEXTURES = Array.from({ length: 6 }, (_, seed) => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.045' numOctaves='3' seed='${seed * 17 + 3}'/>` +
    `<feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.2 -0.55'/></filter>` +
    `<rect width='64' height='64' filter='url(%23n)'/></svg>`
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`
})

interface Wisp {
  /** one of TEXTURES */
  texture: string
  /** where it sits at 0%, 30%, 65% and 100% of its life, in px from the drop point */
  path: [number, number][]
  /** its size at the start, and how many times bigger it ends */
  size: number
  growth: number
  /** how far it turns over its life, in degrees */
  turn: number
  duration: number
  delay: number
}

const between = (low: number, high: number) => low + Math.random() * (high - low)

/** How far from the drop point a wisp can start, in px. Starts are spread evenly over a disc this size. */
const START_RADIUS = 8

/**
 * One wisp of a puff, loosely modelled on real smoke. It starts somewhere in a small disc around the drop point, and the
 * burst throws it off in a direction of its own, not away from the centre, so wisps cross and the middle stays filled.
 * Drag slows it sharply, so most of its travel happens early. Warm smoke rises, so it drifts up more and more as it goes.
 * Small eddies push it sideways, so its path wobbles rather than running straight.
 */
function makeWisp(): Wisp {
  const angle = between(0, 2 * Math.PI)
  const reach = between(5, 15)
  const rise = between(-3, 18)
  // Sideways wobble, across the direction of travel.
  const wobble = () => between(-4.5, 4.5)
  const across = [-Math.sin(angle), Math.cos(angle)]
  // Travel and rise at each keyframe: the travel front-loaded (drag), the rise back-loaded (buoyancy).
  const outward = [0, 0.62, 0.88, 1]
  const lift = [0, 0.15, 0.5, 1]
  // Uniform over the disc's area: the square root keeps starts from bunching at the centre.
  const startAngle = between(0, 2 * Math.PI)
  const startDistance = START_RADIUS * Math.sqrt(Math.random())
  const start: [number, number] = [Math.cos(startAngle) * startDistance, Math.sin(startAngle) * startDistance]
  const path = outward.map((out, step): [number, number] => {
    const sway = step === 0 ? 0 : wobble()
    return [start[0] + Math.cos(angle) * reach * out + across[0] * sway, start[1] + Math.sin(angle) * reach * out + across[1] * sway - rise * lift[step]]
  })
  // The whole puff is over within 300ms: the latest start plus the longest life.
  return { path, texture: TEXTURES[Math.floor(Math.random() * TEXTURES.length)], size: between(8, 17), growth: between(1.6, 2.6), turn: between(-70, 70), duration: between(180, 260), delay: between(0, 40) }
}

/** A puff of smoke at (x, y) on the screen, where a move was dropped off the strip. Calls onDone once it has cleared. */
export default function SmokePuff({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  // A fresh, random set of wisps for each puff, so no two look alike.
  const [wisps] = useState(() => Array.from({ length: WISPS }, makeWisp))
  const last = wisps.reduce((latest, wisp, index) => (wisp.delay + wisp.duration > wisps[latest].delay + wisps[latest].duration ? index : latest), 0)

  return (
    <span className="smoke" style={{ left: x, top: y }} aria-hidden="true">
      {wisps.map((wisp, index) => {
        const style = {
          '--size': `${wisp.size}px`,
          maskImage: wisp.texture,
          WebkitMaskImage: wisp.texture,
          '--grow': wisp.growth,
          '--turn': `${wisp.turn}deg`,
          animationDuration: `${wisp.duration}ms`,
          animationDelay: `${wisp.delay}ms`,
          ...Object.fromEntries(wisp.path.flatMap(([px, py], step) => [[`--x${step}`, `${px.toFixed(1)}px`], [`--y${step}`, `${py.toFixed(1)}px`]])),
        } as CSSProperties
        return <span key={index} className="smoke-puff" style={style} onAnimationEnd={index === last ? onDone : undefined} />
      })}
    </span>
  )
}
