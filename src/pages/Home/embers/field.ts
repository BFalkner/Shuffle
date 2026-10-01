// The embers over the whole page. A fire registers itself with `kindle`, and canvases register with `watch`. One loop
// works out which embers are on the screen each frame, and each canvas draws the ones in its own part of the screen,
// in front of the page or behind it. Nothing off the screen is simulated.

import { drawEmber, REACH, type Look, type Sighting } from './draw'
import { placeAt, plume, solve, type Output, type Plume, type Span, type Target } from './plume'

/** Embers per screen by the fire and at the top of the page, and the fire's bursts and lift. */
const TARGET: Target = { atFire: 40, atTop: 6, bursts: 5, rise: 1 }
const LOOK: Look = { exposure: 3, flare: 0.6 }

/** A fire on the page, which throws the embers. */
export interface Fire {
  /** its scale: 1 is the page's own distance, smaller is farther away. It is also how fast it scrolls. */
  depth: number
  /** where its base is on the page, px from the page's top left, once the page is scrolled to the bottom */
  base: () => { x: number; y: number }
}

/** Behind the page's content, or in front of it. */
export type Side = 'back' | 'front'

interface Canvas {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  side: Side
  visible: boolean
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

let fire: Fire | null = null
const canvases = new Set<Canvas>()

/**
 * The world the embers live in. A point at (x, y) on the page and at scale `depth` shows on the screen scaled about
 * the screen's centre, so it scrolls `depth` px for each px the page does. The fire's own point is set so it shows
 * where the page draws it when scrolled to the bottom.
 */
let view = { width: 0, height: 0, fireX: 0, fireY: 0 }
let output: Output | null = null
let span: Span | null = null
let stream: Plume | null = null

function measure() {
  if (!fire) return
  const root = document.documentElement
  const width = root.clientWidth
  const height = root.clientHeight
  const bottom = Math.max(0, root.scrollHeight - height)
  const base = fire.base()
  const cx = width / 2
  const cy = height / 2
  const fireRow = base.y - bottom // on the screen, once scrolled to the bottom
  view = { width, height, fireX: cx + (base.x - cx) / fire.depth, fireY: cy + (fireRow - cy) / fire.depth + bottom }
  const next: Span = { screen: height / fire.depth, fireView: fireRow / fire.depth, top: view.fireY - (cy - cy / fire.depth) }
  // Solving again deals out new embers, so only do it when the page's shape really changes, not when a phone's
  // address bar comes and goes.
  const moved = (a: number, b: number) => Math.abs(a - b) > 0.04 * Math.max(Math.abs(a), Math.abs(b), 1)
  if (!span || moved(span.screen, next.screen) || moved(span.fireView, next.fireView) || moved(span.top, next.top)) {
    span = next
    output = solve(TARGET, span)
    stream = plume(output)
  }
}

/** Where a point in the world shows on the screen. */
const toScreen = (x: number, y: number, depth: number, scroll: number) => [
  view.width / 2 + (x - view.width / 2) * depth,
  view.height / 2 + (y - scroll - view.height / 2) * depth,
]

/** The fire has been burning a while before the page opens, so the clock starts well past the longest life. */
const START = 1000
/** For each ember's speed on the screen: where it was this long ago, s. */
const STEP = 1 / 60

let frame = 0
let frames = 0

function draw(now: number) {
  frame = requestAnimationFrame(draw)
  if (!fire || !stream) return
  const time = START + now / 1000
  const scroll = window.scrollY
  const depth = fire.depth
  const sightings: Sighting[] = []
  stream.alive(time, (ember, age, life) => {
    const place = placeAt(ember, age, time, depth)
    const [x, y] = toScreen(view.fireX + place.across, view.fireY - place.up, place.depth, scroll)
    if (y < -REACH || y > view.height + REACH || x < -REACH || x > view.width + REACH) return
    const before = placeAt(ember, Math.max(0, age - STEP), time - STEP, depth)
    const [bx, by] = toScreen(view.fireX + before.across, view.fireY - before.up, before.depth, scroll)
    sightings.push({ ember, age, life, depth: place.depth, x, y, vx: (x - bx) / STEP, vy: (y - by) / STEP })
  })
  // Farther ones first.
  sightings.sort((a, b) => a.depth - b.depth)
  for (const item of canvases) {
    if (!item.visible) continue
    const { canvas, context, side } = item
    const box = canvas.getBoundingClientRect()
    context.clearRect(0, 0, box.width, box.height)
    context.globalCompositeOperation = 'lighter'
    for (const sighting of sightings) {
      if (side === 'front' ? sighting.depth <= 1 : sighting.depth > 1) continue
      const x = sighting.x - box.left
      const y = sighting.y - box.top
      if (y < -REACH || y > box.height + REACH || x < -REACH || x > box.width + REACH) continue
      drawEmber(context, sighting, x, y, time, LOOK)
    }
  }
  if (++frames % 120 === 0) stream.forget(time)
}

/** Runs the loop while there is a fire and a canvas on the screen to draw it in. */
function update() {
  const wanted = fire !== null && [...canvases].some((item) => item.visible)
  if (wanted && !frame) {
    measure()
    frame = requestAnimationFrame(draw)
  } else if (!wanted && frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

let resize: ResizeObserver | null = null
const remeasure = () => measure()

/** Lights a fire: from now on the embers rise from it. Returns a function that puts it out. */
export function kindle(next: Fire): () => void {
  if (reducedMotion()) return () => {}
  fire = next
  span = null
  resize = new ResizeObserver(remeasure)
  resize.observe(document.documentElement)
  window.addEventListener('resize', remeasure)
  measure()
  update()
  return () => {
    if (fire !== next) return
    fire = null
    resize?.disconnect()
    window.removeEventListener('resize', remeasure)
    update()
  }
}

/** Draws the embers on `side` of the page that fall in `canvas`'s part of the screen. Returns a function that stops. */
export function watch(canvas: HTMLCanvasElement, side: Side): () => void {
  if (reducedMotion()) return () => {}
  const context = canvas.getContext('2d')!
  const item: Canvas = { canvas, context, side, visible: false }
  const fit = () => {
    const scale = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(canvas.clientWidth * scale)
    canvas.height = Math.round(canvas.clientHeight * scale)
    context.setTransform(scale, 0, 0, scale, 0, 0)
  }
  const sized = new ResizeObserver(fit)
  sized.observe(canvas)
  const seen = new IntersectionObserver(([entry]) => {
    item.visible = entry.isIntersecting
    update()
  })
  seen.observe(canvas)
  fit()
  canvases.add(item)
  return () => {
    sized.disconnect()
    seen.disconnect()
    canvases.delete(item)
    update()
  }
}
