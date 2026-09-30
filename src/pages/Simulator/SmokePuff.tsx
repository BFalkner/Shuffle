import type { CSSProperties } from 'react'

/** The puffs of smoke: where each drifts to from the centre (px), how big it starts, and how late it sets off (ms). */
const PUFFS = [
  { dx: 0, dy: -10, size: 46, delay: 0 },
  { dx: -34, dy: -20, size: 32, delay: 30 },
  { dx: 32, dy: -26, size: 36, delay: 20 },
  { dx: -14, dy: -46, size: 28, delay: 60 },
  { dx: 20, dy: 12, size: 26, delay: 40 },
  { dx: -36, dy: 14, size: 22, delay: 50 },
  { dx: 42, dy: 4, size: 20, delay: 70 },
]

/** The puff that sets off last, so it finishes last. */
const LAST = PUFFS.reduce((latest, puff, index) => (puff.delay > PUFFS[latest].delay ? index : latest), 0)

/** A little puff of smoke at (x, y) on the screen, where a move was dropped off the strip. Calls onDone once it has cleared. */
export default function SmokePuff({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  return (
    <span className="smoke" style={{ left: x, top: y }} aria-hidden="true">
      {PUFFS.map((puff, index) => (
        <span
          key={index}
          className="smoke-puff"
          style={{ '--dx': `${puff.dx}px`, '--dy': `${puff.dy}px`, '--size': `${puff.size}px`, animationDelay: `${puff.delay}ms` } as CSSProperties}
          onAnimationEnd={index === LAST ? onDone : undefined}
        />
      ))}
    </span>
  )
}
