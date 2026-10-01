// One ember: its own properties, and how it cools. Nothing here depends on where the ember is or how it is seen.

import { gaussian, stream } from './random'

/** The longest lifespan before scaling, as a multiple of the typical one. */
export const LIFE_TAIL = 30

export interface Ember {
  id: number
  /** radius, px, seen from the page's own distance */
  size: number
  /** how hot it starts, out of 1 */
  heat0: number
  /** lifespan before the fire scales it, s. Most are short, with a long tail of a few that last much longer. */
  lifeBase: number
  /** how fast the hot air throws it up, px a second */
  launch: number
  /** how fast it drifts up once the lift has faded, px a second */
  drift: number
  /** where in the plume's cone it travels, sideways and toward or away from the viewer, in cone widths */
  coneX: number
  coneZ: number
  /** how far turbulence moves it about, px */
  push: number
  /** two flicker rates and their phases */
  flick: [number, number, number, number]
}

/** Ember `id`'s properties, from a random stream seeded by the id. `rise` scales its speed; a burst throws it harder. */
export function emberProperties(id: number, rise: number, burst: boolean): Ember {
  const next = stream(id * 7919 + 13)
  const u = next()
  const size = 0.6 + 1.7 * u * u // mostly small
  const heavy = (size - 0.6) / 1.7
  const drift = (60 + 60 * next()) * rise * (1.1 - 0.3 * heavy)
  return {
    id,
    size,
    heat0: 0.78 + 0.22 * next(),
    // larger ones live longer
    lifeBase: Math.min(LIFE_TAIL, Math.exp(1.15 * gaussian(next))) * (0.7 + 0.6 * heavy),
    launch: (300 + 300 * next()) * (1.15 - 0.35 * heavy) * rise * (burst ? 1.3 : 1),
    drift,
    coneX: gaussian(next),
    coneZ: gaussian(next),
    push: 22 / Math.sqrt(size),
    flick: [6 + 8 * next(), 9 + 10 * next(), 6.3 * next(), 6.3 * next()],
  }
}

/**
 * How hot it is at an age, from 1 (yellow-white) to 0 (out). It cools slowly for most of its life, so a long-lived
 * ember still glows high above the fire, then fades quickly at the end.
 */
export function heatAt(ember: Ember, age: number, life: number): number {
  const lived = age / life
  return ember.heat0 * (1 - 0.35 * lived) * Math.pow(Math.max(0, 1 - Math.pow(lived, 4)), 0.7)
}

type Colour = [number, number, number]

/** Heat to colour, from deep red to yellow-white. */
const RAMP: [number, Colour][] = [
  [0, [90, 12, 6]],
  [0.25, [170, 40, 16]],
  [0.45, [232, 86, 26]],
  [0.65, [255, 146, 52]],
  [0.85, [255, 204, 122]],
  [1, [255, 240, 212]],
]

export function heatColour(heat: number): Colour {
  for (let i = 1; i < RAMP.length; i++) {
    if (heat <= RAMP[i][0]) {
      const [h0, c0] = RAMP[i - 1]
      const [h1, c1] = RAMP[i]
      const t = Math.max(0, (heat - h0) / (h1 - h0))
      return c0.map((c, k) => Math.round(c + (c1[k] - c) * t)) as Colour
    }
  }
  return RAMP[RAMP.length - 1][1]
}
