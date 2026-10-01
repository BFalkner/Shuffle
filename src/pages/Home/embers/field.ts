// The embers over the whole page. A fire registers itself with `kindle`, and canvases register with `watch`. The
// simulation and the drawing run in worker.ts, on their own thread, so they never hold up scrolling. This side only
// measures the page and tells the worker where the fire is, how big each canvas is and how far the page has scrolled.
// Each canvas covers the screen, fixed in place, so its own px are the screen's.

import type { Span } from './plume'
import type { Message, Side, View } from './worker'

export type { Side }

/** A fire on the page, which throws the embers. */
export interface Fire {
  /** its scale: 1 is the page's own distance, smaller is farther away. It is also how fast it scrolls. */
  depth: number
  /** where its base is on the page, px from the page's top left, once the page is scrolled to the bottom */
  base: () => { x: number; y: number }
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** The worker draws on canvases handed to it, which some older browsers can't do. They get no embers. */
const supported = () => typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function'

let worker: Worker | null = null
const send = (message: Message, transfer: Transferable[] = []) => {
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.postMessage(message, transfer)
}

let fire: Fire | null = null
/** A canvas can only be handed to the worker once, so each keeps its id for when it is watched again. */
const ids = new WeakMap<HTMLCanvasElement, number>()
let nextId = 0

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
  const view: View = { width, height, fireX: cx + (base.x - cx) / fire.depth, fireY: cy + (fireRow - cy) / fire.depth + bottom }
  const span: Span = { screen: height / fire.depth, fireView: fireRow / fire.depth, top: view.fireY - (cy - cy / fire.depth) }
  send({ type: 'fire', depth: fire.depth, view, span })
  place()
}

/** Tells the worker how far the page has scrolled. */
const place = () => send({ type: 'scroll', scroll: window.scrollY })

const remeasure = () => measure()
let resize: ResizeObserver | null = null

/** Lights a fire: from now on the embers rise from it. Returns a function that puts it out. */
export function kindle(next: Fire): () => void {
  if (reducedMotion() || !supported()) return () => {}
  fire = next
  resize = new ResizeObserver(remeasure)
  resize.observe(document.documentElement)
  window.addEventListener('resize', remeasure)
  window.addEventListener('scroll', place, { passive: true })
  measure()
  return () => {
    if (fire !== next) return
    fire = null
    resize?.disconnect()
    window.removeEventListener('resize', remeasure)
    window.removeEventListener('scroll', place)
    send({ type: 'out' })
  }
}

/** Draws the embers on `side` of the page in `canvas`, which covers the screen. Returns a function that stops. */
export function watch(canvas: HTMLCanvasElement, side: Side): () => void {
  if (reducedMotion() || !supported()) return () => {}
  let id = ids.get(canvas)
  if (id === undefined) {
    id = nextId++
    ids.set(canvas, id)
    const offscreen = canvas.transferControlToOffscreen()
    send({ type: 'watch', id, side, canvas: offscreen }, [offscreen])
  } else send({ type: 'watch', id, side })
  const fit = () => {
    const scale = Math.min(2, window.devicePixelRatio || 1)
    send({ type: 'size', id, width: canvas.clientWidth, height: canvas.clientHeight, scale })
  }
  const sized = new ResizeObserver(fit)
  sized.observe(canvas)
  return () => {
    sized.disconnect()
    send({ type: 'unwatch', id })
  }
}
