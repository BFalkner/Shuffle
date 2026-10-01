// The embers' own thread. The page sends it the canvases, the fire's place and the scroll, and it simulates and draws
// every frame here, so the page's thread is left free to scroll and to run the parallax and the chevron smoothly.

import { drawEmber, REACH, type Look, type Sighting } from './draw'
import { placeAt, plume, solve, type Output, type Plume, type Span, type Target } from './plume'

/** Embers per screen by the fire and at the top of the page, and the fire's bursts and lift. */
const TARGET: Target = { atFire: 40, atTop: 6, bursts: 5, rise: 1 }
const LOOK: Look = { exposure: 3, flare: 0.6 }

/** Behind the page's content, or in front of it. */
export type Side = 'back' | 'front'

/** Where a canvas is on the screen, px. */
export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/**
 * The world the embers live in, as the page measures it. A point at (x, y) on the page and at scale `depth` shows on
 * the screen scaled about the screen's centre, so it scrolls `depth` px for each px the page does. The fire's own
 * point is set so it shows where the page draws it when scrolled to the bottom.
 */
export interface View {
  width: number
  height: number
  fireX: number
  fireY: number
}

/** What the page tells this thread. */
export type Message =
  | { type: 'fire'; depth: number; view: View; span: Span }
  | { type: 'out' }
  | { type: 'watch'; id: number; side: Side; canvas?: OffscreenCanvas }
  | { type: 'unwatch'; id: number }
  | { type: 'size'; id: number; width: number; height: number; scale: number }
  | { type: 'visible'; id: number; visible: boolean }
  | { type: 'scroll'; scroll: number; boxes: [number, Box][] }

interface Canvas {
  canvas: OffscreenCanvas
  context: OffscreenCanvasRenderingContext2D
  side: Side
  visible: boolean
  watched: boolean
  box: Box
}

/**
 * Every canvas the page has handed over, by id. A canvas can only be handed over once, so one that is no longer watched
 * is kept, in case it is watched again.
 */
const canvases = new Map<number, Canvas>()

let depth = 0
let view: View = { width: 0, height: 0, fireX: 0, fireY: 0 }
let scroll = 0
let output: Output | null = null
let span: Span | null = null
let stream: Plume | null = null

function setFire(next: Span) {
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
const toScreen = (x: number, y: number, depth: number) => [
  view.width / 2 + (x - view.width / 2) * depth,
  view.height / 2 + (y - scroll - view.height / 2) * depth,
]

/** The fire has been burning a while before the page opens, so the clock starts well past the longest life. */
const START = 1000
/** For each ember's speed on the screen: where it was this long ago, s. */
const STEP = 1 / 60

// Workers in some browsers have no requestAnimationFrame, so fall back to a timer at about the same rate.
const nextFrame: (run: (now: number) => void) => number =
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (run) => setTimeout(() => run(performance.now()), 16) as unknown as number
const stopFrame: (frame: number) => void = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout

let frame = 0
let frames = 0

function draw(now: number) {
  frame = nextFrame(draw)
  if (!stream) return
  const time = START + now / 1000
  const sightings: Sighting[] = []
  stream.alive(time, (ember, age, life) => {
    const place = placeAt(ember, age, time, depth)
    const [x, y] = toScreen(view.fireX + place.across, view.fireY - place.up, place.depth)
    if (y < -REACH || y > view.height + REACH || x < -REACH || x > view.width + REACH) return
    const before = placeAt(ember, Math.max(0, age - STEP), time - STEP, depth)
    const [bx, by] = toScreen(view.fireX + before.across, view.fireY - before.up, before.depth)
    sightings.push({ ember, age, life, depth: place.depth, x, y, vx: (x - bx) / STEP, vy: (y - by) / STEP })
  })
  // Farther ones first.
  sightings.sort((a, b) => a.depth - b.depth)
  for (const item of canvases.values()) {
    if (!item.watched || !item.visible) continue
    const { context, side, box } = item
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
  const wanted = stream !== null && [...canvases.values()].some((item) => item.watched && item.visible)
  if (wanted && !frame) frame = nextFrame(draw)
  else if (!wanted && frame) {
    stopFrame(frame)
    frame = 0
  }
}

onmessage = ({ data }: MessageEvent<Message>) => {
  switch (data.type) {
    case 'fire':
      depth = data.depth
      view = data.view
      setFire(data.span)
      break
    case 'out':
      span = output = stream = null
      break
    case 'watch': {
      const known = canvases.get(data.id)
      if (known) Object.assign(known, { side: data.side, watched: true })
      else if (data.canvas) {
        const context = data.canvas.getContext('2d')!
        canvases.set(data.id, { canvas: data.canvas, context, side: data.side, visible: false, watched: true, box: { left: 0, top: 0, width: 0, height: 0 } })
      }
      break
    }
    case 'unwatch': {
      const item = canvases.get(data.id)
      if (item) {
        // Shrinking it frees its pixels. If it is watched again, the page sends its size first.
        item.watched = false
        item.canvas.width = item.canvas.height = 0
      }
      break
    }
    case 'size': {
      const item = canvases.get(data.id)
      if (item) {
        item.canvas.width = Math.round(data.width * data.scale)
        item.canvas.height = Math.round(data.height * data.scale)
        item.context.setTransform(data.scale, 0, 0, data.scale, 0, 0)
      }
      break
    }
    case 'visible': {
      const item = canvases.get(data.id)
      if (item) item.visible = data.visible
      break
    }
    case 'scroll':
      scroll = data.scroll
      for (const [id, box] of data.boxes) {
        const item = canvases.get(id)
        if (item) item.box = box
      }
      break
  }
  update()
}
