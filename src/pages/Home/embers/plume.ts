// The fire's output and the plume of hot air above it: when each ember is born, where it is at any moment, and how
// many the fire throws so that the right number reach each height.

import { LIFE_TAIL, emberProperties, type Ember } from './ember'
import { hash, noise } from './random'

/** How fast the hot air's lift fades, per second. */
const LIFT_FADE = 1.2
/** How wide the plume's cone spreads, sideways and in depth, per unit of height. */
const CONE = 0.1
/** The distance from the viewer to the page, px, which turns distance in the cone into scale. */
const VIEW_DISTANCE = 2000
/** Embers in a burst get ids from here up, so they never share one with the steady stream. */
const BURST_IDS = 1 << 28

/** Height above the fire after `t` seconds: thrown up fast, then settling to a slow drift as the lift fades. */
const heightAt = (ember: Ember, t: number) => ember.drift * t + ((ember.launch - ember.drift) / LIFT_FADE) * (1 - Math.exp(-LIFT_FADE * t))

/** Seconds to reach a height. */
function timeToHeight(ember: Ember, height: number): number {
  let lo = 0
  let hi = height / ember.drift + 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (heightAt(ember, mid) < height) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** The wind every ember shares: smooth and random, px a second. */
const windAt = (time: number) => 45 * noise(424242, time * 0.12)

/** Where an ember is, relative to the fire, in px at the fire's own scale. */
export interface Place {
  across: number
  up: number
  /** its scale: 1 is the page's own distance, smaller is farther away */
  depth: number
}

/** Where an ember is at an age and a moment, for a fire at `fireDepth`. */
export function placeAt(ember: Ember, age: number, time: number, fireDepth: number): Place {
  const h = heightAt(ember, age)
  const settle = Math.min(1, age / 0.6) // turbulence builds up after it leaves the fire
  const swirl = noise(ember.id, age * 0.9) + 0.5 * noise(ember.id + 1e6, age * 2.4)
  const across = ember.coneX * CONE * h + ember.push * settle * swirl + windAt(time) * Math.min(age, 4)
  const up = h + 0.5 * ember.push * settle * noise(ember.id + 2e6, age * 1.1)
  const toward = ember.coneZ * CONE * h
  const depth = (fireDepth * VIEW_DISTANCE) / (VIEW_DISTANCE + Math.max(toward, -0.6 * VIEW_DISTANCE))
  return { across, up, depth }
}

/** How much the fire throws and how long the embers live. */
export interface Output {
  /** embers a second in the steady stream */
  rate: number
  /** what every lifespan is multiplied by */
  lifeScale: number
  /** the longest any ember lives, s */
  maxLife: number
  /** bursts a minute, each of 5 to 12 embers, as when a log pops */
  bursts: number
  /** how hard the air throws them up */
  rise: number
}

/**
 * The embers the fire has thrown. Ember n is born at a fixed time near n / rate, and bursts come at fixed times too, so
 * the embers alive at any moment can be listed without keeping any state. It remembers the properties of the embers it
 * has met, and forgets them once they are out.
 */
export function plume(output: Output) {
  const steady = new Map<number, Ember>()
  const burst = new Map<number, Ember>()
  const ember = (cache: Map<number, Ember>, id: number, isBurst: boolean) => {
    let found = cache.get(id)
    if (!found) {
      found = emberProperties(id, output.rise, isBurst)
      cache.set(id, found)
    }
    return found
  }

  /** Calls `visit` for every ember alive at `time`, with its age and lifespan. */
  function alive(time: number, visit: (ember: Ember, age: number, life: number) => void) {
    const { rate, lifeScale, maxLife } = output
    const first = Math.max(0, Math.floor((time - maxLife) * rate))
    for (let n = first; n <= Math.floor(time * rate); n++) {
      const age = time - (n + hash(n, 99)) / rate
      if (age < 0) continue
      const e = ember(steady, n, false)
      const life = e.lifeBase * lifeScale
      if (age < life) visit(e, age, life)
    }
    // In each whole second, a chance of one burst.
    const chance = output.bursts / 60
    for (let second = Math.max(0, Math.floor(time - maxLife)); second <= Math.floor(time); second++) {
      if (hash(second, 7) >= chance) continue
      const age = time - (second + hash(second, 8))
      if (age < 0) continue
      const count = 5 + Math.floor(hash(second, 9) * 8)
      for (let m = 0; m < count; m++) {
        const id = BURST_IDS + second * 16 + m
        const e = ember(burst, id, true)
        const life = e.lifeBase * lifeScale
        if (age < life) visit(e, age, life)
      }
    }
  }

  /** Forgets embers that went out before `time`. */
  function forget(time: number) {
    const first = Math.floor((time - output.maxLife) * output.rate)
    for (const id of steady.keys()) if (id < first) steady.delete(id)
    const firstSecond = Math.floor(time - output.maxLife)
    for (const id of burst.keys()) if (id < BURST_IDS + firstSecond * 16) burst.delete(id)
  }

  return { alive, forget }
}

export type Plume = ReturnType<typeof plume>

/** What the fire should give: embers per screen by the fire and at the top of the page. */
export interface Target {
  atFire: number
  atTop: number
  bursts: number
  rise: number
}

/** The page's shape as the plume sees it, in px at the fire's scale. */
export interface Span {
  /** one screen's height */
  screen: number
  /** how far up the plume the screen showing the fire reaches */
  fireView: number
  /** how far up the plume the top of the page is */
  top: number
}

/**
 * Works out the fire's output and the lifespan scale that give `target`'s embers per screen by the fire and at the top
 * of the page, from sample embers. The ratio of the two grows with the lifespan scale, so it searches for the scale
 * that matches, then sets the rate to give the number by the fire.
 */
export function solve(target: Target, span: Span): Output {
  const samples = Array.from({ length: 1500 }, (_, i) => emberProperties(5e8 + i, target.rise, false))
  const edges = (from: number, to: number) => samples.map((e) => [timeToHeight(e, Math.max(0, from)), timeToHeight(e, Math.max(0, to))])
  const atFire = edges(0, span.fireView)
  const atTop = edges(span.top - span.screen, span.top)
  // the average seconds an ember spends in a band while alive, at a lifespan scale
  const dwell = (times: number[][], scale: number) =>
    times.reduce((sum, [a, b], i) => {
      const life = samples[i].lifeBase * scale
      return sum + Math.max(0, Math.min(b, life) - Math.min(a, life))
    }, 0) / samples.length
  const want = target.atTop / target.atFire
  const ratio = (scale: number) => dwell(atTop, scale) / (dwell(atFire, scale) || 1e-9)
  let lo = 0.2
  let hi = 400
  for (let i = 0; i < 50; i++) {
    const mid = Math.sqrt(lo * hi)
    if (ratio(mid) < want) lo = mid
    else hi = mid
  }
  const lifeScale = hi
  return {
    rate: target.atFire / Math.max(1e-6, dwell(atFire, lifeScale)),
    lifeScale,
    maxLife: LIFE_TAIL * 1.3 * lifeScale,
    bursts: target.bursts,
    rise: target.rise,
  }
}
